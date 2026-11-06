package pl.marwlo.e4kmapadapter

import android.app.Activity
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Bundle
import android.view.ViewGroup
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

class MainActivity : AppCompatActivity() {
    private val executor = Executors.newSingleThreadExecutor()
    private val recognizer by lazy { TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS) }
    private lateinit var region: Spinner
    private lateinit var xField: EditText
    private lateinit var yField: EditText
    private lateinit var typeField: EditText
    private lateinit var nameField: EditText
    private lateinit var levelField: EditText
    private lateinit var apiField: EditText
    private lateinit var tokenField: EditText
    private lateinit var status: TextView
    private var screenshotBitmap: Bitmap? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        buildUi()
        if (intent?.action == android.content.Intent.ACTION_SEND) {
            val uri = intent.getParcelableExtra<Uri>(android.content.Intent.EXTRA_STREAM)
            if (uri != null) readSharedImage(uri)
        }
    }

    private fun buildUi() {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(32, 28, 32, 24)
            layoutParams = ViewGroup.LayoutParams(-1, -1)
        }
        fun label(text: String) { root.addView(TextView(this).apply { this.text = text; textSize = 14f; setPadding(0, 12, 0, 4) }) }
        fun field(hint: String, value: String = "") = EditText(this).apply {
            this.hint = hint; setSingleLine(true); setText(value)
            root.addView(this, LinearLayout.LayoutParams(-1, ViewGroup.LayoutParams.WRAP_CONTENT))
        }
        root.addView(TextView(this).apply { text = "E4K Map Adapter"; textSize = 24f })
        root.addView(TextView(this).apply { text = "Udostępnij zrzut ekranu z gry. OCR działa lokalnie; przed importem sprawdź każde pole."; textSize = 14f })
        label("Kraina")
        region = Spinner(this)
        region.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, listOf("Lodowe Rubieże", "Płonące Piaski", "Ogniste Szczyty"))
        root.addView(region)
        label("Współrzędne i obiekt")
        xField = field("X")
        yField = field("Y")
        typeField = field("Typ NPC, np. Barbarzyńska wieża")
        nameField = field("Nazwa (opcjonalnie)")
        levelField = field("Poziom (opcjonalnie)")
        label("Game Center API")
        apiField = field("Adres API, np. https://twoj-serwer.onrender.com")
        tokenField = field("BOT_API_TOKEN (tylko na tę sesję)")
        tokenField.inputType = android.text.InputType.TYPE_CLASS_TEXT or android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD
        val importButton = Button(this).apply { text = "Potwierdzam i importuję rekord" }
        root.addView(importButton)
        status = TextView(this).apply { text = "Oczekuję na udostępniony zrzut ekranu."; textSize = 14f; setPadding(0, 16, 0, 0) }
        root.addView(status)
        setContentView(ScrollView(this).apply { addView(root) })
        importButton.setOnClickListener { submitConfirmedRecord() }
    }

    private fun readSharedImage(uri: Uri) {
        status.text = "Odczytuję obraz lokalnie…"
        try {
            contentResolver.openInputStream(uri).use { stream ->
                screenshotBitmap = BitmapFactory.decodeStream(stream)
            }
            val bitmap = screenshotBitmap ?: throw IllegalArgumentException("Nie można odczytać obrazu.")
            recognizer.process(InputImage.fromBitmap(bitmap, 0))
                .addOnSuccessListener { result ->
                    val text = result.text
                    Regex("""X\s*[:：]?\s*(\d+)\s*[/,; ]+\s*Y\s*[:：]?\s*(\d+)""", RegexOption.IGNORE_CASE)
                        .find(text)?.let { xField.setText(it.groupValues[1]); yField.setText(it.groupValues[2]) }
                    Regex("""(?:Poziom|Level)\s*[:：]?\s*(\d+)""", RegexOption.IGNORE_CASE)
                        .find(text)?.let { levelField.setText(it.groupValues[1]) }
                    val npc = listOf("Barbarzyńska wieża", "Wieża nomadów", "Wieża samurajów", "Barbarzyńska forteca")
                        .firstOrNull { text.contains(it, ignoreCase = true) }
                    if (npc != null) typeField.setText(npc)
                    status.text = "OCR zakończony. Sprawdź i popraw pola — nic nie zostało wysłane."
                }
                .addOnFailureListener { status.text = "OCR nie powiódł się: ${it.localizedMessage}" }
        } catch (e: Exception) { status.text = "Błąd obrazu: ${e.localizedMessage}" }
    }

    private fun submitConfirmedRecord() {
        val x = xField.text.toString().toIntOrNull()
        val y = yField.text.toString().toIntOrNull()
        val level = levelField.text.toString().toIntOrNull()
        val npcType = typeField.text.toString().trim()
        val base = apiField.text.toString().trim().trimEnd('/')
        val token = tokenField.text.toString().trim()
        if (x == null || y == null || npcType.isBlank() || base.isBlank() || token.isBlank()) {
            status.text = "Uzupełnij poprawne X, Y, typ NPC, adres API i token."
            return
        }
        if (!base.startsWith("https://")) { status.text = "API musi używać HTTPS."; return }
        val regions = listOf("glacier", "sands", "fire_peaks")
        val body = JSONObject().apply {
            put("region", regions[region.selectedItemPosition])
            put("source", "android-user-confirmed-screenshot-ocr")
            put("npcs", JSONArray().put(JSONObject().apply {
                put("x", x); put("y", y); put("npcType", npcType)
                put("name", nameField.text.toString().trim())
                if (level != null) put("level", level)
            }))
        }
        status.text = "Wysyłam zatwierdzony rekord…"
        executor.execute {
            var connection: HttpURLConnection? = null
            try {
                connection = (URL("$base/api/map/npcs/import").openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"; connectTimeout = 15000; readTimeout = 15000
                    doOutput = true
                    setRequestProperty("Authorization", "Bearer $token")
                    setRequestProperty("Content-Type", "application/json; charset=utf-8")
                    setRequestProperty("Accept", "application/json")
                }
                connection.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
                val code = connection.responseCode
                val response = (if (code in 200..299) connection.inputStream else connection.errorStream)
                    ?.bufferedReader()?.use { it.readText() } ?: ""
                runOnUiThread {
                    status.text = if (code in 200..299) "Import zakończony: $response"
                    else "API odrzuciło import (HTTP $code): $response"
                    tokenField.text.clear()
                }
            } catch (e: Exception) {
                runOnUiThread { status.text = "Nie udało się połączyć: ${e.localizedMessage}" }
            } finally { connection?.disconnect() }
        }
    }

    override fun onDestroy() {
        recognizer.close()
        executor.shutdown()
        super.onDestroy()
    }
}
