const express = require('express');
const db = require('../config/db');
const router = express.Router();
const authenticate = require('../middleware/authenticate');

router.get('/', authenticate, async (req, res) => {
    // Background presence heartbeat: update last_login_at to show the user as "Online"
    db.from('profiles').update({ last_login_at: new Date() }).eq('id', req.user.id).then(({ error }) => {
        if (error) console.error('Presence heartbeat update error:', error);
    });

    const client = (typeof db.asUser === 'function') ? db.asUser(req.accessToken) : db;
    const { data, error } = await client
        .from('messages')
        .select('*')
        .or(`receiver_id.eq.${req.user.id},sender_id.eq.${req.user.id}`)
        .order('created_at', { ascending: false });
    if (error) return res.status(400).json({ error: error.message });

    // Filter and sanitize messages on backend for security and privacy
    const filtered = (data || [])
        .filter(msg => {
            if (msg.sender_id === req.user.id && msg.deleted_by_sender) return false;
            if (msg.receiver_id === req.user.id && msg.deleted_by_receiver) return false;
            return true;
        })
        .map(msg => {
            if (msg.is_deleted_everyone) {
                return {
                    ...msg,
                    content: 'Ce message a été supprimé.'
                };
            }
            return msg;
        });

    res.json(filtered);
});

router.post('/', authenticate, async (req, res) => {
    const { receiver_id, content, subject } = req.body;
    if (!receiver_id || !content || !content.trim()) {
        return res.status(400).json({ error: 'Destinataire et contenu requis.' });
    }

    try {
        const client = (typeof db.asUser === 'function') ? db.asUser(req.accessToken) : db;
        const { data, error } = await client
            .from('messages')
            .insert([{
                sender_id: req.user.id,
                receiver_id,
                subject: subject || null,
                content: content.trim(),
                read_status: false,
                created_at: new Date()
            }])
            .select('*');

        if (error) {
            console.error('Erreur Supabase lors de l\'envoi du message:', error);
            return res.status(400).json({ error: error.message });
        }

        // Calculate and update average response time in the background
        client
            .from('messages')
            .select('sender_id, created_at')
            .or(`and(sender_id.eq.${req.user.id},receiver_id.eq.${receiver_id}),and(sender_id.eq.${receiver_id},receiver_id.eq.${req.user.id})`)
            .order('created_at', { ascending: false })
            .limit(2)
            .then(({ data: msgs, error: fetchErr }) => {
                if (!fetchErr && msgs && msgs.length >= 2) {
                    const currentMsg = msgs[0];
                    const previousMsg = msgs[1];

                    // If the previous message was sent by the OTHER user (meaning we are replying to them)
                    if (previousMsg.sender_id === receiver_id) {
                        const replyTimeMs = new Date(currentMsg.created_at).getTime() - new Date(previousMsg.created_at).getTime();
                        const replyTimeMins = Math.max(0, Math.floor(replyTimeMs / (1000 * 60)));

                        // Only count replies sent within 24 hours to measure actual chat speed (not skewing for days of offline time)
                        if (replyTimeMins < 1440) {
                            client
                                .from('profiles')
                                .select('avg_response_time, response_count')
                                .eq('id', req.user.id)
                                .single()
                                .then(({ data: profile }) => {
                                    if (profile) {
                                        const currentAvg = profile.avg_response_time !== null && profile.avg_response_time !== undefined 
                                            ? Number(profile.avg_response_time) 
                                            : 30;
                                        const currentCount = Number(profile.response_count) || 0;
                                        const nextCount = currentCount + 1;
                                        const nextAvg = Math.round((currentAvg * currentCount + replyTimeMins) / nextCount);

                                        client
                                            .from('profiles')
                                            .update({
                                                avg_response_time: nextAvg,
                                                response_count: nextCount
                                            })
                                            .eq('id', req.user.id)
                                            .catch(err => console.error('Failed to update profile response metrics:', err));
                                    }
                                })
                                .catch(err => console.error('Failed to fetch profile for response metrics:', err));
                        }
                    }
                }
            })
            .catch(err => console.error('Failed to query messages for response metrics:', err));

        res.status(201).json(data[0] || data);
    } catch (err) {
        console.error('Error sending message:', err);
        res.status(500).json({ error: 'Erreur interne du serveur.' });
    }
});

