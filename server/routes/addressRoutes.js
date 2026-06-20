const express = require('express');
const db = require('../config/db');
const router = express.Router();
const authenticate = require('../middleware/authenticate');

function clampStr(raw, max) {
    const s = String(raw ?? '').trim();
    if (!s) return '';
    if (s.length <= max) return s;
    return s.slice(0, max);
}

router.get('/', authenticate, async (req, res) => {
    const { data, error } = await db
        .from('addresses')
        .select('*')
        .eq('user_id', req.user.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

router.post('/', authenticate, async (req, res) => {
    const label = clampStr(req.body?.label, 60);
    const street = clampStr(req.body?.street, 120);
    const city = clampStr(req.body?.city, 80);
    const zip = clampStr(req.body?.zip, 24);

    if (!label || !street || !city) {
        return res.status(400).json({ error: 'Adresse invalide' });
    }

    const { data, error } = await db
        .from('addresses')
        .insert([{ user_id: req.user.id, label, street, city, zip }])
        .select();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data[0]);
});

router.delete('/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    const { error } = await db
        .from('addresses')
        .delete()
        .eq('id', id)
        .eq('user_id', req.user.id);
    if (error) return res.status(400).json({ error: error.message });
    res.status(204).send();
});

module.exports = router;
