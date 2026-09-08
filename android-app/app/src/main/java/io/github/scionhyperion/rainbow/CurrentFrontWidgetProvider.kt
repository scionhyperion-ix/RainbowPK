package io.github.scionhyperion.rainbow

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

class CurrentFrontWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        super.onUpdate(context, manager, ids)
        refresh(context)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == ACTION_REFRESH) refresh(context)
    }

    companion object {
        private const val PERIODIC = "rainbow-current-front-periodic"
        const val ACTION_REFRESH = "io.github.scionhyperion.rainbow.REFRESH_WIDGET"

        fun schedule(context: Context) {
            val request = PeriodicWorkRequestBuilder<CurrentFrontWorker>(15, TimeUnit.MINUTES).build()
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                PERIODIC,
                ExistingPeriodicWorkPolicy.UPDATE,
                request
            )
        }

        fun cancel(context: Context) {
            WorkManager.getInstance(context).cancelUniqueWork(PERIODIC)
        }

        fun refresh(context: Context) {
            WorkManager.getInstance(context).enqueue(OneTimeWorkRequestBuilder<CurrentFrontWorker>().build())
        }

        fun baseViews(context: Context): RemoteViews {
            val views = RemoteViews(context.packageName, R.layout.current_front_widget)
            val refreshIntent = Intent(context, CurrentFrontWidgetProvider::class.java).apply { action = ACTION_REFRESH }
            val pending = PendingIntent.getBroadcast(
                context,
                1001,
                refreshIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widgetRefresh, pending)

            val openIntent = Intent(context, MainActivity::class.java)
            val openPending = PendingIntent.getActivity(
                context,
                1002,
                openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widgetRoot, openPending)
            return views
        }
    }
}
