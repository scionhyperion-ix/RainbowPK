package io.github.scionhyperion.rainbow

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.View
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

        window.statusBarColor = Color.parseColor("#0B0C16")
        window.navigationBarColor = Color.parseColor("#0B0C16")

        webView = WebView(this)
        webView.setBackgroundColor(Color.parseColor("#0B0C16"))
        webView.overScrollMode = View.OVER_SCROLL_NEVER
        webView.isVerticalScrollBarEnabled = false
        webView.isHorizontalScrollBarEnabled = false
        setContentView(webView)

        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.allowFileAccess = false
        webView.settings.allowContentAccess = false
        webView.settings.setSupportZoom(false)
        webView.settings.builtInZoomControls = false
        webView.settings.displayZoomControls = false
        webView.settings.userAgentString = "${webView.settings.userAgentString} RainbowAndroid/0.2"

        webView.addJavascriptInterface(AndroidBridge(), "RainbowAndroid")
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val uri = request.url
                if (uri.host == "scionhyperion-ix.github.io") return false

                return try {
                    startActivity(Intent(Intent.ACTION_VIEW, uri))
                    true
                } catch (_: Exception) {
                    true
                }
            }

            override fun onPageFinished(view: WebView, url: String) {
                super.onPageFinished(view, url)
                view.evaluateJavascript(
                    "document.documentElement.classList.add('native-app');" +
                        "if(document.body)document.body.classList.add('native-app');",
                    null
                )
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
