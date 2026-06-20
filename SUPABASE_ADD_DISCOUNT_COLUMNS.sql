-- Script de migration pour les réductions dynamiques
-- A exécuter dans l'éditeur SQL de Supabase

-- Ajouter la colonne discount_amount (Montant de la réduction en FCFA)
ALTER TABLE products ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;

-- Ajouter la colonne old_price (Ancien prix = Prix actuel + Réduction)
ALTER TABLE products ADD COLUMN IF NOT EXISTS old_price NUMERIC DEFAULT 0;

-- Commentaire pour aider les développeurs
COMMENT ON COLUMN products.discount_amount IS 'Le montant de la réduction saisie par le vendeur (ex: 500)';
COMMENT ON COLUMN products.old_price IS 'L''ancien prix calculé automatiquement (prix + discount_amount)';
