# 🚀 Guide de Démarrage - Vendoscity

## ⚡ Démarrage Rapide

### 1️⃣ Lancer le Serveur Backend
```powershell
cd server
npm run start
```
✅ Le serveur démarre sur `http://localhost:3000`

### 2️⃣ Accéder au Site
Ouvrez dans votre navigateur:
```
http://localhost:3000
```

---

## 🔓 Créer un Compte Vendeur

1. **Accédez au formulaire d'inscription**
   - Cliquez sur le bouton "S'inscrire" ou "Espace Vendeur"
   - Remplissez tous les champs:
     - **Nom complet**: Votre nom
     - **Email**: Adresse email valide (ex: `vendeur@example.com`)
     - **Mot de passe**: Au moins 6 caractères
     - **WhatsApp**: Numéro valide (ex: `+237681570075`)

2. **Validez l'inscription**
   - Cliquez sur "Créer un compte"
   - Un message de confirmation s'affichera

3. **Connectez-vous**
   - Utilisez vos identifiants (Email + Mot de passe)
   - Accédez à l'Espace Vendeur depuis le tableau de bord

---

## 🛑 Erreur « Erreur API »

### ✅ Solutions

#### 1. Le serveur n'est pas lancé
```powershell
# Vérifier si le serveur tourne
Get-Process node

# Sinon, le lancer:
cd c:\Users\NGALAMO\Desktop\pratiqueHTML\server
npm run start
```

#### 2. Vérifier la base de données Supabase
- Ouvrir: `server/.env`
- Vérifier les clés:
  ```
  NEXT_PUBLIC_SUPABASE_URL=...
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=...
  ```

#### 3. Erreur de validation
- ✓ Email valide (format: `user@domain.com`)
- ✓ Mot de passe: minimum 6 caractères
- ✓ WhatsApp: numéro valide
- ✓ Tous les champs remplis

---

## 📋 Ports et URLs

| Service | URL | Port |
|---------|-----|------|
| **Frontend** | http://localhost:3000 | 3000 |
| **API Backend** | http://localhost:3000/api | 3000 |
| **Supabase** | https://supabase.co | External |

---

## 🔍 Debugging

### Voir les logs du serveur
```powershell
# PowerShell - voir les logs en temps réel
cd server
npm run start
# Les logs s'afficheront directement
```

### Voir les logs du navigateur
1. Ouvrir: `DevTools` (F12)
2. Aller dans `Console`
3. Recharger la page et regarder les messages

### Test d'API direct
```powershell
# Tester l'API d'inscription
$body = @{
    name = "Test Vendeur"
    email = "test@example.com"
    password = "password123"
    whatsapp = "+237681570075"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/auth/register" `
    -Method POST `
    -Headers @{"Content-Type"="application/json"} `
    -Body $body
```

---

## 📞 Support

Si vous avez toujours des erreurs:
1. Vérifiez les logs du serveur (`npm run start`)
2. Vérifiez la console navigateur (F12 → Console)
3. Vérifiez que Supabase est configuré correctement
4. Redémarrez le serveur: `Ctrl+C` puis `npm run start`

---

**Dernière mise à jour**: 24 mars 2026
