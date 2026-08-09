package com.jarvis.app

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // Pedir permiso de micrófono (necesario para reconocimiento de voz)
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
            != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(Manifest.permission.RECORD_AUDIO),
                100
            )
        }

        webView = findViewById(R.id.webView)
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.allowFileAccess = true
        webView.settings.mediaPlaybackRequiresUserGesture = false

        // 🔥 PUNTO CLAVE: exponer un puente Java/Kotlin a JavaScript
        // para que Jarvis pueda guardar datos entre distintos dominios.
        webView.addJavascriptInterface(AndroidStorageBridge(), "AndroidJarvisStorage")

        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: android.webkit.PermissionRequest) {
                request.grant(request.resources)
            }
        }

        // Inyectar el script de Jarvis CADA VEZ que se termina de cargar una página
        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                inyectarJarvis()
            }

            // Para que "abrir en nueva pestaña" no abra el navegador externo
            override fun shouldOverrideUrlLoading(view: WebView?, request: android.webkit.WebResourceRequest?): Boolean {
                view?.loadUrl(request?.url.toString())
                return true
            }
        }

        // Página de inicio (puedes cambiarla a google.com, youtube.com, o la que quieras)
        webView.loadUrl("https://www.google.com")
    }

    private fun inyectarJarvis() {
        // Este es el script completo de Jarvis con una MINÚSCULA MODIFICACIÓN:
        // Ahora usa el puente "AndroidJarvisStorage" para guardar ajustes y búsquedas pendientes
        // entre dominios (Google -> Youtube -> Netflix, etc.).
        val script = """
            (function() {
                // =========================================================
                //  🚀  JARVIS - VERSIÓN PARA APK (con puente nativo Android)
                //  TODAS las funciones originales se conservan intactas.
                //  Solo se añade la comprobación del puente para guardar datos.
                // =========================================================

                // --- PARCHES para el puente nativo ---
                // Reemplazamos las funciones guardarValor/leerValor para que usen
                // el bridge de Android si está disponible.
                const originalGuardar = window.guardarValor;
                const originalLeer = window.leerValor;

                // Definimos las funciones de nuevo, pero con el bridge primero.
                window.guardarValor = function(clave, valor) {
                    try {
                        // INTENTAR CON EL PUENTE ANDROID (compartido entre dominios)
                        if (window.AndroidJarvisStorage && window.AndroidJarvisStorage.setItem) {
                            window.AndroidJarvisStorage.setItem(clave, valor);
                            return;
                        }
                    } catch(e) {}
                    try {
                        if (typeof GM_setValue === 'function') { GM_setValue(clave, valor); return; }
                    } catch(e) {}
                    try { localStorage.setItem(clave, valor); } catch(e) {}
                };

                window.leerValor = function(clave) {
                    try {
                        // INTENTAR CON EL PUENTE ANDROID
                        if (window.AndroidJarvisStorage && window.AndroidJarvisStorage.getItem) {
                            const v = window.AndroidJarvisStorage.getItem(clave);
                            if (v !== null && v !== undefined) return v;
                        }
                    } catch(e) {}
                    try {
                        if (typeof GM_getValue === 'function') {
                            const v = GM_getValue(clave, null);
                            return v === undefined ? null : v;
                        }
                    } catch(e) {}
                    try { return localStorage.getItem(clave); } catch(e) { return null; }
                };

                // =========================================================
                //  AQUÍ VA EL CÓDIGO COMPLETO DE TU SCRIPT (desde "// ==UserScript=="
                //  hasta el final). COPIA Y PEGA EL CONTENIDO QUE ME DISTE ENTERO.
                // =========================================================

                // [PASTA TU CÓDIGO AQUÍ - EXACTAMENTE COMO LO DISTE, SIN MODIFICAR NADA MÁS]

                // =========================================================
                //  FIN DEL SCRIPT DE JARVIS
                // =========================================================
            })();
        """.replace("[PASTA TU CÓDIGO AQUÍ - EXACTAMENTE COMO LO DISTE, SIN MODIFICAR NADA MÁS]", obtenerScriptJarvis())

        webView.evaluateJavascript(script, null)
    }

    // Esta función devuelve el contenido de tu script como String.
    // Para no saturar el código aquí, lo pongo en un archivo aparte o lo pegamos directo.
    // En la práctica, copiarás todo el contenido de tu archivo .js dentro de este método.
    private fun obtenerScriptJarvis(): String {
        // ⚠️ IMPORTANTE: Pega AQUÍ TODA la extensa cadena de texto de tu script.
        // Como es muy largo, lo dejamos indicado. Cuando lo subas a GitHub, 
        // solo tienes que copiar y pegar tu script dentro de estas comillas triples.
        return """
            // AQUÍ VA EL CONTENIDO DE TU SCRIPT (desde (function () { ... })())
            // Cópialo tal cual, pero eliminando la parte que redefinía guardarValor/leerValor
            // porque ya las definimos arriba en el patch.

            // SOLO COPIA EL CUERPO PRINCIPAL: desde (function () { ... hasta el final })();
        """.trimIndent()
    }

    // ==========================================
    // PUENTE ANDROID -> JAVASCRIPT (SharedPreferences)
    // ==========================================
    inner class AndroidStorageBridge {
        private val prefs = applicationContext.getSharedPreferences("jarvis_data", MODE_PRIVATE)

        @JavascriptInterface
        fun setItem(key: String, value: String) {
            prefs.edit().putString(key, value).apply()
        }

        @JavascriptInterface
        fun getItem(key: String): String? {
            return prefs.getString(key, null)
        }

        @JavascriptInterface
        fun removeItem(key: String) {
            prefs.edit().remove(key).apply()
        }
    }
}
