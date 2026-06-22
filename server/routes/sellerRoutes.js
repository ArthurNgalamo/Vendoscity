const express = require('express');
const db = require('../config/db');

const router = express.Router();

// List all sellers with their top 3 products
router.get('/', async (req, res) => {
    try {
        const { data: sellers, error: sellerError } = await db
            .from('profiles')
            .select('id, shop_name, first_name, last_name, bio, created_at, last_login_at, avatar_url, avg_response_time')
            .not('shop_name', 'is', null)
            .neq('shop_name', '')
            .order('shop_name', { ascending: true });

        if (sellerError) {
            console.error('Error fetching sellers:', sellerError);
            return res.status(400).json({ error: sellerError.message });
        }

        // Fetch products for each seller in parallel
        const sellersWithProducts = await Promise.all((sellers || []).map(async (seller) => {
            const { data: products, error: prodError } = await db
                .from('products')
                .select('id, title, price, image, image_url, category, quartier, rating, reviews, is_featured')
                .eq('seller_id', seller.id)
                .order('is_featured', { ascending: false })
                .order('rating', { ascending: false })
                .limit(3);

            return {
                ...seller,
                products: products || []
            };
        }));

        res.json(sellersWithProducts);
    } catch (err) {
        console.error('Exception in GET /api/sellers:', err);
        res.status(500).json({ error: 'Erreur interne du serveur.' });
    }
});

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
