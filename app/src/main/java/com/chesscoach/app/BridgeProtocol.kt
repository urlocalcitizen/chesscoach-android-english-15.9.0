package com.chesscoach.app

import org.json.JSONArray
import org.json.JSONObject
import java.nio.charset.StandardCharsets
import kotlin.math.abs

internal object BridgeProtocol {
    const val VERSION = 1
    const val SCOPE = "chesscoach.android"
    const val MAX_MESSAGE_BYTES = 4 * 1024 * 1024
    const val MAX_SMALL_MESSAGE_BYTES = 16 * 1024
    const val MAX_TOUCH_POINTS = 16
    const val MAX_TOUCH_DURATION_MS = 800

    private val idPattern = Regex("[A-Za-z0-9][A-Za-z0-9._:-]{0,63}")
    private val allowedRootKeys = setOf(
        "v", "id", "type", "payload", "scope", "source", "target", "channel"
    )
    private val forbiddenKeys = setOf("__proto__", "prototype", "constructor")

    data class Message(
        val id: String,
        val type: String,
        val payload: JSONObject,
        val envelope: JSONObject
    )

    data class TouchPoint(val x: Double, val y: Double)

    data class TouchViewport(
        val width: Double,
        val height: Double,
        val offsetLeft: Double,
        val offsetTop: Double
    )

    data class TouchGesture(
        val action: String,
        val points: List<TouchPoint>,
        val durationMs: Int,
        val viewport: TouchViewport,
        val documentToken: String
    )

    fun parse(raw: String, maxBytes: Int = MAX_MESSAGE_BYTES): Message {
        require(raw.toByteArray(StandardCharsets.UTF_8).size <= maxBytes) { "Message exceeds limit" }
        val envelope = JSONObject(raw)
        requireOnlyKeys(envelope, allowedRootKeys)
        val version = envelope.opt("v")
        require((version is Int || version is Long) && (version as Number).toLong() == VERSION.toLong()) {
            "Unsupported protocol version"
        }
        val id = envelope.opt("id") as? String ?: throw IllegalArgumentException("Message id must be a string")
        require(idPattern.matches(id)) { "Invalid message id" }
        val type = envelope.opt("type") as? String ?: throw IllegalArgumentException("Message type must be a string")
        require(TYPE_PATTERN.matches(type)) { "Invalid message type" }
        val payload = envelope.optJSONObject("payload") ?: throw IllegalArgumentException("Payload must be an object")
        if (envelope.has("scope")) require(envelope.opt("scope") == SCOPE) { "Invalid protocol scope" }
        validateValue(payload, 0, ValidationBudget())
        return Message(id, type, payload, envelope)
    }

    fun response(
        id: String,
        type: String,
        channel: String,
        payload: JSONObject,
        target: String = "REMOTE"
    ): String {
        require(idPattern.matches(id))
        validateValue(payload, 0, ValidationBudget())
        return JSONObject()
            .put("v", VERSION)
            .put("scope", SCOPE)
            .put("source", "native")
            .put("target", target)
            .put("channel", channel)
            .put("id", id)
            .put("type", type)
            .put("payload", payload)
            .toString()
    }

    fun error(id: String, code: String, message: String, target: String = "REMOTE"): String {
        val safeCode = code.take(64)
        val safeMessage = message.take(256)
        return response(
            id = id,
            type = "error",
            channel = "native",
            target = target,
            payload = JSONObject()
                .put("ok", false)
                .put("error", JSONObject().put("code", safeCode).put("message", safeMessage))
        )
    }

    fun requireOnlyKeys(value: JSONObject, allowed: Set<String>) {
        val keys = value.keys()
        while (keys.hasNext()) {
            require(keys.next() in allowed) { "Unexpected payload field" }
        }
    }

    fun validateRuntimePayload(payload: JSONObject) {
        requireOnlyKeys(payload, setOf("message", "sender"))
        val message = payload.optJSONObject("message")
            ?: throw IllegalArgumentException("Runtime message is required")
        val runtimeType = message.opt("type") as? String
            ?: throw IllegalArgumentException("Runtime message type must be a string")
        require(runtimeType in ALLOWED_RUNTIME_TYPES) { "Runtime message type is not allowed" }
        validateValue(message, 0, ValidationBudget())

        if (runtimeType.startsWith("ENGINE_")) validateEngineMessage(message, runtimeType)
    }

