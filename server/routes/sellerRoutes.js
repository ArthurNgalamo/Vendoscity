const express = require('express');
const db = require('../config/db');

const router = express.Router();

// Public seller profile (minimal, no private info)
router.get('/:id', async (req, res) => {
    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ error: 'ID vendeur manquant' });

    let { data, error } = await db
        .from('profiles')
        .select('id,shop_name,first_name,last_name,bio,created_at,last_login_at,avatar_url')
        .eq('id', id)
        .single();

    if (error && (error.code === '42703' || String(error.message || '').includes('shop_name'))) {
        const retry = await db
            .from('profiles')
            .select('id,first_name,last_name,bio,created_at,last_login_at,avatar_url')
            .eq('id', id)
            .single();
        data = retry.data;
        error = retry.error;
    }

    if (error || !data) return res.status(404).json({ error: 'Vendeur introuvable' });
    res.json(data);
});

module.exports = router;
