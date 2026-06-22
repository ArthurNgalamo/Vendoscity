const express = require('express');
const db = require('../config/db');
const router = express.Router();
const authenticate = require('../middleware/authenticate');

/**
 * GET /api/orders
 * Recupere les commandes passees par l'acheteur connecte
 */
router.get('/', authenticate, async (req, res) => {
    const { data, error } = await db
        .from('orders')
        .select(`
            *,
            order_items (
                *,
                products (title, image, image_url)
            )
        `)
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: false });

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

/**
 * GET /api/orders/seller
 * Recupere les commandes recues par le vendeur connecte
 */
router.get('/seller', authenticate, async (req, res) => {
    const { data, error } = await db
        .from('orders')
        .select(`
            *,
            order_items (
                *,
                products (title, image, image_url)
            )
        `)
        .eq('seller_id', req.user.id)
        .order('created_at', { ascending: false });

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

/**
 * POST /api/orders
 * Cree une nouvelle commande (avec ou sans sequestre)
 */
router.post('/', authenticate, async (req, res) => {
    const { seller_id, total_amount, payment_method, buyer_phone_payeur, items } = req.body;

    if (!seller_id || !total_amount || !items || !items.length) {
        return res.status(400).json({ error: 'Missing required order fields' });
    }

    const escrowCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const isEscrow = payment_method !== 'direct_whatsapp';

    try {
        // 1. Inserer la commande
        const orderData = {
            user_id: req.user.id,
            seller_id,
            total_amount,
            status: isEscrow ? 'en attente de paiement' : 'en cours',
            payment_method,
            escrow_status: isEscrow ? 'pending_payment' : 'none',
            amount_paid: 0.0,
            buyer_phone_payeur: isEscrow ? buyer_phone_payeur : null,
            escrow_qr_code: isEscrow ? escrowCode : null
        };

        const { data: newOrder, error: orderErr } = await db
            .from('orders')
            .insert(orderData)
            .select()
            .single();

        if (orderErr) throw orderErr;

        // 2. Inserer les articles de la commande
        const itemsToInsert = items.map(item => ({
            order_id: newOrder.id,
            product_id: item.product_id,
            quantity: item.quantity,
            price: item.price
        }));

        const { error: itemsErr } = await db
            .from('order_items')
            .insert(itemsToInsert);

        if (itemsErr) throw itemsErr;

        // 3. Notifier le vendeur (seulement si paiement direct pour convenir de la livraison)
        if (!isEscrow) {
            await db.from('messages').insert({
                sender_id: req.user.id,
                receiver_id: seller_id,
                subject: `Nouvelle commande directe`,
                content: `Bonjour ! J'ai passé une commande directe de ${total_amount} FCFA. Veuillez me contacter sur WhatsApp pour convenir de la livraison.`
            });
        }

        res.status(201).json(newOrder);

    } catch (error) {
        console.error('❌ Erreur de creation de commande :', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/orders/:id/validate-escrow
 * Valide la commande par l'acheteur, le vendeur ou par QR Code
 */
router.post('/:id/validate-escrow', authenticate, async (req, res) => {
    const { id } = req.params;
    const { qr_code, action } = req.body; // action: 'deliver' (vendeur) ou 'receive' (acheteur)

    try {
        const { data: order, error: fetchErr } = await db
            .from('orders')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchErr || !order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        if (order.escrow_status !== 'held' && order.escrow_status !== 'pending_payment') {
            // Si c'est déjà libéré, on ne fait rien
            if (order.escrow_status === 'released') {
                return res.status(400).json({ error: 'Escrow already released' });
            }
            return res.status(400).json({ error: 'Order is not in escrow' });
        }

        const isBuyer = req.user.id === order.user_id;
        const isSeller = req.user.id === order.seller_id;

        if (!isBuyer && !isSeller) {
            return res.status(403).json({ error: 'Unauthorized to validate this order' });
        }

        let updateFields = {};
        const now = new Date().toISOString();

        // 1. Validation via QR Code / Code secret (Validation double automatique)
        if (qr_code) {
            if (order.escrow_qr_code !== qr_code.trim().toUpperCase()) {
                return res.status(400).json({ error: 'Validation code is invalid' });
            }
            // Le scan de QR Code valide physiquement la livraison des deux cotes
            updateFields = {
                buyer_validated: true,
                seller_validated: true,
                buyer_validated_at: now,
                seller_validated_at: now
            };
        } 
        // 2. Validation unilatérale par action
        else if (action === 'deliver' && isSeller) {
            updateFields = {
                seller_validated: true,
                seller_validated_at: now
            };
        } else if (action === 'receive' && isBuyer) {
            updateFields = {
                buyer_validated: true,
                buyer_validated_at: now
            };
        } else {
            return res.status(400).json({ error: 'Invalid validation request parameters' });
        }

        // Mettre à jour l'état de validation de la commande
        const { data: updatedOrder, error: updateErr } = await db
            .from('orders')
            .update(updateFields)
            .eq('id', id)
            .select()
            .single();

        if (updateErr) throw updateErr;

        // 3. Si l'acheteur a validé (ou QR validé), débloquer automatiquement le séquestre
        if (updatedOrder.buyer_validated) {
            // Mettre à jour le statut du séquestre à 'released' et statut commande à 'complete'
            const { error: releaseErr } = await db
                .from('orders')
                .update({
                    escrow_status: 'released',
                    status: 'complete',
                    escrow_released_at: now
                })
                .eq('id', id);

            if (releaseErr) throw releaseErr;

            // Créditer le solde du portefeuille du vendeur
            const { data: sellerProfile, error: sellerErr } = await db
                .from('profiles')
                .select('wallet_balance')
                .eq('id', order.seller_id)
                .single();

            if (sellerErr) throw sellerErr;

            const newBalance = parseFloat(sellerProfile.wallet_balance || 0) + parseFloat(order.total_amount);

            const { error: balanceErr } = await db
                .from('profiles')
                .update({ wallet_balance: newBalance })
                .eq('id', order.seller_id);

            if (balanceErr) throw balanceErr;

            // Enregistrer la transaction de crédit
            await db.from('wallet_transactions').insert({
                profile_id: order.seller_id,
                order_id: order.id,
                type: 'payout',
                amount: order.total_amount,
                status: 'completed'
            });

            // Envoyer un message de notification de libération au vendeur
            await db.from('messages').insert({
                sender_id: order.user_id,
                receiver_id: order.seller_id,
                subject: `Paiement libéré (Commande #${order.id.substring(0,8)})`,
                content: `Bonne nouvelle ! Le paiement de ${order.total_amount} FCFA pour la commande #${order.id.substring(0,8)} a été libéré sur votre portefeuille. Vous pouvez initier un retrait à tout moment.`
            });

            return res.json({
                message: 'Escrow released successfully and seller paid',
                order: { ...updatedOrder, escrow_status: 'released', status: 'complete' }
            });
        }

        res.json({
            message: 'Order validated, awaiting buyer confirmation',
            order: updatedOrder
        });

    } catch (error) {
        console.error('❌ Erreur de validation de séquestre :', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/orders/:id/invoice
 * Recupere les details d'une commande pour la facture
 */
router.get('/:id/invoice', authenticate, async (req, res) => {
    const { id } = req.params;

    try {
        const { data: order, error: orderErr } = await db
            .from('orders')
            .select(`
                *,
                order_items (
                    *,
                    products (title, price)
                )
            `)
            .eq('id', id)
            .single();

        if (orderErr || !order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Vérifier que le demandeur est l'acheteur ou le vendeur
        if (req.user.id !== order.user_id && req.user.id !== order.seller_id) {
            return res.status(403).json({ error: 'Unauthorized view' });
        }

        // Récupérer les profils acheteur et vendeur
        const { data: buyerProfile } = await db
            .from('profiles')
            .select('first_name, last_name, phone, shop_name')
            .eq('id', order.user_id)
            .single();

        const { data: sellerProfile } = await db
            .from('profiles')
            .select('shop_name, phone, first_name, last_name')
            .eq('id', order.seller_id)
            .single();

        res.json({
            order,
            buyer: buyerProfile,
            seller: sellerProfile
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
