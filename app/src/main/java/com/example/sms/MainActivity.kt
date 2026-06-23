package com.example.sms

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.example.sms.data.AppDatabase
import com.example.sms.data.SmsRecord
import com.example.sms.network.SmsForwarder
import com.example.sms.parser.SmsParser
import com.example.sms.service.SmsForwarderService
import com.example.sms.ui.theme.SMSTheme
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            SMSTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = Color(0xFF0F0C29) // Deep dark background fallback
                ) {
                    SmsGatewayDashboard()
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SmsGatewayDashboard() {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()

    // Preferences & Config States
    var serverUrl by remember { mutableStateOf(SmsForwarder.getServerUrl(context)) }
    var apiKey by remember { mutableStateOf(SmsForwarder.getApiKey(context)) }
    var isApiKeyVisible by remember { mutableStateOf(false) }

    // Service State
    var isServiceRunning by remember { mutableStateOf(SmsForwarderService.isRunning) }

    // DB Records State
    val db = remember { AppDatabase.getDatabase(context) }
    val smsRecords by db.smsRecordDao().getLatestFlow(30).collectAsState(initial = emptyList())

    // Permission States
    var hasSmsPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.RECEIVE_SMS) == PackageManager.PERMISSION_GRANTED
        )
    }
    var hasNotificationPermission by remember {
        mutableStateOf(
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
            } else {
                true
            }
        )
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        hasSmsPermission = permissions[Manifest.permission.RECEIVE_SMS] ?: hasSmsPermission
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            hasNotificationPermission = permissions[Manifest.permission.POST_NOTIFICATIONS] ?: hasNotificationPermission
        }
    }

    // Trigger permissions on launch
    LaunchedEffect(Unit) {
        val permissions = mutableListOf(Manifest.permission.RECEIVE_SMS)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.POST_NOTIFICATIONS)
        }
        permissionLauncher.launch(permissions.toTypedArray())
    }

    // Refresh service status occasionally
    LaunchedEffect(isServiceRunning) {
        // Sync preferences state with service state
        val prefs = context.getSharedPreferences("sms_gateway_prefs", Context.MODE_PRIVATE)
        prefs.edit().putBoolean("listener_enabled", isServiceRunning).apply()
    }

    val gradientBg = Brush.verticalGradient(
        colors = listOf(
            Color(0xFF0F0C29), // Rich midnight blue
            Color(0xFF302B63), // Royal violet
            Color(0xFF24243E)  // Dark graphite
        )
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(gradientBg)
            .padding(16.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxSize()
        ) {
            // Header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text(
                        text = "VENDOSCITY GATEWAY",
                        color = Color.White,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp
                    )
                    Text(
                        text = "Écoute de SMS Cameroun (MTN / Orange)",
                        color = Color(0xFFA5A5D2),
                        fontSize = 12.sp
                    )
                }
                
                // Active/Inactive Badge
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(20.dp))
                        .background(
                            if (isServiceRunning) Color(0x2210B981) else Color(0x22EF4444)
                        )
                        .border(
                            1.dp,
                            if (isServiceRunning) Color(0xFF10B981) else Color(0xFFEF4444),
                            RoundedCornerShape(20.dp)
                        )
                        .padding(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .clip(RoundedCornerShape(4.dp))
                                .background(if (isServiceRunning) Color(0xFF10B981) else Color(0xFFEF4444))
                        )
                        Text(
                            text = if (isServiceRunning) "ACTIF" else "INACTIF",
                            color = if (isServiceRunning) Color(0xFF10B981) else Color(0xFFEF4444),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }

            // Permissions Alert Banner
            if (!hasSmsPermission) {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0x33EF4444)),
                    border = BorderStroke(1.dp, Color(0x66EF4444)),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 8.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Warning,
                            contentDescription = "Warning",
                            tint = Color(0xFFEF4444)
                        )
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Permission SMS manquante",
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp
                            )
                            Text(
                                text = "L'application ne peut pas détecter les SMS sans cette permission.",
                                color = Color(0xFFFCA5A5),
                                fontSize = 12.sp
                            )
                        }
                        Button(
                            onClick = {
                                permissionLauncher.launch(
                                    arrayOf(
                                        Manifest.permission.RECEIVE_SMS,
                                        Manifest.permission.POST_NOTIFICATIONS
                                    )
                                )
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444)),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text("Autoriser", color = Color.White, fontSize = 12.sp)
                        }
                    }
                }
            }

            // Config Form Card
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0x1AFFFFFF)),
                border = BorderStroke(1.dp, Color(0x26FFFFFF)),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 8.dp)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        text = "Configuration Serveur",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp
                    )

                    // URL Input
                    OutlinedTextField(
                        value = serverUrl,
                        onValueChange = { serverUrl = it },
                        label = { Text("URL du Serveur Vendoscity") },
                        placeholder = { Text("http://192.168.1.100:5000") },
                        singleLine = true,
                        leadingIcon = { Icon(Icons.Default.Share, contentDescription = null) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White,
                            focusedLabelColor = Color(0xFF8B5CF6),
                            unfocusedLabelColor = Color(0xFFA5A5D2),
                            focusedBorderColor = Color(0xFF8B5CF6),
                            unfocusedBorderColor = Color(0x33FFFFFF)
                        ),
                        modifier = Modifier.fillMaxWidth()
                    )

                    // API Key Input
                    OutlinedTextField(
                        value = apiKey,
                        onValueChange = { apiKey = it },
                        label = { Text("Clé Secrète de Sécurité (API Key)") },
                        singleLine = true,
                        leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null) },
                        trailingIcon = {
                            IconButton(onClick = { isApiKeyVisible = !isApiKeyVisible }) {
                                Icon(
                                    imageVector = if (isApiKeyVisible) Icons.Default.Clear else Icons.Default.Info, // custom placeholder icon replacement
                                    contentDescription = if (isApiKeyVisible) "Masquer" else "Afficher"
                                )
                            }
                        },
                        visualTransformation = if (isApiKeyVisible) VisualTransformation.None else PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White,
                            focusedLabelColor = Color(0xFF8B5CF6),
                            unfocusedLabelColor = Color(0xFFA5A5D2),
                            focusedBorderColor = Color(0xFF8B5CF6),
                            unfocusedBorderColor = Color(0x33FFFFFF)
                        ),
                        modifier = Modifier.fillMaxWidth()
                    )

                    // Action Buttons Row
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Button(
                            onClick = {
                                SmsForwarder.saveServerUrl(context, serverUrl)
                                SmsForwarder.saveApiKey(context, apiKey)
                                Toast.makeText(context, "Configuration sauvegardée !", Toast.LENGTH_SHORT).show()
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF8B5CF6)),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.Done, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Enregistrer")
                        }

                        Button(
                            onClick = {
                                if (serverUrl.isBlank()) {
                                    Toast.makeText(context, "Veuillez entrer une URL !", Toast.LENGTH_SHORT).show()
                                    return@Button
                                }
                                coroutineScope.launch {
                                    Toast.makeText(context, "Test en cours...", Toast.LENGTH_SHORT).show()
                                    val result = SmsForwarder.testConnection(serverUrl, apiKey)
                                    result.fold(
                                        onSuccess = { msg ->
                                            Toast.makeText(context, "Connexion Réussie : $msg", Toast.LENGTH_LONG).show()
                                        },
                                        onFailure = { err ->
                                            Toast.makeText(context, "Échec : ${err.message}", Toast.LENGTH_LONG).show()
                                        }
                                    )
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0x33FFFFFF)),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Tester Ping")
                        }
                    }
                }
            }

            // Controls & Toggle
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0x1AFFFFFF)),
                    border = BorderStroke(1.dp, Color(0x26FFFFFF)),
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.weight(1f)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text(
                                text = "Service Gateway",
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp
                            )
                            Text(
                                text = if (isServiceRunning) "Écoute active..." else "Service inactif",
                                color = if (isServiceRunning) Color(0xFF10B981) else Color(0xFFA5A5D2),
                                fontSize = 12.sp
                            )
                        }

                        Switch(
                            checked = isServiceRunning,
                            onCheckedChange = { checked ->
                                if (checked) {
                                    if (!hasSmsPermission) {
                                        Toast.makeText(context, "Veuillez d'abord accorder la permission SMS !", Toast.LENGTH_LONG).show()
                                    } else {
                                        SmsForwarderService.startService(context)
                                        isServiceRunning = true
                                    }
                                } else {
                                    SmsForwarderService.stopService(context)
                                    isServiceRunning = false
                                }
                            },
                            colors = SwitchDefaults.colors(
                                checkedThumbColor = Color(0xFF8B5CF6),
                                checkedTrackColor = Color(0x668B5CF6)
                            )
                        )
                    }
                }
            }

            // Quick Simulator Tab Card
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0x1AFFFFFF)),
                border = BorderStroke(1.dp, Color(0x26FFFFFF)),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 8.dp)
            ) {
                Column(
                    modifier = Modifier.padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text(
                        text = "Simulateur de SMS (Paiement Cameroun)",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Button(
                            onClick = {
                                simulateIncomingSms(
                                    context,
                                    "Paiement Mobile Money de 5000 FCFA recu avec succes de 681570075 pour Arthur Romi Ngalamo Kekenou. Ref: TX-SIMULATED123.",
                                    "681570075"
                                )
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0x228B5CF6)),
                            border = BorderStroke(1.dp, Color(0x448B5CF6)),
                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 6.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Simul MTN", color = Color(0xFFC7D2FE), fontSize = 11.sp)
                        }

                        Button(
                            onClick = {
                                simulateIncomingSms(
                                    context,
                                    "Vous avez reçu 8500 FCFA de 699123456 (Arthur Romi). Transaction ID: TX-OM-999.",
                                    "699123456"
                                )
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0x22EC4899)),
                            border = BorderStroke(1.dp, Color(0x44EC4899)),
                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 6.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Simul Orange", color = Color(0xFFFBCFE8), fontSize = 11.sp)
                        }

                        Button(
                            onClick = {
                                simulateIncomingSms(
                                    context,
                                    "Salut Arthur, on se capte quand pour la livraison ?",
                                    "677888999"
                                )
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0x11FFFFFF)),
                            border = BorderStroke(1.dp, Color(0x22FFFFFF)),
                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 6.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Simul Texte", color = Color(0xFFD1D5DB), fontSize = 11.sp)
                        }
                    }
                }
            }

            // Log Header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 16.dp, bottom = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Historique des Transferts (${smsRecords.size})",
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp
                )

                Text(
                    text = "Effacer tout",
                    color = Color(0xFFEF4444),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.clickable {
                        coroutineScope.launch(Dispatchers.IO) {
                            db.smsRecordDao().clearAll()
                        }
                        Toast.makeText(context, "Historique effacé !", Toast.LENGTH_SHORT).show()
                    }
                )
            }

            // Logs List
            if (smsRecords.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "Aucune transaction enregistrée.",
                        color = Color(0xFFA5A5D2),
                        fontSize = 14.sp
                    )
                }
            } else {
                LazyColumn(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(smsRecords, key = { it.id }) { record ->
                        SmsRecordItem(record)
                    }
                }
            }
        }
    }
}

