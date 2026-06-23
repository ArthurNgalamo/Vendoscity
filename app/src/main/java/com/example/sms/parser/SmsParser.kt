package com.example.sms.parser

import java.util.regex.Pattern

object SmsParser {
    data class ParsedSms(
        val amount: Double,
        val sender: String,
        val transactionRef: String
    )

    private val patterns = listOf(
        // MTN MoMo format from simulation script:
        // "Paiement Mobile Money de 5000 FCFA recu avec succes de 681570075 pour Arthur Romi Ngalamo Kekenou. Ref: TX-SIMULATED123."
        Pattern.compile(
            "Paiement Mobile Money de (\\d+(?:\\.\\d+)?) FCFA recu avec succes de (\\d+) pour .*\\. Ref:\\s*([\\w\\-]+)",
            Pattern.CASE_INSENSITIVE
        ),
        // MTN MoMo format variant (with accents):
        Pattern.compile(
            "Paiement Mobile Money de (\\d+(?:\\.\\d+)?) FCFA reçu avec succès de (\\d+) pour .*\\. Ref:\\s*([\\w\\-]+)",
            Pattern.CASE_INSENSITIVE
        ),
        // General MTN/Orange pattern: "Vous avez recu/recu X FCFA de Y... Ref: Z"
        Pattern.compile(
            "(?:Vous avez reçu|Transfert de|Dépôt de|Paiement de) (\\d+(?:\\.\\d+)?) FCFA de (\\d+).*?Ref\\s*:\\s*([\\w\\-]+)",
            Pattern.CASE_INSENSITIVE
        ),
        // Orange Money Cameroun standard:
        // "Reçu 5000 FCFA de 690000000. Transaction ID: 123456789."
        Pattern.compile(
            "(?:Reçu|Paiement de) (\\d+(?:\\.\\d+)?) FCFA de (\\d+).*?Transaction ID\\s*:\\s*([\\w\\-]+)",
            Pattern.CASE_INSENSITIVE
        ),
        // Simple fallback matcher for test/custom messages:
        // "Momo de 5000 FCFA de 681570075 ref: TX123"
        Pattern.compile(
            "Momo de (\\d+(?:\\.\\d+)?) FCFA de (\\d+).*?ref:\\s*([\\w\\-]+)",
            Pattern.CASE_INSENSITIVE
        )
    )

    fun parse(body: String): ParsedSms? {
        val cleanBody = body.replace("\n", " ").replace("\r", " ")
        for (pattern in patterns) {
            val matcher = pattern.matcher(cleanBody)
            if (matcher.find()) {
                try {
                    val amount = matcher.group(1)?.toDoubleOrNull() ?: continue
                    val sender = matcher.group(2) ?: continue
                    val transactionRef = matcher.group(3) ?: continue
                    return ParsedSms(amount, sender, transactionRef)
                } catch (e: Exception) {
                    // Ignore parse errors and try next pattern
                }
            }
        }
        return null
    }
}
