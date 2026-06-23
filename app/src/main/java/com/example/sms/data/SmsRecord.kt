package com.example.sms.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "sms_records")
data class SmsRecord(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val timestamp: Long,
    val sender: String,
    val amount: Double,
    val transactionRef: String,
    val rawSms: String,
    val status: String, // "PENDING", "SUCCESS", "FAILED", "IGNORED"
    val errorMessage: String? = null
)
