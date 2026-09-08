package io.github.scionhyperion.rainbow

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.os.SystemClock
import android.view.View
import androidx.work.Worker
import androidx.work.WorkerParameters
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.time.Instant

class CurrentFrontWorker(
    appContext: Context,
    params: WorkerParameters
) : Worker(appContext, params) {

    override fun doWork(): Result {
        val context = applicationContext
        val token = SecureStore.token(context)
        val enabled = SecureStore.enabled(context)
        val manager = AppWidgetManager.getInstance(context)
        val component = ComponentName(context, CurrentFrontWidgetProvider::class.java)
        val ids = manager.getAppWidgetIds(component)

        if (!enabled || token.isNullOrBlank()) {
            ids.forEach { id ->
                val views = CurrentFrontWidgetProvider.baseViews(context)
                views.setTextViewText(R.id.widgetNames, "Open Rainbow to enable widget access")
                views.setTextViewText(R.id.widgetStatus, "Widget access is not enabled")
                views.setViewVisibility(R.id.widgetTimer, View.GONE)
                manager.updateAppWidget(id, views)
            }
            return Result.success()
        }

        return try {
            val connection = (URL("https://api.pluralkit.me/v2/systems/@me/fronters").openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = 10000
                readTimeout = 10000
                setRequestProperty("Authorization", token)
                setRequestProperty("Accept", "application/json")
            }

            val code = connection.responseCode
            if (code !in 200..299) {
                renderError(manager, ids, "PluralKit returned HTTP $code")
                return if (code == 401 || code == 403) Result.failure() else Result.retry()
            }

            val body = connection.inputStream.bufferedReader().use { it.readText() }
            val json = JSONObject(body)
            val members = json.optJSONArray("members")
            val names = buildList {
                if (members != null) {
                    for (i in 0 until members.length()) {
                        val member = members.optJSONObject(i) ?: continue
                        val name = member.optString("name").ifBlank {
                            member.optString("display_name").ifBlank { member.optString("id", "Unknown") }
                        }
                        add(name)
                    }
                }
            }

            val timestamp = json.optString("timestamp").takeIf { it.isNotBlank() }
            val namesText = if (names.isEmpty()) "Nobody is fronting" else names.joinToString(" + ")

            ids.forEach { id ->
                val views = CurrentFrontWidgetProvider.baseViews(context)
                views.setTextViewText(R.id.widgetNames, namesText)
                views.setTextViewText(R.id.widgetStatus, "Updated from PluralKit")

                if (timestamp != null && names.isNotEmpty()) {
                    val started = Instant.parse(timestamp).toEpochMilli()
                    val elapsedBase = SystemClock.elapsedRealtime() - (System.currentTimeMillis() - started)
                    views.setChronometer(R.id.widgetTimer, elapsedBase, null, true)
                    views.setViewVisibility(R.id.widgetTimer, View.VISIBLE)
                } else {
                    views.setViewVisibility(R.id.widgetTimer, View.GONE)
                }

                manager.updateAppWidget(id, views)
            }

            Result.success()
        } catch (error: Exception) {
            renderError(manager, ids, "Offline or unable to reach PluralKit")
            Result.retry()
        }
    }

    private fun renderError(manager: AppWidgetManager, ids: IntArray, message: String) {
        ids.forEach { id ->
            val views = CurrentFrontWidgetProvider.baseViews(applicationContext)
            views.setTextViewText(R.id.widgetStatus, message)
            manager.updateAppWidget(id, views)
        }
    }
}
