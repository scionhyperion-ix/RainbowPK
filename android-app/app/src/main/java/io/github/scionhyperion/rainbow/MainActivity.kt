package io.github.scionhyperion.rainbow

import android.annotation.SuppressLint
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this)
        setContentView(webView)

        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.allowFileAccess = false
        webView.settings.allowContentAccess = false
        webView.addJavascriptInterface(AndroidBridge(), "RainbowAndroid")
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val uri = request.url
                return uri.host != "scionhyperion-ix.github.io"
            }
        }
        webView.loadUrl("https://scionhyperion-ix.github.io/RainbowPK/")
    }

    inner class AndroidBridge {
        @JavascriptInterface
        fun setWidgetAccess(token: String, enabled: Boolean) {
            runOnUiThread {
                if (enabled && token.isNotBlank()) {
                    SecureStore.save(this@MainActivity, token, true)
                    CurrentFrontWidgetProvider.schedule(this@MainActivity)
                    CurrentFrontWidgetProvider.refresh(this@MainActivity)
                } else {
                    SecureStore.clear(this@MainActivity)
                    CurrentFrontWidgetProvider.cancel(this@MainActivity)
                    CurrentFrontWidgetProvider.refresh(this@MainActivity)
                }
            }
        }

        @JavascriptInterface
        fun isNativeApp(): Boolean = true
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (webView.canGoBack()) webView.goBack() else super.onBackPressed()
    }
}