router.post('/read', authenticate, async (req, res) => {
    const { sender_id } = req.body;
    if (!sender_id) {
        return res.status(400).json({ error: 'sender_id requis pour marquer comme lu.' });
    }

    try {
        const client = (typeof db.asUser === 'function') ? db.asUser(req.accessToken) : db;
        const { data, error } = await client
            .from('messages')
            .update({ read_status: true })
            .eq('sender_id', sender_id)
            .eq('receiver_id', req.user.id)
            .eq('read_status', false)
            .select('*');

        if (error) {
            console.error('Error in database marking messages as read:', error);
            return res.status(400).json({ error: error.message });
        }
        res.json({ success: true, updatedCount: data?.length || 0 });
    } catch (err) {
        console.error('Exception marking messages as read:', err);
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});

// Send automatic message from seller to buyer on product click
router.post('/auto-click', authenticate, async (req, res) => {
    const { product_id } = req.body;
    if (!product_id) {
        return res.status(400).json({ error: 'product_id requis.' });
    }

    const buyerId = req.user.id;

    try {
        // 1. Fetch the product to get seller details
        const { data: product, error: prodErr } = await db
            .from('products')
            .select('id, title, price, image_url, images, seller_id')
            .eq('id', product_id)
            .single();

        if (prodErr || !product) {
            console.error('Error fetching product for auto-click:', prodErr);
            return res.status(404).json({ error: 'Produit introuvable.' });
        }

        const sellerId = product.seller_id;

        // If the buyer is the seller, do nothing
        if (sellerId === buyerId) {
            return res.json({ success: true, message: 'Le client est le vendeur lui-même.' });
        }

        // 2. Fetch the buyer's first name/shop name to personalize the message
        const { data: buyerProfile } = await db
            .from('profiles')
            .select('first_name, shop_name')
            .eq('id', buyerId)
            .single();

        const buyerName = buyerProfile?.first_name || buyerProfile?.shop_name || 'client';

        // 3. Check if an auto-message for this product was already sent to avoid spam
        const productSearchString = `__PRODUCT_PREVIEW__:{"id":"${product_id}"`;
        const { data: existingMsg } = await db
            .from('messages')
            .select('id')
            .eq('sender_id', sellerId)
            .eq('receiver_id', buyerId)
            .like('content', `${productSearchString}%`)
            .limit(1);

        if (existingMsg && existingMsg.length > 0) {
            return res.json({ success: true, message: 'Message automatique déjà envoyé pour cet article.' });
        }

        // 4. Construct the preview JSON and message content
        const firstImg = Array.isArray(product.images) && product.images.length > 0
            ? product.images[0]
            : product.image_url;

        const previewData = {
            id: product.id,
            title: product.title,
            price: product.price,
            image: firstImg || ''
        };

        const personalizedText = `Bonjour ${buyerName} ! J'ai vu que vous vous intéressez à mon article "${product.title}". Est-ce qu'il vous intéresse ? N'hésitez pas à me poser vos questions !`;
        const content = `__PRODUCT_PREVIEW__:${JSON.stringify(previewData)}__PRODUCT_PREVIEW__\n${personalizedText}`;

        // 5. Insert the message into the database on behalf of the seller
        const { data: inserted, error: insertErr } = await db
            .from('messages')
            .insert([{
                sender_id: sellerId,
                receiver_id: buyerId,
                content: content,
                read_status: false,
                created_at: new Date()
            }])
            .select('*');

        if (insertErr) {
            console.error('Error inserting auto-click message:', insertErr);
            return res.status(400).json({ error: insertErr.message });
        }

        res.status(201).json({ success: true, message: 'Message envoyé avec succès.', data: inserted[0] || inserted });
    } catch (err) {
        console.error('Exception in auto-click message handler:', err);
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});

// Edit message content
router.put('/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
        return res.status(400).json({ error: 'Le contenu est requis.' });
    }

    try {
        const client = (typeof db.asUser === 'function') ? db.asUser(req.accessToken) : db;
        const { data: msg, error: fetchError } = await client
            .from('messages')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !msg) {
            return res.status(404).json({ error: 'Message introuvable.' });
        }

        if (msg.sender_id !== req.user.id) {
            return res.status(403).json({ error: 'Vous ne pouvez modifier que vos propres messages.' });
        }

        if (msg.is_deleted_everyone) {
            return res.status(400).json({ error: 'Impossible de modifier un message supprimé.' });
        }

        const { data: updated, error: updateError } = await client
            .from('messages')
            .update({
                content: content.trim(),
                is_edited: true
            })
            .eq('id', id)
            .select('*');

        if (updateError) {
            return res.status(400).json({ error: updateError.message });
        }

        res.json(updated[0] || updated);
    } catch (err) {
        console.error('Error updating message:', err);
        res.status(500).json({ error: 'Erreur interne du serveur.' });
    }
});

