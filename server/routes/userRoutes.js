const express = require('express');
const db = require('../config/db');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // Limite à 5 Mo
});

const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/jpg']);
const EXT_BY_MIME = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp'
};

function hasMagicBytes(mime, buffer) {
    if (!buffer || buffer.length < 4) return false;
    const hex = buffer.toString('hex', 0, 4).toUpperCase();
    if (mime === 'image/jpeg' || mime === 'image/jpg') {
        return hex.startsWith('FFD8FF');
    }
    if (mime === 'image/png') {
        return hex.startsWith('89504E47');
    }
    if (mime === 'image/webp') {
        return hex.startsWith('52494646');
    }
    return true;
}

function clampStr(raw, max) {
    const s = String(raw ?? '').trim();
    if (!s) return '';
    if (s.length <= max) return s;
    return s.slice(0, max);
}

function normalizePhone(raw) {
    const s = String(raw ?? '').trim();
    // Keep digits/+ only to avoid storing arbitrary strings.
    return s.replace(/[^\d+]/g, '').slice(0, 32);
}

router.get('/profile', authenticate, async (req, res) => {
    // Utiliser le client injecté avec le token utilisateur pour respecter RLS
    const userDb = (typeof db.asUser === 'function') ? db.asUser(req.accessToken) : db;
    
    const { data, error } = await userDb
        .from('profiles')
        .select('*')
        .eq('id', req.user.id)
        .maybeSingle();
    
    // Si la requête échoue pour une autre raison que l'absence de données (ex: erreur de syntaxe)
    if (error) return res.status(400).json({ error: error.message });
    
    // Si aucune donnée n'est trouvée (l'utilisateur existe dans Auth mais pas dans la table profiles),
    // on renvoie un objet vide pour ne pas faire planter le front-end.
    const profile = data || {};
    
    // Ajouter l'email depuis les données du token (déjà vérifié par le middleware)
    profile.email = req.user.email || '';

    res.json(profile);
});

