package io.github.scionhyperion.rainbow

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

object SecureStore {
    private const val FILE = "rainbow_secure"
    private const val TOKEN = "pk_token"
    private const val ENABLED = "widget_enabled"

    private fun prefs(context: Context) = EncryptedSharedPreferences.create(
        context,
        FILE,
        MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build(),
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    fun save(context: Context, token: String, enabled: Boolean) {
        prefs(context).edit()
            .putString(TOKEN, token)
            .putBoolean(ENABLED, enabled)
            .apply()
    }

    fun clear(context: Context) {
        prefs(context).edit().clear().apply()
    }

    fun token(context: Context): String? = prefs(context).getString(TOKEN, null)
    fun enabled(context: Context): Boolean = prefs(context).getBoolean(ENABLED, false)
}
