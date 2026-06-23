package com.example.sms.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

@Dao
interface SmsRecordDao {
    @Query("SELECT * FROM sms_records ORDER BY timestamp DESC")
    fun getAllFlow(): Flow<List<SmsRecord>>

    @Query("SELECT * FROM sms_records ORDER BY timestamp DESC LIMIT :limit")
    fun getLatestFlow(limit: Int): Flow<List<SmsRecord>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(record: SmsRecord): Long

    @Update
    suspend fun update(record: SmsRecord)

    @Query("DELETE FROM sms_records")
    suspend fun clearAll()
}
