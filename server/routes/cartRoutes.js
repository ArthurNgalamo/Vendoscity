const express = require('express');
const db = require('../config/db');
const router = express.Router();
const authenticate = require('../middleware/authenticate');

function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

// 1. Get all cart items
router.get('/', authenticate, async (req, res) => {
    const client = (typeof db.asUser === 'function') ? db.asUser(req.accessToken) : db;
    const { data, error } = await client
        .from('cart_items')
        .select(`
            id,
            quantity,
            product_id,
            products (*)
        `)
        .eq('user_id', req.user.id);
    
    if (error) {
        console.error('Error fetching cart items:', error);
        return res.status(400).json({ error: error.message });
    }
    
    // Format response to match frontend expectations
    // Frontend expects array of items containing id, quantity, title, price, etc.
    const formatted = (data || []).map(item => {
        const p = item.products || {};
        const defaultImage = '/assets/images/Gemini_Generated_Image_w7kyliw7kyliw7ky.png';
        const images = Array.isArray(p.images) && p.images.length > 0
            ? p.images
            : [p.image_url || p.image || defaultImage].filter(Boolean);

        return {
            id: p.id || item.product_id,
            quantity: item.quantity,
            title: p.title || 'Produit',
            price: Number(p.price || 0),
            category: p.category || '',
            whatsapp: p.whatsapp || '',
            image_url: p.image_url || '',
            image: p.image || '',
            images: images,
            seller_id: p.seller_id || '',
            shop_name: p.shop_name || 'Boutique'
        };
    });

    res.json(formatted);
});

// 2. Add/Increment quantity of an item
router.post('/', authenticate, async (req, res) => {
    const { product_id, quantity } = req.body;
    const qty = parseInt(quantity, 10) || 1;

    if (!product_id || !isUuid(product_id)) {
        return res.status(400).json({ error: 'product_id invalide' });
    }

    const client = (typeof db.asUser === 'function') ? db.asUser(req.accessToken) : db;

    // Check if it already exists
    const { data: existing, error: fetchError } = await client
        .from('cart_items')
        .select('*')
        .eq('user_id', req.user.id)
        .eq('product_id', product_id);

    if (fetchError) {
        console.error('Error checking existing cart item:', fetchError);
        return res.status(400).json({ error: fetchError.message });
    }

    if (existing && existing.length > 0) {
        // Update quantity
        const newQty = existing[0].quantity + qty;
        const { data, error } = await client
            .from('cart_items')
            .update({ quantity: newQty })
            .eq('user_id', req.user.id)
            .eq('product_id', product_id)
            .select();

        if (error) {
            console.error('Error updating quantity:', error);
            return res.status(400).json({ error: error.message });
        }
        return res.status(200).json(data[0]);
    } else {
        // Insert new
        const { data, error } = await client
            .from('cart_items')
            .insert([{ user_id: req.user.id, product_id, quantity: qty }])
            .select();

        if (error) {
            console.error('Error inserting new cart item:', error);
            return res.status(400).json({ error: error.message });
        }
        return res.status(201).json(data[0]);
    }
});

// 3. Update exact quantity of a product
router.put('/:product_id', authenticate, async (req, res) => {
    const { product_id } = req.params;
    const { quantity } = req.body;
    const qty = parseInt(quantity, 10);

    if (!product_id || !isUuid(product_id)) {
        return res.status(400).json({ error: 'product_id invalide' });
    }
    if (isNaN(qty) || qty < 1) {
        return res.status(400).json({ error: 'quantité invalide' });
    }

    const client = (typeof db.asUser === 'function') ? db.asUser(req.accessToken) : db;
    const { data, error } = await client
        .from('cart_items')
        .update({ quantity: qty })
        .eq('user_id', req.user.id)
        .eq('product_id', product_id)
        .select();

    if (error) {
        console.error('Error updating cart item quantity:', error);
        return res.status(400).json({ error: error.message });
    }
    if (!data || data.length === 0) {
        return res.status(404).json({ error: 'Article introuvable dans le panier' });
    }
    res.json(data[0]);
});

// 4. Delete item from cart
router.delete('/:product_id', authenticate, async (req, res) => {
    const { product_id } = req.params;

    if (!product_id || !isUuid(product_id)) {
        return res.status(400).json({ error: 'product_id invalide' });
    }

    const client = (typeof db.asUser === 'function') ? db.asUser(req.accessToken) : db;
    const { error } = await client
        .from('cart_items')
        .delete()
        .eq('user_id', req.user.id)
        .eq('product_id', product_id);

    if (error) {
        console.error('Error deleting cart item:', error);
        return res.status(400).json({ error: error.message });
    }
    res.status(204).send();
});

// 5. Clear entire cart
router.delete('/', authenticate, async (req, res) => {
    const client = (typeof db.asUser === 'function') ? db.asUser(req.accessToken) : db;
    const { error } = await client
        .from('cart_items')
        .delete()
        .eq('user_id', req.user.id);

    if (error) {
        console.error('Error clearing cart:', error);
        return res.status(400).json({ error: error.message });
    }
    res.status(204).send();
});

module.exports = router;