@Composable
fun SmsRecordItem(record: SmsRecord) {
    val df = SimpleDateFormat("dd/MM HH:mm:ss", Locale.getDefault())
    val dateStr = df.format(Date(record.timestamp))

    val statusColor = when (record.status) {
        "SUCCESS" -> Color(0xFF10B981)
        "FAILED" -> Color(0xFFEF4444)
        "PENDING" -> Color(0xFFF59E0B)
        else -> Color(0xFF9CA3AF) // IGNORED
    }

    val statusBg = when (record.status) {
        "SUCCESS" -> Color(0x2210B981)
        "FAILED" -> Color(0x22EF4444)
        "PENDING" -> Color(0x22F59E0B)
        else -> Color(0x229CA3AF)
    }

    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0x0DFFFFFF)),
        border = BorderStroke(1.dp, Color(0x1AFFFFFF)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(4.dp))
                            .background(statusBg)
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Text(
                            text = record.status,
                            color = statusColor,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    Text(
                        text = dateStr,
                        color = Color(0xFFA5A5D2),
                        fontSize = 11.sp
                    )
                }

                if (record.status != "IGNORED") {
                    Text(
                        text = "${record.amount.toInt()} FCFA",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                }
            }

            // Sender and Ref Details
            if (record.status != "IGNORED") {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "Payeur: ${record.sender}",
                        color = Color(0xFFD1D5DB),
                        fontSize = 12.sp
                    )
                    Text(
                        text = "Ref: ${record.transactionRef}",
                        color = Color(0xFFD1D5DB),
                        fontSize = 12.sp
                    )
                }
            } else {
                Text(
                    text = "De: ${record.sender} (SMS normal ignoré)",
                    color = Color(0xFF9CA3AF),
                    fontSize = 12.sp
                )
            }

            // Raw SMS text (subtle gray box)
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(6.dp))
                    .background(Color(0x05FFFFFF))
                    .padding(8.dp)
            ) {
                Text(
                    text = record.rawSms,
                    color = Color(0xFF9CA3AF),
                    fontSize = 11.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }

            // Error display if failed
            if (record.status == "FAILED" && !record.errorMessage.isNullOrBlank()) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    modifier = Modifier.padding(top = 2.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Warning,
                        contentDescription = null,
                        tint = Color(0xFFEF4444),
                        modifier = Modifier.size(12.dp)
                    )
                    Text(
                        text = record.errorMessage,
                        color = Color(0xFFFCA5A5),
                        fontSize = 10.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }
    }
}

// Local simulation helper
private fun simulateIncomingSms(context: Context, body: String, senderNumber: String) {
    val scope = CoroutineScope(Dispatchers.IO)
    val db = AppDatabase.getDatabase(context)
    val dao = db.smsRecordDao()

    val parsed = SmsParser.parse(body)
    if (parsed != null) {
        scope.launch {
            val record = SmsRecord(
                timestamp = System.currentTimeMillis(),
                sender = parsed.sender,
                amount = parsed.amount,
                transactionRef = parsed.transactionRef,
                rawSms = body,
                status = "PENDING"
            )
            val insertId = dao.insert(record)
            val insertedRecord = record.copy(id = insertId)

            SmsForwarder.forwardSms(context, insertedRecord)
        }
        Toast.makeText(context, "SMS de Paiement Simulé !", Toast.LENGTH_SHORT).show()
    } else {
        scope.launch {
            val record = SmsRecord(
                timestamp = System.currentTimeMillis(),
                sender = senderNumber,
                amount = 0.0,
                transactionRef = "N/A",
                rawSms = body,
                status = "IGNORED"
            )
            dao.insert(record)
        }
        Toast.makeText(context, "SMS Simulé (Ignoré par le filtre)", Toast.LENGTH_SHORT).show()
    }
}