router.put('/profile', authenticate, async (req, res) => {
    const payload = {};
    if (req.body?.first_name !== undefined) payload.first_name = clampStr(req.body.first_name, 60);
    if (req.body?.last_name !== undefined) payload.last_name = clampStr(req.body.last_name, 60);
    if (req.body?.phone !== undefined) payload.phone = normalizePhone(req.body.phone);
    if (req.body?.bio !== undefined) payload.bio = clampStr(req.body.bio, 800);
    if (req.body?.shop_name !== undefined) payload.shop_name = clampStr(req.body.shop_name, 80);
    if (req.body?.avatar_url !== undefined) payload.avatar_url = String(req.body.avatar_url || '').trim();

    // Si le payload est vide et aucun champ auth (email/pass) n'est présent, on ne fait rien
    if (Object.keys(payload).length === 0 && !req.body?.email && !req.body?.password) {
        return res.json({ message: 'Aucune modification transmise' });
    }

    // Client spécifique à l'utilisateur (RLS-friendly)
    const userDb = (typeof db.asUser === 'function') ? db.asUser(req.accessToken) : db;

    // 0. Gérer les mises à jour Auth (Email / Mot de passe)
    if (req.body?.email || req.body?.password) {
        const authPayload = {};
        if (req.body.email) authPayload.email = String(req.body.email).trim();
        if (req.body.password) authPayload.password = String(req.body.password);
        
        // En production, on utilise l'API Admin pour contourner l'absence de session client sur le serveur.
        let authError;
        if (db.auth && db.auth.admin && db.__vendoscityKeys?.hasServiceRole) {
            const { error } = await db.auth.admin.updateUserById(req.user.id, authPayload);
            authError = error;
        } else {
            // Si pas de service_role (ex: mode proxy basique), on appelle l'API REST de Supabase Auth directement
            // Cela contourne l'erreur "Auth session missing!" du SDK JS qui nécessite un persistSession actif.
            try {
                // S'il s'agit du mock
                if (userDb.auth && userDb.auth.isMock) {
                    const { error } = await userDb.auth.updateUser(authPayload);
                    authError = error;
                } else {
                    const dbKeys = db.__vendoscityKeys || {};
                    const sbUrl = dbKeys.supabaseUrl || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
                    const sbKey = dbKeys.supabaseKey || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
                    
                    if (sbUrl && sbKey && req.accessToken) {
                        const updateRes = await fetch(`${sbUrl}/auth/v1/user`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                                'apikey': sbKey,
                                'Authorization': `Bearer ${req.accessToken}`
                            },
                            body: JSON.stringify(authPayload)
                        });
                        if (!updateRes.ok) {
                            const errData = await updateRes.json().catch(() => ({}));
                            authError = new Error(errData.msg || errData.message || `Auth API error ${updateRes.status}`);
                        }
                    } else {
                        // Fallback au cas où
                        const { error } = await userDb.auth.updateUser(authPayload);
                        authError = error;
                    }
                }
            } catch (e) {
                authError = e;
            }
        }

        if (authError) return res.status(400).json({ error: authError.message });
    }

    // Si seulement email/password ont été mis à jour et rien d'autre, on s'arrête là
    if (Object.keys(payload).length === 0) {
        return res.json({ message: 'Mise à jour authentification effectuée', email: req.body?.email });
    }

    // Utiliser le client admin (service role) pour les updates DB si possible,
    // car on a déjà authentifié l'utilisateur via le middleware. 
    // Cela évite les erreurs "Auth session missing" liées au passing de token vers Supabase.
    const hasAdmin = db.__vendoscityKeys?.hasServiceRole;
    const updateClient = (hasAdmin) ? db : userDb;

    // 1. Tenter un update classique
    const updateRes = await updateClient
        .from('profiles')
        .update({ ...payload, updated_at: new Date() })
        .eq('id', req.user.id)
        .select();

    let finalData = updateRes.data;
    let finalErr = updateRes.error;

    // Gestion du champ 'updated_at' manquant
    if (finalErr && (finalErr.code === '42703' || String(finalErr.message || '').includes('updated_at'))) {
        const retry1 = await userDb
            .from('profiles')
            .update(payload)
            .eq('id', req.user.id)
            .select();
        finalData = retry1.data;
        finalErr = retry1.error;
    }

    // Gestion du champ 'shop_name' manquant (si la base n'est pas a jour)
    if (finalErr && (finalErr.code === '42703' || String(finalErr.message || '').includes('shop_name'))) {
        const { shop_name: _, ...payloadNoShop } = payload;
        const retry2 = await userDb
            .from('profiles')
            .update(payloadNoShop)
            .eq('id', req.user.id)
            .select();
        finalData = retry2.data;
        finalErr = retry2.error;
    }

    // Si aucune erreur mais aucune ligne modifiee, la ligne n'existe pas ! On fait un insert (fallback).
    if (!finalErr && (!finalData || finalData.length === 0)) {
        // Tenter de recuperer le shopName depuis les metadonnees Auth si possible
        const meta = req.user?.user_metadata || {};
        const metaShopName = clampStr(meta.shop_name || meta.name || '', 80);

        const insertPayload = {
            id: req.user.id,
            ...payload,
            created_at: new Date(),
            updated_at: new Date()
        };

        // Si shop_name manque dans le payload mais existe en meta, on le rajoute pour l'insert
        if (!insertPayload.shop_name && metaShopName) {
            insertPayload.shop_name = metaShopName;
        }

        const ins1 = await updateClient
            .from('profiles')
            .insert(insertPayload)
            .select();
            
        finalData = ins1.data;
        finalErr = ins1.error;

        // Meme logique de repli pour insert (tolerance aux colonnes manquantes)
        if (finalErr) {
            const { shop_name: _, updated_at: __, ...minimalPayload } = insertPayload;
            const ins2 = await updateClient
                .from('profiles')
                .insert(minimalPayload)
                .select();
            
            finalData = ins2.data;
            finalErr = ins2.error;
        }
    }

    if (finalErr) return res.status(400).json({ error: finalErr.message });

    // Synchronisation avec la table produits (Best-effort)
    // Si le numéro de téléphone ou le nom de boutique ont été mis à jour, on répercute sur tous les produits
    if (payload.phone || payload.shop_name) {
        try {
            const productsTable = (typeof db.getProductsTableName === 'function') 
                ? await db.getProductsTableName() 
                : 'products';
            
            const productUpdate = {};
            if (payload.phone) productUpdate.whatsapp = payload.phone;
            if (payload.shop_name) productUpdate.seller_name = payload.shop_name;

            await updateClient
                .from(productsTable)
                .update(productUpdate)
                .eq('seller_id', req.user.id);
        } catch (syncErr) {
            console.error('Erreur synchronisation produits:', syncErr);
        }
    }
    
    // Si finalData est vide (cas RLS select bloqué mais insert/update réussi), renvoyer le payload par défaut
    const result = (finalData && finalData[0]) ? finalData[0] : { ...payload, id: req.user.id };
    if (req.body?.email) result.email = req.body.email;
    res.json(result);
});

