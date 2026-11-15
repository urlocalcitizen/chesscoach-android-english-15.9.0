package com.chesscoach.app

import android.annotation.SuppressLint
import android.app.ActivityManager
import android.content.Context
import android.os.Build
import android.os.PowerManager
import android.os.Process
import android.webkit.WebView
import androidx.webkit.WebViewFeature
import org.json.JSONArray
import org.json.JSONObject
import kotlin.math.max
import kotlin.math.min

internal class DeviceCapabilityProfiler(context: Context) {
    private val appContext = context.applicationContext

    fun fullProfile(): JSONObject {
        val activityManager = appContext.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val powerManager = appContext.getSystemService(Context.POWER_SERVICE) as PowerManager
        val memoryInfo = ActivityManager.MemoryInfo().also(activityManager::getMemoryInfo)
        val totalMiB = bytesToMiB(memoryInfo.totalMem)
        val availableMiB = bytesToMiB(memoryInfo.availMem)
        val cores = max(1, Runtime.getRuntime().availableProcessors())
        val thermalStatus = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            powerManager.currentThermalStatus
        } else {
            null
        }
        val powerSave = powerManager.isPowerSaveMode
        val backgroundRestricted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            activityManager.isBackgroundRestricted
        } else {
            false
        }
        val recommendation = recommendation(
            totalMiB = totalMiB,
            heapMiB = activityManager.memoryClass,
            lowRam = activityManager.isLowRamDevice,
            cores = cores,
            powerSave = powerSave,
            thermalStatus = thermalStatus,
            backgroundRestricted = backgroundRestricted
        )
        val webViewPackage = WebView.getCurrentWebViewPackage()

        return JSONObject()
            .put("schema", 1)
            .put("manufacturer", Build.MANUFACTURER.orEmpty())
            .put("model", Build.MODEL.orEmpty())
            .put(
                "memory",
                JSONObject()
                    .put("totalMiB", totalMiB)
                    .put("availableMiB", availableMiB)
                    .put("memoryClassMiB", activityManager.memoryClass)
                    .put("lowRam", activityManager.isLowRamDevice)
                    .put("lowMemory", memoryInfo.lowMemory)
            )
            .put(
                "cpu",
                JSONObject()
                    .put("logicalCores", cores)
                    .put("abis", JSONArray(Build.SUPPORTED_ABIS.toList()))
                    .put("process64Bit", Process.is64Bit())
            )
            .put(
                "power",
                JSONObject()
                    .put("saveMode", powerSave)
                    .put("thermalStatus", thermalStatus ?: JSONObject.NULL)
                    .put("backgroundRestricted", backgroundRestricted)
            )
            .put(
                "webView",
                JSONObject()
                    .put("package", webViewPackage?.packageName ?: "")
                    .put("version", webViewPackage?.versionName ?: "")
                    .put("major", webViewPackage?.versionName?.substringBefore('.')?.toIntOrNull() ?: 0)
                    .put(
                        "features",
                        JSONObject()
                            .put(
                                "webMessageListener",
                                WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)
                            )
                            .put(
                                "documentStartScript",
                                WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)
                            )
                            .put(
                                "safeBrowsing",
                                WebViewFeature.isFeatureSupported(WebViewFeature.SAFE_BROWSING_ENABLE)
                            )
                    )
            )
            .put("recommendation", recommendation)
    }

    fun coarseProfile(): JSONObject {
        val full = fullProfile()
        val memory = full.getJSONObject("memory")
        val cpu = full.getJSONObject("cpu")
        val power = full.getJSONObject("power")
        val webView = full.getJSONObject("webView")
        return JSONObject()
            .put("schema", 1)
            .put(
                "memory",
                JSONObject()
                    .put("totalBucketMiB", bucketMemory(memory.getLong("totalMiB")))
                    .put("memoryClassMiB", memory.getInt("memoryClassMiB"))
                    .put("lowRam", memory.getBoolean("lowRam"))
            )
            .put("cpu", JSONObject().put("logicalCores", cpu.getInt("logicalCores")))
            .put(
                "power",
                JSONObject()
                    .put("saveMode", power.getBoolean("saveMode"))
                    .put("thermalStatus", power.opt("thermalStatus"))
                    .put("backgroundRestricted", power.getBoolean("backgroundRestricted"))
            )
            .put(
                "webView",
                JSONObject()
                    .put("major", webView.getInt("major"))
                    .put("features", JSONObject(webView.getJSONObject("features").toString()))
            )
            .put("recommendation", JSONObject(full.getJSONObject("recommendation").toString()))
    }

    @SuppressLint("InlinedApi")
    private fun recommendation(
        totalMiB: Long,
        heapMiB: Int,
        lowRam: Boolean,
        cores: Int,
        powerSave: Boolean,
        thermalStatus: Int?,
        backgroundRestricted: Boolean
    ): JSONObject {
        val thermalSevere = thermalStatus != null && thermalStatus >= PowerManager.THERMAL_STATUS_SEVERE
        val thermalModerate = thermalStatus != null && thermalStatus >= PowerManager.THERMAL_STATUS_MODERATE
        val tier = when {
            lowRam || totalMiB < 3 * 1024 || heapMiB <= 192 || cores <= 2 || thermalSevere -> "LOW"
            powerSave || backgroundRestricted || thermalModerate || totalMiB < 6 * 1024 || heapMiB < 384 || cores < 6 -> "BALANCED"
            else -> "HIGH"
        }
        val constrained = powerSave || backgroundRestricted || thermalModerate
        val requestedHash = if (tier == "LOW" || constrained) 16 else 32
        val heapCap = max(16, heapMiB / 8)
        val hashMiB = listOf(32, 16).firstOrNull { it <= min(requestedHash, heapCap) } ?: 16
        val movetimeScale = when (tier) {
            "HIGH" -> 1.0
            "BALANCED" -> if (constrained) 0.65 else 0.8
            else -> 0.65
        }
        val maxMovetimeMs = when {
            tier == "LOW" || constrained -> 180
            tier == "BALANCED" -> 260
            else -> 400
        }
        return JSONObject()
            .put("tier", tier)
            .put("threads", 1)
            .put("hashMiB", hashMiB)
            .put("movetimeScale", movetimeScale)
            .put("maxMovetimeMs", maxMovetimeMs)
            .put("animations", false)
            .put("visualEffects", false)
    }

    private fun bucketMemory(valueMiB: Long): Long {
        val buckets = longArrayOf(1024, 2048, 3072, 4096, 6144, 8192, 12288, 16384)
        return buckets.lastOrNull { valueMiB >= it } ?: 1024
    }

    private fun bytesToMiB(bytes: Long): Long = bytes / (1024L * 1024L)
}