    fun validateTouchGesture(payload: JSONObject): TouchGesture {
        requireOnlyKeys(payload, setOf("action", "points", "durationMs", "viewport", "documentToken"))
        val action = payload.opt("action") as? String ?: throw IllegalArgumentException("Touch action is required")
        require(action == "tap" || action == "drag") { "Touch action must be tap or drag" }
        val documentToken = payload.opt("documentToken") as? String
            ?: throw IllegalArgumentException("Touch document token is required")
        require(idPattern.matches(documentToken)) { "Invalid touch document token" }
        val duration = payload.opt("durationMs")
        val minimumDuration = if (action == "tap") 40 else 80
        val maximumDuration = if (action == "tap") 200 else MAX_TOUCH_DURATION_MS
        require(integerInRange(duration, minimumDuration, maximumDuration)) { "Invalid touch duration" }
        val viewport = validateTouchViewport(
            payload.optJSONObject("viewport") ?: throw IllegalArgumentException("Touch viewport is required")
        )
        val array = payload.optJSONArray("points") ?: throw IllegalArgumentException("Touch points are required")
        require(if (action == "tap") array.length() == 1 else array.length() in 2..MAX_TOUCH_POINTS) {
            "Invalid number of touch points"
        }
        val points = (0 until array.length()).map { index ->
            val point = array.optJSONObject(index) ?: throw IllegalArgumentException("Touch point must be an object")
            requireOnlyKeys(point, setOf("x", "y"))
            TouchPoint(finiteNumber(point.opt("x")), finiteNumber(point.opt("y"))).also {
                requirePointInViewport(it, viewport)
            }
        }
        if (action == "drag") require(points.first() != points.last()) { "Drag endpoints must differ" }
        return TouchGesture(action, points, (duration as Number).toInt(), viewport, documentToken)
    }

    fun validateTouchViewport(value: JSONObject): TouchViewport {
        requireOnlyKeys(value, setOf("width", "height", "offsetLeft", "offsetTop"))
        val viewport = TouchViewport(
            finiteNumber(value.opt("width")),
            finiteNumber(value.opt("height")),
            finiteNumber(value.opt("offsetLeft")),
            finiteNumber(value.opt("offsetTop"))
        )
        require(viewport.width in 1.0..16384.0 && viewport.height in 1.0..16384.0) { "Invalid touch viewport size" }
        require(viewport.offsetLeft in 0.0..16384.0 && viewport.offsetTop in 0.0..16384.0) { "Invalid touch viewport offset" }
        return viewport
    }

    fun mapTouchPoints(
        gesture: TouchGesture,
        actualViewport: TouchViewport,
        viewWidth: Int,
        viewHeight: Int
    ): List<TouchPoint> {
        require(viewWidth > 0 && viewHeight > 0) { "WebView has no visible size" }
        val requested = gesture.viewport
        require(
            abs(requested.width - actualViewport.width) <= 2.0 &&
                abs(requested.height - actualViewport.height) <= 2.0 &&
                abs(requested.offsetLeft - actualViewport.offsetLeft) <= 2.0 &&
                abs(requested.offsetTop - actualViewport.offsetTop) <= 2.0
        ) { "Touch viewport changed" }
        // Keyboard overlays shorten the visual viewport, not the CSS-to-pixel scale.
        val scale = viewWidth / actualViewport.width
        return gesture.points.map { point ->
            requirePointInViewport(point, actualViewport)
            TouchPoint(
                (point.x - actualViewport.offsetLeft) * scale,
                (point.y - actualViewport.offsetTop) * scale
            ).also { mapped ->
                require(mapped.x >= 0 && mapped.x < viewWidth && mapped.y >= 0 && mapped.y < viewHeight) {
                    "Touch point projects outside the WebView"
                }
            }
        }
    }

    private fun requirePointInViewport(point: TouchPoint, viewport: TouchViewport) {
        require(
            point.x >= viewport.offsetLeft && point.x < viewport.offsetLeft + viewport.width &&
                point.y >= viewport.offsetTop && point.y < viewport.offsetTop + viewport.height
        ) { "Touch point is outside the visible viewport" }
    }