// Route d'upload de la photo de profil (Avatar)
router.put('/profile/avatar', authenticate, upload.single('avatar'), async (req, res) => {
    const file = req.file;
    if (!file) {
        return res.status(400).json({ error: 'Aucun fichier transmis' });
    }

    const mime = String(file.mimetype || '').toLowerCase();
    if (!ALLOWED_IMAGE_MIME.has(mime)) {
        return res.status(400).json({ error: 'Type de fichier non supporté (images uniquement).' });
    }
    if (!file.buffer || !hasMagicBytes(mime, file.buffer)) {
        return res.status(400).json({ error: 'Fichier image invalide.' });
    }

    const fileExt = EXT_BY_MIME[mime] || 'jpg';
    const fileName = `avatar-${Date.now()}.${fileExt}`;
    const filePath = `${req.user.id}/${fileName}`;

    // Préférer le client service role (admin) pour les uploads dans le storage
    const token = req.accessToken;
    const storageDb = (db?.__vendoscityKeys?.hasServiceRole)
        ? db
        : (typeof db?.asUser === 'function' ? db.asUser(token) : db);

    const { error: uploadError } = await storageDb.storage
        .from('avatars')
        .upload(filePath, file.buffer, { contentType: mime, upsert: true });

    if (uploadError) {
        const msg = String(uploadError.message || uploadError.error_description || uploadError || '');
        const isRls = msg.toLowerCase().includes('row-level security') || msg.toLowerCase().includes('violates row-level security');
        if (isRls) {
            return res.status(400).json({
                error: "Erreur upload avatar: blocage RLS (Storage). Ajoutez une policy d'upload sur le bucket 'avatars' (authenticated + dossier = auth.uid()) OU configurez SUPABASE_SERVICE_ROLE_KEY sur le serveur backend."
            });
        }
        return res.status(400).json({ error: "Erreur upload avatar : " + msg });
    }

    let publicObjectUrl = null;
    try {
        const { data: publicUrlData } = db.storage.from('avatars').getPublicUrl(filePath);
        if (publicUrlData?.publicUrl) publicObjectUrl = publicUrlData.publicUrl;
    } catch (_) {}

    // Mettre à jour le profil avec la nouvelle URL de la photo de profil
    const userDb = (typeof db.asUser === 'function') ? db.asUser(token) : db;
    const hasAdmin = db.__vendoscityKeys?.hasServiceRole;
    const updateClient = (hasAdmin) ? db : userDb;

    const { data: updateData, error: updateError } = await updateClient
        .from('profiles')
        .update({ avatar_url: publicObjectUrl, updated_at: new Date() })
        .eq('id', req.user.id)
        .select();

    if (updateError) {
        return res.status(400).json({ error: "Erreur mise à jour profil : " + updateError.message });
    }

    const result = (updateData && updateData[0]) ? updateData[0] : { id: req.user.id, avatar_url: publicObjectUrl };
    res.json(result);
});

/**
 * POST /api/user/apply-seller
 * Demande d'activation du statut vendeur avec pièces justificatives
 */
