package com.example.sms.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log
import com.example.sms.data.AppDatabase
import com.example.sms.data.SmsRecord
import com.example.sms.network.SmsForwarder
import com.example.sms.parser.SmsParser
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class SmsReceiver : BroadcastReceiver() {
    private val scope = CoroutineScope(Dispatchers.IO)

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

        val prefs = context.getSharedPreferences("sms_gateway_prefs", Context.MODE_PRIVATE)
        val isEnabled = prefs.getBoolean("listener_enabled", true)
        if (!isEnabled) {
            Log.d("SmsReceiver", "Gateway is disabled in preferences. Ignoring SMS.")
            return
        }

        val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
        if (messages.isNullOrEmpty()) return

        val fullBody = StringBuilder()
        var senderNumber = ""
        for (msg in messages) {
            fullBody.append(msg.messageBody)
            senderNumber = msg.originatingAddress ?: ""
        }

        val bodyText = fullBody.toString()
        Log.d("SmsReceiver", "SMS Received from $senderNumber: $bodyText")

        val parsed = SmsParser.parse(bodyText)
        if (parsed != null) {
            Log.i("SmsReceiver", "Matched transaction: amount=${parsed.amount}, sender=${parsed.sender}, ref=${parsed.transactionRef}")

            val pendingResult = goAsync()
            scope.launch {
                try {
                    val db = AppDatabase.getDatabase(context)
                    val dao = db.smsRecordDao()

                    val record = SmsRecord(
                        timestamp = System.currentTimeMillis(),
                        sender = parsed.sender,
                        amount = parsed.amount,
                        transactionRef = parsed.transactionRef,
                        rawSms = bodyText,
                        status = "PENDING"
                    )
                    val insertId = dao.insert(record)
                    val insertedRecord = record.copy(id = insertId)

                    SmsForwarder.forwardSms(context, insertedRecord)
                } catch (e: Exception) {
                    Log.e("SmsReceiver", "Error processing received SMS", e)
                } finally {
                    pendingResult.finish()
                }
            }
        } else {
            val pendingResult = goAsync()
            scope.launch {
                try {
                    val db = AppDatabase.getDatabase(context)
                    val dao = db.smsRecordDao()
                    val record = SmsRecord(
                        timestamp = System.currentTimeMillis(),
                        sender = senderNumber,
                        amount = 0.0,
                        transactionRef = "N/A",
                        rawSms = bodyText,
                        status = "IGNORED"
                    )
                    dao.insert(record)
                } catch (e: Exception) {
                    Log.e("SmsReceiver", "Error logging ignored SMS", e)
                } finally {
                    pendingResult.finish()
                }
            }
        }
    }
}