    private fun finiteNumber(value: Any?): Double {
        require(value is Number && value.toDouble().isFinite()) { "Touch values must be finite numbers" }
        return value.toDouble()
    }

    private fun validateEngineMessage(message: JSONObject, type: String) {
        if (type == "ENGINE_ANALYZE") {
            val fen = message.optString("fen", "")
            require(fen.isNotBlank() && fen.length <= 160 && !fen.contains('\n') && !fen.contains('\r')) {
                "Invalid engine FEN"
            }
            require(integerInRange(message.opt("movetimeMs"), 20, 10_000)) { "Invalid engine movetime" }
            require(integerInRange(message.opt("multiPv"), 1, 3)) { "Invalid engine MultiPV" }
            val moves = message.optJSONArray("uciMoves") ?: JSONArray()
            require(moves.length() <= 1024) { "Engine history exceeds limit" }
            for (index in 0 until moves.length()) {
                require(UCI_MOVE.matches(moves.getString(index))) { "Invalid engine history" }
            }
        }
        message.optString("requestId", "").takeIf(String::isNotEmpty)?.let {
            require(idPattern.matches(it)) { "Invalid engine request id" }
        }
    }

    private fun validateValue(value: Any?, depth: Int, budget: ValidationBudget) {
        require(depth <= MAX_DEPTH) { "Message nesting is too deep" }
        budget.nodes++
        require(budget.nodes <= MAX_NODES) { "Message is too complex" }
        when (value) {
            null, JSONObject.NULL, is Boolean, is Int, is Long -> Unit
            is Number -> require(value.toDouble().isFinite()) { "Non-finite number" }
            is String -> require(value.toByteArray(StandardCharsets.UTF_8).size <= MAX_STRING_BYTES) {
                "Message string exceeds limit"
            }
            is JSONObject -> {
                require(value.length() <= MAX_OBJECT_KEYS) { "Object has too many fields" }
                val keys = value.keys()
                while (keys.hasNext()) {
                    val key = keys.next()
                    require(key.length in 1..96 && key !in forbiddenKeys) { "Invalid object key" }
                    validateValue(value.get(key), depth + 1, budget)
                }
            }
            is JSONArray -> {
                require(value.length() <= MAX_ARRAY_ITEMS) { "Array has too many items" }
                for (index in 0 until value.length()) {
                    validateValue(value.get(index), depth + 1, budget)
                }
            }
            else -> throw IllegalArgumentException("Unsupported JSON value")
        }
    }

    private fun integerInRange(value: Any?, minimum: Int, maximum: Int): Boolean {
        if (value !is Number) return false
        val doubleValue = value.toDouble()
        if (!doubleValue.isFinite() || doubleValue % 1.0 != 0.0) return false
        return doubleValue >= minimum && doubleValue <= maximum
    }

    private class ValidationBudget(var nodes: Int = 0)

    private val TYPE_PATTERN = Regex("[a-z][a-z0-9]*(?:[._-][a-z0-9]+){0,5}")
    private val UCI_MOVE = Regex("[a-h][1-8][a-h][1-8][qrbn]?")
    private const val MAX_DEPTH = 12
    private const val MAX_NODES = 8192
    private const val MAX_OBJECT_KEYS = 4096
    private const val MAX_ARRAY_ITEMS = 1024
    private const val MAX_STRING_BYTES = 128 * 1024
    private val ALLOWED_RUNTIME_TYPES = setOf(
        "ENGINE_INIT",
        "ENGINE_ANALYZE",
        "ENGINE_CANCEL",
        "ENGINE_RELEASE",
        "ENGINE_STATUS",
        "ANALYZE_POSITION",
        "GET_BOARD_HEATMAP",
        "BUILD_PONDER_POSITION",
        "GET_INSTANT_PREMOVE",
        "RECORD_GAME_RESULT",
        "TRAIN_MOVE_MANUAL",
        "GET_MEMORY_STATS",
        "IMPORT_MEMORY",
        "CLEAR_MEMORY",
        "CHECK_PEER_BEACON"
    )
}
