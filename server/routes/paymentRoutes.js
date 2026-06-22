const express = require('express');
const db = require('../config/db');
const router = express.Router();

// Helper to normalize phone numbers (removes spaces, +, and country code 237)
function normalizePhone(phone) {
    if (!phone) return '';
    let cleaned = phone.toString().replace(/\D/g, '');
    if (cleaned.startsWith('237') && cleaned.length > 9) {
        cleaned = cleaned.substring(3);
    }
    return cleaned;
}

/**
 * Webhook SMS Callback
 * Recoit les SMS de transferts Momo/Orange pour valider le paiement
 * POST /api/payments/sms-callback
 */
router.post('/sms-callback', async (req, res) => {
    const gatewayToken = req.headers['x-sms-gateway-token'];
    const expectedToken = process.env.SMS_GATEWAY_API_KEY || 'dev_momo_secret_token';

    if (gatewayToken !== expectedToken) {
        console.warn(`🔒 Accès non autorisé bloqué sur /sms-callback. Token reçu: ${gatewayToken}`);
        return res.status(401).json({ error: 'Unauthorized gateway access' });
    }

    const { sender, amount, transaction_ref, raw_sms } = req.body;
    
    if (!sender || !amount) {
        return res.status(400).json({ error: 'sender and amount are required' });
    }

    const payeurPhone = normalizePhone(sender);
    const amountVal = parseFloat(amount);
    
    console.log(`📱 SMS Webhook reçu : de=${payeurPhone}, montant=${amountVal}, ref=${transaction_ref}`);

    try {
        // Trouver la commande en attente de paiement la plus ancienne pour ce numéro
        // escrow_status = 'pending_payment'
        const { data: orders, error: fetchErr } = await db
            .from('orders')
            .select('*')
            .eq('escrow_status', 'pending_payment')
            .order('created_at', { ascending: true });

        if (fetchErr) throw fetchErr;

        // Filtrer localement par numéro normalisé pour être robuste aux variations (+237, 237, etc.)
        const targetOrder = orders.find(o => normalizePhone(o.buyer_phone_payeur) === payeurPhone);

        if (!targetOrder) {
            console.log(`⚠️ Aucun paiement séquestre en attente trouvé pour le numéro normalisé : ${payeurPhone}`);
            return res.status(404).json({ message: 'No matching pending order found' });
        }

        const totalAmount = parseFloat(targetOrder.total_amount);
        const newPaidAmount = parseFloat(targetOrder.amount_paid || 0) + amountVal;

        console.log(`Commande trouvée ID: ${targetOrder.id}. Total requis: ${totalAmount}, Déjà payé: ${targetOrder.amount_paid}, Nouveau total payé: ${newPaidAmount}`);

        let newEscrowStatus = 'pending_payment';
        let newStatus = targetOrder.status;

        if (newPaidAmount >= totalAmount) {
            newEscrowStatus = 'held';
            newStatus = 'paye_sequestre';
            console.log(`✅ Commande ${targetOrder.id} entièrement payée ! Fonds sécurisés en séquestre.`);
            
            // Gérer le sur-paiement : s'il y a un surplus, on le crédite sur le solde du profil de l'acheteur
            const surplus = newPaidAmount - totalAmount;
            if (surplus > 0) {
                console.log(`💰 Surplus détecté de ${surplus} FCFA. Crédit vers le solde acheteur.`);
                // Récupérer le profil de l'acheteur
                const { data: buyerProfile } = await db
                    .from('profiles')
                    .select('wallet_balance')
                    .eq('id', targetOrder.user_id)
                    .single();
                
                if (buyerProfile) {
                    const newBal = parseFloat(buyerProfile.wallet_balance || 0) + surplus;
                    await db.from('profiles').update({ wallet_balance: newBal }).eq('id', targetOrder.user_id);
                    
                    // Enregistrer la transaction de surplus
                    await db.from('wallet_transactions').insert({
                        profile_id: targetOrder.user_id,
                        order_id: targetOrder.id,
                        type: 'deposit',
                        amount: surplus,
                        status: 'completed'
                    });
                }
            }

            // Envoyer une notification automatique au vendeur (via la table messages)
            // Utilise l'acheteur comme expéditeur pour éviter les conflits RLS ou de FK.
            await db.from('messages').insert({
                sender_id: targetOrder.user_id,
                receiver_id: targetOrder.seller_id,
                subject: `Commande payée (Séquestre)`,
                content: `Félicitations ! L'acheteur a payé ${totalAmount} FCFA en séquestre sécurisé pour la commande (ID: ${targetOrder.id.substring(0,8)}). Les fonds sont bloqués sur la plateforme. Vous pouvez maintenant procéder à la livraison. Dès réception, l'acheteur ou le scan de son QR Code débloquera les fonds sur votre portefeuille.`
            });
        } else {
            console.log(`⚠️ Paiement partiel de la commande ${targetOrder.id}. Reste à payer : ${totalAmount - newPaidAmount}`);
            
            // Envoyer une notification de paiement partiel à l'acheteur
            await db.from('messages').insert({
                sender_id: targetOrder.seller_id,
                receiver_id: targetOrder.user_id,
                subject: `Paiement partiel reçu`,
                content: `Nous avons reçu un paiement de ${amountVal} FCFA. Le montant total de votre commande est de ${totalAmount} FCFA. Veuillez compléter la somme de ${totalAmount - newPaidAmount} FCFA pour valider le séquestre.`
            });
        }

        // Mettre à jour la commande
        const { error: updateErr } = await db
            .from('orders')
            .update({
                amount_paid: newPaidAmount,
                escrow_status: newEscrowStatus,
                status: newStatus
            })
            .eq('id', targetOrder.id);

        if (updateErr) throw updateErr;

        return res.json({ 
            success: true, 
            order_id: targetOrder.id, 
            status: newStatus, 
            escrow_status: newEscrowStatus, 
            amount_paid: newPaidAmount 
        });

    } catch (error) {
        console.error('❌ Erreur lors du traitement du callback SMS :', error);
        return res.status(500).json({ error: error.message });
    }
});

module.exports = router;
