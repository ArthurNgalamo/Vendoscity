const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

// Never embed credentials in source. For local dev, set DATABASE_URL (or rely on passwordless local default).
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres@localhost:5432/vendoscity';

const pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 5000
});

async function initDb() {
    console.log('🚀 Démarrage de l\'initialisation complète de la base de données...');
    
    try {
        const dummyUserId = '747b442a-19d8-4ebb-91f4-7686e66f5697';

        // 1. Nettoyage
        console.log('🧹 Nettoyage des anciennes tables...');
        await pool.query('DROP TABLE IF EXISTS public.analytics_events CASCADE');
        await pool.query('DROP TABLE IF EXISTS public.cart_items CASCADE');
        await pool.query('DROP TABLE IF EXISTS public.reviews CASCADE');
        await pool.query('DROP TABLE IF EXISTS public.messages CASCADE');
        await pool.query('DROP TABLE IF EXISTS public.order_items CASCADE');
        await pool.query('DROP TABLE IF EXISTS public.orders CASCADE');
        await pool.query('DROP TABLE IF EXISTS public.favorites CASCADE');
        await pool.query('DROP TABLE IF EXISTS public.addresses CASCADE');
        await pool.query('DROP TABLE IF EXISTS public.product_images CASCADE');
        await pool.query('DROP TABLE IF EXISTS public.products CASCADE');
        await pool.query('DROP TABLE IF EXISTS public.profiles CASCADE');

        // 2. Extensions & Mock Auth Schema for Local Dev
        console.log('🧱 Configuration du schéma d’authentification local...');
        await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
        await pool.query('CREATE SCHEMA IF NOT EXISTS auth');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS auth.users (
                id UUID PRIMARY KEY,
                email VARCHAR(255) UNIQUE,
                raw_user_meta_data JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
            )
        `);

        // 3. Charger et exécuter schema.sql
        console.log('📄 Chargement et exécution de schema.sql...');
        const fs = require('fs');
        const path = require('path');
        const schemaPath = path.join(__dirname, '../schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await pool.query(schemaSql);

        // 4. Insertion du dummy user (le trigger handle_new_user créera automatiquement le profil)
        console.log('👤 Création du profil test...');
        await pool.query(`
            INSERT INTO auth.users (id, email, raw_user_meta_data)
            VALUES ($1, 'arthur@vendoscity.local', $2)
            ON CONFLICT (id) DO NOTHING
        `, [dummyUserId, JSON.stringify({ name: 'Arthur', shop_name: 'Arthur Vendeur', whatsapp: '+237681570075' })]);

        await pool.query(`
            UPDATE public.profiles 
            SET bio = 'Bienvenue dans ma boutique locale !' 
            WHERE id = $1
        `, [dummyUserId]);

        // 6. Insertion de données de test
        console.log('📝 Insertion de données de test...');
        
        // Produits
        const { rows: products } = await pool.query(`
            INSERT INTO public.products (title, price, category, image, seller_id, whatsapp, quartier, specs, is_featured)
            SELECT 
                'Produit de test ' || i, 
                (random() * 50000 + 5000)::int, 
                'Mode', 
                '/assets/images/Gemini_Generated_Image_w7kyliw7kyliw7ky.png',
                $1,
                '+237681570075',
                'Bonamoussadi',
                jsonb_build_array(
                    jsonb_build_object('label','Etat','value','Neuf'),
                    jsonb_build_object('label','Origine','value','Yaounde')
                ),
                (i % 5 = 0)
            FROM generate_series(1, 40) s(i)
            RETURNING id, price
        `, [dummyUserId]);

        // Images (1 par produit pour le seed)
        for (const p of products) {
            await pool.query(`
                INSERT INTO public.product_images (product_id, url, sort)
                VALUES ($1, $2, 0)
            `, [p.id, '/assets/images/Gemini_Generated_Image_w7kyliw7kyliw7ky.png']);
        }

        // Adresse
        await pool.query(`
            INSERT INTO public.addresses (user_id, label, street, city, zip)
            VALUES ($1, 'Domicile', 'Rue de la Joie', 'Douala', 'BP 1234')
        `, [dummyUserId]);

        // Commande
        const { rows: newOrder } = await pool.query(`
            INSERT INTO public.orders (user_id, total_amount, status)
            VALUES ($1, 15500, 'Livré') RETURNING id
        `, [dummyUserId]);
        
        if (products.length > 0) {
            await pool.query(`
                INSERT INTO public.order_items (order_id, product_id, quantity, price)
                VALUES ($1, $2, 1, $3)
            `, [newOrder[0].id, products[0].id, products[0].price]);
        }

        // Favoris
        if (products.length > 1) {
            await pool.query(`
                INSERT INTO public.favorites (user_id, product_id)
                VALUES ($1, $2)
            `, [dummyUserId, products[1].id]);
        }

        // Messages
        await pool.query(`
            INSERT INTO public.messages (sender_id, receiver_id, subject, content)
            VALUES ($1, $1, 'Bienvenue', 'Bienvenue sur votre tableau de bord Vendoscity local !')
        `, [dummyUserId]);

        // Reviews
        if (products.length > 0) {
            await pool.query(`
                INSERT INTO public.reviews (product_id, user_id, rating, comment)
                VALUES ($1, $2, 5, 'Super produit, je recommande !')
            `, [products[0].id, dummyUserId]);
        }

        console.log('🎉 Initialisation complète terminée avec succès !');
        process.exit(0);
    } catch (err) {
        console.error('❌ Erreur lors de l\'initialisation:', err);
        process.exit(1);
    }
}

initDb();
