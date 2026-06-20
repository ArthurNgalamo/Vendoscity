const express = require('express');
const db = require('../config/db');
const router = express.Router();
const authenticate = require('../middleware/authenticate');

router.get('/', authenticate, async (req, res) => {
    const { data, error } = await db
        .from('orders')
        .select(`
            *,
            order_items (
                *,
                products (title, image_url)
            )
        `)
        .eq('user_id', req.user.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

module.exports = router;
