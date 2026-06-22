const express = require('express');
const db = require('../config/db');
const crypto = require('crypto');
const router = express.Router();
const authenticate = require('../middleware/authenticate');

// Helper to hash passcode PIN
function hashPasscode(passcode) {
    return crypto.createHash('sha256').update(passcode.toString()).digest('hex');
}

/**
 * POST /api/wallet/setup-passcode
 * Configure le code PIN de securite (premiere utilisation)
 */
router.post('/setup-passcode', authenticate, async (req, res) => {
    const { passcode } = req.body;

    if (!passcode || passcode.toString().length !== 6 || isNaN(passcode)) {
        return res.status(400).json({ error: 'Passcode must be a 6-digit number' });
    }

    const hashed = hashPasscode(passcode);

    try {
        const { error } = await db
            .from('profiles')
            .update({ wallet_passcode: hashed })
            .eq('id', req.user.id);

        if (error) throw error;
        res.json({ success: true, message: 'Passcode configured successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/wallet/verify-passcode
 * Verifie si le code PIN saisi est correct
 */
router.post('/verify-passcode', authenticate, async (req, res) => {
    const { passcode } = req.body;

    if (!passcode) {
        return res.status(400).json({ error: 'Passcode is required' });
    }

    try {
        const { data: profile, error } = await db
            .from('profiles')
            .select('wallet_passcode')
            .eq('id', req.user.id)
            .single();

        if (error || !profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        if (!profile.wallet_passcode) {
            return res.status(400).json({ error: 'No passcode configured yet', setupRequired: true });
        }

        const matches = profile.wallet_passcode === hashPasscode(passcode);
        res.json({ success: matches });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/wallet/balance
 * Recupere le solde, le solde en attente (sequestres bloques) et les stats
 */
router.get('/balance', authenticate, async (req, res) => {
    try {
        // 1. Recupere le solde disponible depuis le profil
        const { data: profile, error: profileErr } = await db
            .from('profiles')
            .select('wallet_balance, wallet_phone')
            .eq('id', req.user.id)
            .single();

        if (profileErr) throw profileErr;

        // 2. Calculer le solde en attente (commandes payees en sequestre mais non encore livrees/validees)
        // orders where seller_id = user.id AND escrow_status = 'held'
        const { data: pendingOrders, error: ordersErr } = await db
            .from('orders')
            .select('total_amount')
            .eq('seller_id', req.user.id)
            .eq('escrow_status', 'held');

        if (ordersErr) throw ordersErr;

        const pendingBalance = pendingOrders.reduce((acc, curr) => acc + parseFloat(curr.total_amount), 0);

        // 3. Calculer les ventes totales (historiques des payouts complets)
        const { data: totalSalesTx, error: txErr } = await db
            .from('wallet_transactions')
            .select('amount')
            .eq('profile_id', req.user.id)
            .eq('type', 'payout')
            .eq('status', 'completed');

        if (txErr) throw txErr;

        const totalSales = totalSalesTx.reduce((acc, curr) => acc + parseFloat(curr.amount), 0);

        res.json({
            balance: parseFloat(profile.wallet_balance || 0),
            pendingBalance,
            totalSales,
            walletPhone: profile.wallet_phone || '',
            hasPasscode: !!profile.wallet_passcode
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/wallet/transactions
 * Recupere l'historique de toutes les transactions (depots, payouts, retraits)
 */
router.get('/transactions', authenticate, async (req, res) => {
    try {
        const { data: txs, error: txErr } = await db
            .from('wallet_transactions')
            .select('*')
            .eq('profile_id', req.user.id)
            .order('created_at', { ascending: false });

        if (txErr) throw txErr;

        // Recuperer aussi les retraits en attente de validation
        const { data: withdrawals, error: wdErr } = await db
            .from('wallet_withdrawals')
            .select('*')
            .eq('seller_id', req.user.id)
            .order('created_at', { ascending: false });

        if (wdErr) throw wdErr;

        // Fusionner et formater l'historique
        const formattedHistory = [
            ...txs.map(t => ({
                id: t.id,
                type: t.type,
                amount: parseFloat(t.amount),
                status: t.status,
                date: t.created_at,
                order_id: t.order_id
            })),
            ...withdrawals.map(w => ({
                id: w.id,
                type: 'withdrawal',
                amount: parseFloat(w.amount),
                status: w.status, // pending, approved, rejected
                date: w.created_at,
                details: `${w.payment_method.toUpperCase()} (${w.phone_number})`
            }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json(formattedHistory);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/wallet/withdraw
 * Demande un retrait Mobile Money
 */
router.post('/withdraw', authenticate, async (req, res) => {
    const { amount, payment_method, phone_number, passcode } = req.body;

    if (!amount || amount <= 0 || !payment_method || !phone_number || !passcode) {
        return res.status(400).json({ error: 'Missing required withdrawal fields' });
    }

    try {
        // 1. Verifier le PIN secret
        const { data: profile, error: profileErr } = await db
            .from('profiles')
            .select('wallet_passcode, wallet_balance')
            .eq('id', req.user.id)
            .single();

        if (profileErr) throw profileErr;

        if (!profile.wallet_passcode) {
            return res.status(400).json({ error: 'No passcode configured yet' });
        }

        if (profile.wallet_passcode !== hashPasscode(passcode)) {
            return res.status(401).json({ error: 'Incorrect passcode PIN' });
        }

        const balance = parseFloat(profile.wallet_balance || 0);
        const withdrawAmount = parseFloat(amount);

        if (withdrawAmount > balance) {
            return res.status(400).json({ error: 'Insufficient wallet balance' });
        }

        // 2. Debiter le solde disponible immédiatement pour eviter le double-spending
        const newBalance = balance - withdrawAmount;
        const { error: balanceErr } = await db
            .from('profiles')
            .update({ 
                wallet_balance: newBalance,
                wallet_phone: phone_number // Mémoriser le numéro de retrait par défaut
            })
            .eq('id', req.user.id);

        if (balanceErr) throw balanceErr;

        // 3. Creer la demande de retrait
        const { data: wd, error: wdErr } = await db
            .from('wallet_withdrawals')
            .insert({
                seller_id: req.user.id,
                amount: withdrawAmount,
                payment_method,
                phone_number,
                status: 'pending'
            })
            .select()
            .single();

        if (wdErr) {
            // Rollback balance en cas d'erreur
            await db.from('profiles').update({ wallet_balance: balance }).eq('id', req.user.id);
            throw wdErr;
        }

        // Simuler une approbation automatique de l'admin après 5 secondes pour faciliter le test
        setTimeout(async () => {
            try {
                // Mettre à jour le statut du retrait à 'approved'
                await db.from('wallet_withdrawals')
                    .update({ status: 'approved', processed_at: new Date().toISOString() })
                    .eq('id', wd.id);
                
                // Enregistrer la transaction debit completée
                await db.from('wallet_transactions').insert({
                    profile_id: req.user.id,
                    type: 'withdrawal',
                    amount: withdrawAmount,
                    status: 'completed'
                });

                // Envoyer une notification
                await db.from('messages').insert({
                    sender_id: req.user.id,
                    receiver_id: req.user.id,
                    subject: 'Retrait approuvé',
                    content: `Votre demande de retrait de ${withdrawAmount} FCFA vers votre numéro ${phone_number} (${payment_method.toUpperCase()}) a été approuvée et traitée par Arthur Romi Ngalamo Kekenou.`
                });
            } catch (err) {
                console.error('Retrait auto-approbation error:', err);
            }
        }, 5000);

        res.json({ success: true, message: 'Withdrawal request submitted successfully', newBalance });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/wallet/deposit
 * Effectue un depot dans son portefeuille (simulation)
 */
router.post('/deposit', authenticate, async (req, res) => {
    const { amount, payment_method, phone_number } = req.body;

    if (!amount || amount <= 0 || !payment_method || !phone_number) {
        return res.status(400).json({ error: 'Missing required deposit fields' });
    }

    try {
        const { data: profile, error: profileErr } = await db
            .from('profiles')
            .select('wallet_balance')
            .eq('id', req.user.id)
            .single();

        if (profileErr) throw profileErr;

        const balance = parseFloat(profile.wallet_balance || 0);
        const depositAmount = parseFloat(amount);
        const newBalance = balance + depositAmount;

        // 1. Mettre à jour le solde du profil
        const { error: balanceErr } = await db
            .from('profiles')
            .update({ wallet_balance: newBalance })
            .eq('id', req.user.id);

        if (balanceErr) throw balanceErr;

        // 2. Enregistrer la transaction de dépôt
        await db.from('wallet_transactions').insert({
            profile_id: req.user.id,
            type: 'deposit',
            amount: depositAmount,
            status: 'completed'
        });

        // 3. Envoyer un message de notification
        await db.from('messages').insert({
            sender_id: req.user.id,
            receiver_id: req.user.id,
            subject: 'Dépôt validé',
            content: `Votre dépôt de ${depositAmount} FCFA via ${payment_method.toUpperCase()} (${phone_number}) a été crédité avec succès sur votre solde.`
        });

        res.json({ success: true, message: 'Deposit successful', newBalance });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
