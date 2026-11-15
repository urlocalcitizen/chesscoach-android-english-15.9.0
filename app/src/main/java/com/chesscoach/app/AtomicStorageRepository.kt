package com.chesscoach.app

import android.content.Context
import android.util.AtomicFile
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream
import java.nio.charset.StandardCharsets

internal class AtomicStorageRepository(context: Context) {
    private val lock = Any()
    private val atomicFile = AtomicFile(File(context.filesDir, STORAGE_FILE_NAME))
    private val legacyFiles = listOf(
        File(context.filesDir, "cc_storage_v15.json"),
        File(context.filesDir, "cc_storage.json")
    )

    init {
        synchronized(lock) {
            if (!atomicFile.baseFile.exists()) {
                migrateLegacyLocked()
            }
            if (!atomicFile.baseFile.exists()) {
                writeLocked(JSONObject())
            }
        }
    }

    fun snapshot(): JSONObject = synchronized(lock) {
        cloneObject(readLocked())
    }

    fun set(values: JSONObject): JSONObject = synchronized(lock) {
        validateTopLevel(values, MAX_MUTATION_KEYS)
        val current = readLocked()
        val names = values.keys()
        while (names.hasNext()) {
            val key = names.next()
            current.put(key, cloneJsonValue(values.get(key)))
        }
        validateTopLevel(current, MAX_KEYS)
        writeLocked(current)
        cloneObject(current)
    }

    fun remove(keys: List<String>): JSONObject = synchronized(lock) {
        require(keys.size <= MAX_MUTATION_KEYS) { "Too many storage keys" }
        keys.forEach(::validateKey)
        val current = readLocked()
        keys.forEach(current::remove)
        writeLocked(current)
        cloneObject(current)
    }

    fun clear(): JSONObject = synchronized(lock) {
        val empty = JSONObject()
        writeLocked(empty)
        empty
    }

    fun replace(values: JSONObject): JSONObject = synchronized(lock) {
        validateTopLevel(values, MAX_KEYS)
        val replacement = cloneObject(values)
        writeLocked(replacement)
        cloneObject(replacement)
    }

    private fun migrateLegacyLocked() {
        for (legacy in legacyFiles) {
            if (!legacy.isFile) continue
            val migrated = try {
                val bytes = legacy.inputStream().use { readBounded(it::read) }
                val parsed = JSONObject(String(bytes, StandardCharsets.UTF_8))
                validateTopLevel(parsed, MAX_KEYS)
                parsed
            } catch (_: Exception) {
                null
            }
            if (migrated != null) {
                writeLocked(migrated)
                legacy.delete()
                return
            }
        }
    }

    private fun readLocked(): JSONObject {
        if (!atomicFile.baseFile.exists()) return JSONObject()
        return try {
            val bytes = atomicFile.openRead().use { readBounded(it::read) }
            val parsed = JSONObject(String(bytes, StandardCharsets.UTF_8))
            validateTopLevel(parsed, MAX_KEYS)
            parsed
        } catch (_: Exception) {
            JSONObject()
        }
    }

    private fun readBounded(reader: (ByteArray, Int, Int) -> Int): ByteArray {
        val output = ByteArrayOutputStream()
        val buffer = ByteArray(8 * 1024)
        var total = 0
        while (true) {
            val read = reader(buffer, 0, buffer.size)
            if (read < 0) break
            total += read
            require(total <= MAX_STORAGE_BYTES) { "Storage exceeds limit" }
            output.write(buffer, 0, read)
        }
        return output.toByteArray()
    }

    private fun writeLocked(value: JSONObject) {
        validateTopLevel(value, MAX_KEYS)
        val bytes = value.toString().toByteArray(StandardCharsets.UTF_8)
        require(bytes.size <= MAX_STORAGE_BYTES) { "Storage exceeds limit" }

        var stream: FileOutputStream? = null
        try {
            stream = atomicFile.startWrite()
            stream.write(bytes)
            stream.fd.sync()
            atomicFile.finishWrite(stream)
        } catch (error: Exception) {
            stream?.let(atomicFile::failWrite)
            throw error
        }
    }

    private fun validateTopLevel(value: JSONObject, keyLimit: Int) {
        require(value.length() <= keyLimit) { "Too many storage keys" }
        val budget = ValidationBudget()
        val names = value.keys()
        while (names.hasNext()) {
            val key = names.next()
            validateKey(key)
            validateValue(value.get(key), 1, budget)
        }
        require(value.toString().toByteArray(StandardCharsets.UTF_8).size <= MAX_STORAGE_BYTES) {
            "Storage exceeds limit"
        }
    }

    private fun validateValue(value: Any?, depth: Int, budget: ValidationBudget) {
        require(depth <= MAX_DEPTH) { "Storage nesting is too deep" }
        budget.nodes++
        require(budget.nodes <= MAX_NODES) { "Storage value is too complex" }
        when (value) {
            null, JSONObject.NULL, is Boolean, is Int, is Long -> Unit
            is Number -> require(value.toDouble().isFinite()) { "Non-finite number" }
            is String -> require(value.toByteArray(StandardCharsets.UTF_8).size <= MAX_STRING_BYTES) {
                "Storage string exceeds limit"
            }
            is JSONObject -> {
                require(value.length() <= MAX_OBJECT_KEYS) { "Storage object has too many keys" }
                val names = value.keys()
                while (names.hasNext()) {
                    val key = names.next()
                    validateNestedKey(key)
                    validateValue(value.get(key), depth + 1, budget)
                }
            }
            is JSONArray -> {
                require(value.length() <= MAX_ARRAY_ITEMS) { "Storage array has too many items" }
                for (index in 0 until value.length()) {
                    validateValue(value.get(index), depth + 1, budget)
                }
            }
            else -> throw IllegalArgumentException("Unsupported storage value")
        }
    }

    private fun validateKey(key: String) {
        require(KEY_PATTERN.matches(key)) { "Invalid storage key" }
        require(key !in FORBIDDEN_KEYS) { "Forbidden storage key" }
    }

    private fun validateNestedKey(key: String) {
        require(key.length in 1..128 && key.none { it.isISOControl() }) { "Invalid nested storage key" }
        require(key !in FORBIDDEN_KEYS) { "Forbidden storage key" }
    }

    private fun cloneObject(value: JSONObject): JSONObject = JSONObject(value.toString())

    private fun cloneJsonValue(value: Any?): Any = when (value) {
        is JSONObject -> JSONObject(value.toString())
        is JSONArray -> JSONArray(value.toString())
        null -> JSONObject.NULL
        else -> value
    }

    private class ValidationBudget(var nodes: Int = 0)

    companion object {
        private const val STORAGE_FILE_NAME = "cc_storage_v1.json"
        const val MAX_STORAGE_BYTES = 256 * 1024
        const val MAX_KEYS = 256
        const val MAX_MUTATION_KEYS = 64
        private const val MAX_OBJECT_KEYS = 128
        private const val MAX_ARRAY_ITEMS = 256
        private const val MAX_STRING_BYTES = 32 * 1024
        private const val MAX_DEPTH = 8
        private const val MAX_NODES = 4096
        private val KEY_PATTERN = Regex("[A-Za-z0-9][A-Za-z0-9._:-]{0,95}")
        private val FORBIDDEN_KEYS = setOf("__proto__", "prototype", "constructor")
    }
}
