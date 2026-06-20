const express = require('express');
const db = require('../config/db');
const router = express.Router();
const authenticate = require('../middleware/authenticate');

function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

router.get('/', authenticate, async (req, res) => {
    const client = (typeof db.asUser === 'function') ? db.asUser(req.accessToken) : db;
    const { data, error } = await client
        .from('favorites')
        .select(`
            id,
            product_id,
            products (*)
        `)
        .eq('user_id', req.user.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

router.post('/', authenticate, async (req, res) => {
    const { product_id } = req.body;
    if (!product_id || !isUuid(product_id)) {
        return res.status(400).json({ error: 'product_id invalide' });
    }
    const client = (typeof db.asUser === 'function') ? db.asUser(req.accessToken) : db;
    const { data, error } = await client
        .from('favorites')
        .insert([{ user_id: req.user.id, product_id }])
        .select();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data[0]);
});

router.delete('/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    if (!isUuid(id)) {
        return res.status(400).json({ error: 'id invalide' });
    }
    const client = (typeof db.asUser === 'function') ? db.asUser(req.accessToken) : db;
    const { error } = await client
        .from('favorites')
        .delete()
        .or(`id.eq.${id},product_id.eq.${id}`)
        .eq('user_id', req.user.id);
    if (error) return res.status(400).json({ error: error.message });
    res.status(204).send();
});

module.exports = router;
