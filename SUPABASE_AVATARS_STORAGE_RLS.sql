-- =====================================================================
-- VENDOSCITY: STRUCTURE DE LA TABLE PROFILES & POLITIQUES DE STOCKAGE (AVATARS)
-- =====================================================================

-- 1. AJOUT DE LA COLONNE DANS LA TABLE PROFILES
-- Exécutez cette commande pour ajouter le champ d'avatar à vos utilisateurs.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;


-- 2. POLITIQUES RLS DE STOCKAGE POUR LE BUCKET "avatars"
-- Avant d'exécuter ces politiques, assurez-vous d'avoir créé un bucket nommé "avatars" 
-- dans l'onglet "Storage" de votre tableau de bord Supabase (avec l'option public activée ou non).

-- Politique 1 : Permettre la lecture publique de toutes les photos de profil
CREATE POLICY "Permettre la lecture publique des avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Politique 2 : Permettre aux utilisateurs authentifiés d'ajouter leur propre photo de profil
-- Le fichier doit être placé dans un dossier portant le nom de leur UID (ex: avatars/UID/nom-fichier.jpg)
CREATE POLICY "Permettre l'upload d'avatar par son proprietaire"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Politique 3 : Permettre aux utilisateurs de remplacer leur photo de profil existante
CREATE POLICY "Permettre la mise a jour d'avatar par son proprietaire"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Politique 4 : Permettre aux utilisateurs de supprimer leur photo de profil
CREATE POLICY "Permettre la suppression d'avatar par son proprietaire"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
