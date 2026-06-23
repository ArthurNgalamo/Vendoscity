package com.example.sms.network

import android.content.Context
import com.example.sms.data.AppDatabase
import com.example.sms.data.SmsRecord
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

object SmsForwarder {
    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .writeTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()

    private const val PREFS_NAME = "sms_gateway_prefs"
    private const val KEY_SERVER_URL = "server_url"
    private const val KEY_API_KEY = "api_key"

    fun getServerUrl(context: Context): String {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return prefs.getString(KEY_SERVER_URL, "http://10.0.2.2:5000") ?: "http://10.0.2.2:5000"
    }

    fun saveServerUrl(context: Context, url: String) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString(KEY_SERVER_URL, url).apply()
    }

    fun getApiKey(context: Context): String {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return prefs.getString(KEY_API_KEY, "dev_momo_secret_token") ?: "dev_momo_secret_token"
    }

    fun saveApiKey(context: Context, key: String) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString(KEY_API_KEY, key).apply()
    }

    suspend fun forwardSms(context: Context, record: SmsRecord) = withContext(Dispatchers.IO) {
        val database = AppDatabase.getDatabase(context)
        val dao = database.smsRecordDao()

        val serverUrl = getServerUrl(context).trim().removeSuffix("/")
        val endpoint = "$serverUrl/api/payments/sms-callback"
        val apiKey = getApiKey(context)

        val json = JSONObject().apply {
            put("sender", record.sender)
            put("amount", record.amount)
            put("transaction_ref", record.transactionRef)
            put("raw_sms", record.rawSms)
        }

        val requestBody = json.toString().toRequestBody("application/json; charset=utf-8".toMediaType())

        val request = Request.Builder()
            .url(endpoint)
            .post(requestBody)
            .addHeader("Content-Type", "application/json")
            .addHeader("X-SMS-Gateway-Token", apiKey)
            .build()

        try {
            client.newCall(request).execute().use { response ->
                if (response.isSuccessful) {
                    val updated = record.copy(status = "SUCCESS", errorMessage = null)
                    dao.update(updated)
                } else {
                    val errorMsg = "HTTP ${response.code}: ${response.message}"
                    val updated = record.copy(status = "FAILED", errorMessage = errorMsg)
                    dao.update(updated)
                }
            }
        } catch (e: Exception) {
            val errorMsg = e.localizedMessage ?: e.javaClass.simpleName
            val updated = record.copy(status = "FAILED", errorMessage = errorMsg)
            dao.update(updated)
        }
    }

    suspend fun testConnection(serverUrl: String, apiKey: String): Result<String> = withContext(Dispatchers.IO) {
        val endpoint = "${serverUrl.trim().removeSuffix("/")}/api/payments/sms-callback"
        
        val json = JSONObject().apply {
            put("sender", "000000000")
            put("amount", 0.0)
            put("transaction_ref", "CONN-TEST")
            put("raw_sms", "Test de connexion de la passerelle SMS Android.")
        }

        val requestBody = json.toString().toRequestBody("application/json; charset=utf-8".toMediaType())

        val request = Request.Builder()
            .url(endpoint)
            .post(requestBody)
            .addHeader("Content-Type", "application/json")
            .addHeader("X-SMS-Gateway-Token", apiKey)
            .build()

        try {
            client.newCall(request).execute().use { response ->
                if (response.isSuccessful || response.code == 404 || response.code == 400) {
                    if (response.code == 401) {
                        Result.failure(Exception("Authentification échouée (Clé API invalide)"))
                    } else {
                        Result.success("Connexion réussie! Code HTTP: ${response.code}")
                    }
                } else {
                    Result.failure(Exception("Serveur injoignable. Code HTTP: ${response.code}"))
                }
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