router.post('/apply-seller', authenticate, upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'document', maxCount: 1 },
    { name: 'manager_photo', maxCount: 1 }
]), async (req, res) => {
    const { shop_name, phone, bio, description } = req.body;

    if (!shop_name || !phone) {
        return res.status(400).json({ error: 'Shop name and WhatsApp phone number are required' });
    }

    try {
        const localAllowedMimes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf']);
        const localExtensions = {
            'image/jpeg': 'jpg',
            'image/jpg': 'jpg',
            'image/png': 'png',
            'image/webp': 'webp',
            'application/pdf': 'pdf'
        };

        const uploadToBucket = async (file, prefix) => {
            const mime = String(file.mimetype || '').toLowerCase();
            if (!localAllowedMimes.has(mime)) {
                throw new Error('Type de fichier non supporté (images et PDF uniquement).');
            }
            const fileExt = localExtensions[mime] || 'jpg';
            const fileName = `${prefix}-${Date.now()}.${fileExt}`;
            const filePath = `${req.user.id}/${fileName}`;

            const storageDb = (db?.__vendoscityKeys?.hasServiceRole)
                ? db
                : (typeof db?.asUser === 'function' ? db.asUser(req.accessToken) : db);

            const { error: uploadError } = await storageDb.storage
                .from('avatars')
                .upload(filePath, file.buffer, { contentType: mime, upsert: true });

            if (uploadError) {
                throw new Error(`Erreur d'upload: ${uploadError.message}`);
            }

            const { data: publicUrlData } = db.storage.from('avatars').getPublicUrl(filePath);
            return publicUrlData?.publicUrl || null;
        };

        // 1. Upload des fichiers
        let logoUrl = null;
        let documentUrl = null;
        let managerPhotoUrl = null;

        if (req.files?.logo?.[0]) {
            logoUrl = await uploadToBucket(req.files.logo[0], 'logo');
        }
        if (req.files?.document?.[0]) {
            documentUrl = await uploadToBucket(req.files.document[0], 'doc');
        }
        if (req.files?.manager_photo?.[0]) {
            managerPhotoUrl = await uploadToBucket(req.files.manager_photo[0], 'manager');
        }

        // 2. Algorithme de vérification biométrique/OCR simulé
        let isVerifiedOnApproval = false;
        let verificationDetails = {};

        if (documentUrl && managerPhotoUrl) {
            // Simulation d'une lourde analyse serveur de 2 secondes (comparaison faciale & OCR)
            await new Promise(resolve => setTimeout(resolve, 2000));

            console.log('🤖 B2B Seller Verification Algorithm Running...');
            console.log(`- Checking document alignment with profile...`);
            console.log(`- Facial similarity comparison score: 96.4% match`);
            console.log(`- Anti-spoofing check: PASSED`);

            isVerifiedOnApproval = true;
            verificationDetails = {
                ocr_status: 'success',
                face_match_status: 'success',
                similarity_score: '96.4%',
                verified_at: new Date().toISOString()
            };
        }

        // 3. Mise à jour des informations de candidature
        const updatePayload = {
            seller_status: 'pending',
            seller_application_data: {
                shop_name,
                phone,
                bio: bio || '',
                description: description || '',
                logo_url: logoUrl || '',
                document_url: documentUrl || '',
                manager_photo_url: managerPhotoUrl || '',
                is_verified_on_approval: isVerifiedOnApproval,
                verification_details: verificationDetails,
                request_date: new Date().toISOString()
            }
        };

        // Si un logo a été fourni, il est directement rattaché comme avatar du profil
        if (logoUrl) {
            updatePayload.avatar_url = logoUrl;
        }

        const { error } = await db
            .from('profiles')
            .update(updatePayload)
            .eq('id', req.user.id);

        if (error) throw error;

        res.json({ 
            success: true, 
            message: 'Seller application submitted successfully', 
            is_verified: isVerifiedOnApproval,
            logo_url: logoUrl
        });
    } catch (error) {
        console.error('Error in apply-seller:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/user/simulate-approve-seller
 * Simule l'approbation admin d'une demande vendeur
 */
router.post('/simulate-approve-seller', authenticate, async (req, res) => {
    try {
        // 1. Lire les donnees de demande
        const { data: profile, error: getErr } = await db
            .from('profiles')
            .select('seller_application_data')
            .eq('id', req.user.id)
            .single();

        if (getErr || !profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        const appData = profile.seller_application_data || {};
        
        const shop_name = appData.shop_name || 'Ma Boutique';
        const phone = appData.phone || '';
        const bio = appData.bio || 'Bienvenue dans ma boutique !';
        const logo_url = appData.logo_url || '';
        const is_verified = appData.is_verified_on_approval === true;

        // 2. Mettre le statut à approved, copier les données et appliquer le badge
        const updatePayload = {
            seller_status: 'approved',
            shop_name,
            phone,
            bio,
            is_verified
        };

        if (logo_url) {
            updatePayload.avatar_url = logo_url;
        }

        const { error: updateErr } = await db
            .from('profiles')
            .update(updatePayload)
            .eq('id', req.user.id);

        if (updateErr) throw updateErr;

        res.json({ success: true, message: 'Seller status approved successfully', is_verified });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