// Delete a message (for me or for everyone)
router.delete('/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    const { delete_type } = req.body;

    if (delete_type !== 'me' && delete_type !== 'everyone') {
        return res.status(400).json({ error: 'Type de suppression invalide ("me" ou "everyone").' });
    }

    try {
        const client = (typeof db.asUser === 'function') ? db.asUser(req.accessToken) : db;
        const { data: msg, error: fetchError } = await client
            .from('messages')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !msg) {
            return res.status(404).json({ error: 'Message introuvable.' });
        }

        const isSender = msg.sender_id === req.user.id;
        const isReceiver = msg.receiver_id === req.user.id;

        if (!isSender && !isReceiver) {
            return res.status(403).json({ error: 'Vous n\'êtes pas autorisé à modifier ce message.' });
        }

        let updatePayload = {};
        if (delete_type === 'everyone') {
            if (!isSender) {
                return res.status(403).json({ error: 'Seul l\'expéditeur peut supprimer ce message pour tout le monde.' });
            }
            updatePayload = { is_deleted_everyone: true };
        } else {
            if (isSender) {
                updatePayload = { deleted_by_sender: true };
            } else {
                updatePayload = { deleted_by_receiver: true };
            }
        }

        const { data: updated, error: updateError } = await client
            .from('messages')
            .update(updatePayload)
            .eq('id', id)
            .select('*');

        if (updateError) {
            return res.status(400).json({ error: updateError.message });
        }

        res.json(updated[0] || updated);
    } catch (err) {
        console.error('Error deleting message:', err);
        res.status(500).json({ error: 'Erreur interne du serveur.' });
    }
});

// Delete an entire conversation for the caller
router.delete('/conversation/:partnerId', authenticate, async (req, res) => {
    const { partnerId } = req.params;

    try {
        const client = (typeof db.asUser === 'function') ? db.asUser(req.accessToken) : db;
        
        // 1) Mark sent messages as deleted_by_sender
        const { error: errorSent } = await client
            .from('messages')
            .update({ deleted_by_sender: true })
            .eq('sender_id', req.user.id)
            .eq('receiver_id', partnerId);

        // 2) Mark received messages as deleted_by_receiver
        const { error: errorRecv } = await client
            .from('messages')
            .update({ deleted_by_receiver: true })
            .eq('receiver_id', req.user.id)
            .eq('sender_id', partnerId);

        if (errorSent || errorRecv) {
            console.error('Error deleting conversation messages:', errorSent || errorRecv);
            return res.status(400).json({ error: (errorSent || errorRecv).message });
        }

        res.json({ success: true, message: 'Discussion supprimée avec succès.' });
    } catch (err) {
        console.error('Exception deleting conversation:', err);
        res.status(500).json({ error: 'Erreur interne du serveur.' });
    }
});

module.exports = router;
