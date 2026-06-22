# Walkthrough — Corrections Récentes & Optimisations du Projet Vendoscity

Ce document résume l'ensemble des corrections, refactorings et optimisations de performance qui ont été apportés à la plateforme Vendoscity.

---

##  Résumé des Changements

### 1. Tracé dynamique du graphique SVG d'activité (Dashboard)
- **Problème** : Dans la section statistiques, le graphique d'activité (courbe d'activité) présentait de graves dysfonctionnements d'alignement ou ne s'affichait pas.
- **Cause** : Le tracé était codé en dur pour 7 jours. Lorsque l'utilisateur sélectionnait `30d` or `all` (6 mois), le nombre de points variait, créant des décalages complets ou des coordonnées `NaN`.
- **Solution** : Refonte mathématique et dynamique du tracé du graphe dans [StatsSection.js](file:///c:/Users/NGALAMO/Desktop/tous/pratiqueHTML/client/src/app/dashboard/components/StatsSection.js) en calculant proportionnellement les points X et Y selon la taille et le max des données.

### 2. Refonte du design du Footer Desktop (Plus sobre)
- **Problème** : Le footer sur desktop était trop coloré.
- **Solution** : Utilisation d'un fond anthracite mat plat très élégant (`#111827`), d'une fine ligne de démarcation grise de 1px (`rgba(255, 255, 255, 0.08)`) et d'accents blancs/argentés épurés au survol des liens.

### 3. Fix du placeholder rotatif après scroll (Header Desktop)
- **Problème** : La barre de recherche compacte du header sticky n'avait plus ses phrases rotatives en effet machine à écrire.
- **Solution** : Liaison du placeholder avec `animatedPlaceholder` dans [DesktopHeader.js](file:///c:/Users/NGALAMO/Desktop/tous/pratiqueHTML/client/src/components/Header/DesktopHeader.js).

### 4. Transition progressive au pixel près (Messagerie)
- **Problème** : La transition de l'en-tête de messagerie était trop brutale lors du défilement des messages.
- **Solution** : Groupement du header et de la bannière dans un conteneur absolu unique, et suivi progressif du scroll en temps réel sans re-renders React via refs.

### 5. Série de connexions (Streak de connexion sur le Dashboard)
- **Problème** : L'indicateur de série de connexions consécutives affichait toujours `🔥 0` sur le tableau de bord.
- **Solution** : Ajout de `login_streak` dans l'état `profileData` de `dashboard/page.js` et chargement du profil au montage.

### 6. Fix de la Détection Automatique et Sélection de Pays (Header Global)
- **Problème** : La détection automatique de pays par IP (Adresse de livraison dans le Header) échouait régulièrement sur le client à cause des blocages CORS, des limites de requêtes ou des ad-blockers qui bloquent les endpoints tiers. De plus, l'utilisateur ne pouvait pas modifier ce pays.
- **Solution** :
  1. **Proxy côté serveur (Express)** : Ajout d'une route `/api/geolocation` sur le serveur backend dans [server.js](file:///c:/Users/NGALAMO/Desktop/tous/pratiqueHTML/server/server.js) avec fallbacks en série (`free.freeipapi.com` -> `ipwho.is` -> `ipapi.co` -> Cameroun par défaut) et timeouts stricts de 3.5s.
  2. **Connexion client** : Modification de [index.js](file:///c:/Users/NGALAMO/Desktop/tous/pratiqueHTML/client/src/components/Header/index.js) pour appeler l'endpoint proxy `/api/geolocation` avec timeout de 5s.
  3. **Sélection manuelle interactive** : Modification de [DesktopHeader.js](file:///c:/Users/NGALAMO/Desktop/tous/pratiqueHTML/client/src/components/Header/DesktopHeader.js) pour rendre le menu de livraison interactif en listant tous les pays de `COUNTRIES` et en permettant à l'utilisateur de cliquer sur un pays pour changer sa région de livraison. Le choix est sauvegardé localement dans `localStorage` pour persister après rechargement.

### 7. Résolution du Blocage de Chargement sur Safari/iPhone (Service Workers Legacy)
- **Problème** : Sur iPhone, les produits de la page d'accueil et des autres pages chargeaient indéfiniment.
- **Cause** : Un ancien Service Worker PWA (`sw.js`) enregistré par la version legacy du site restait actif en arrière-plan et interceptait toutes les requêtes Next.js, renvoyant l'ancienne page d'accueil et bloquant les nouveaux scripts Next.js/APIs.
- **Solution** : Ajout d'un script de nettoyage dans [TranslationHandler.js](file:///c:/Users/NGALAMO/Desktop/tous/pratiqueHTML/client/src/components/TranslationHandler.js) qui détecte et désenregistre automatiquement tout Service Worker hérité (legacy) au montage, puis recharge la page une fois pour appliquer le routage Next.js proprement et nettoyer le cache.

---

## Fichiers modifiés

### 📄 [server.js](file:///c:/Users/NGALAMO/Desktop/tous/pratiqueHTML/server/server.js)
- Ajout de la route `/api/geolocation` avec fallbacks de géolocalisation et timeouts stricts (`AbortSignal.timeout`).

### 📄 [index.js (Header)](file:///c:/Users/NGALAMO/Desktop/tous/pratiqueHTML/client/src/components/Header/index.js)
- Remplacement des appels directs d'APIs par un fetch unique à notre proxy `/api/geolocation` avec timeout.
- Passage de la fonction `handleCountryChange` et de `COUNTRIES` en props à `DesktopHeader`.

### 📄 [DesktopHeader.js](file:///c:/Users/NGALAMO/Desktop/tous/pratiqueHTML/client/src/components/Header/DesktopHeader.js)
- Rendu interactif du dropdown d'adresse de livraison avec la liste de tous les pays supportés.

### 📄 [TranslationHandler.js](file:///c:/Users/NGALAMO/Desktop/tous/pratiqueHTML/client/src/components/TranslationHandler.js)
- Ajout de la désinscription automatique des Service Workers hérités au démarrage du client.

---

## Commits effectués

| Hash | Description |
|------|-------------|
| `c1d3de0` | `fix(sw): desenregistrer automatiquement les service workers herites (legacy) pour resoudre le blocage de chargement Next.js sur Safari/iPhone` |
| `db6134a` | `fix(api): ajouter des timeouts stricts sur la geolocalisation client et serveur pour eviter les blocages sur mobile` |
| `9f0b5a8` | `fix(header): implementer la detection automatique de pays par IP (via proxy backend) et la selection manuelle` |
| `b6325c8` | `fix(dashboard): tracer dynamiquement le graphe SVG d'activite et eviter le bug d'alignement/division par zero` |
| `6413e4f` | `style(footer): rendre le footer desktop plus sobre et elegant (fond neutre #111827 et accents argent/blanc)` |
| `4f41858` | `fix(header): animer le placeholder de la barre de recherche compacte (sticky) avec les messages rotatifs` |
| `3939830` | `perf(messagerie): transition progressive au pixel pres du header selon la position de scroll` |
| `2f2d8f3` | `feat: flatten dashboard sub-menus directly into main desktop and mobile headers and sync tabs reactively` |

---

## 🔒 Nouvelles Fonctionnalités de Paiement, Séquestre, Portefeuille et Navigation

### 1. Système de Paiement Interne par Séquestre MTN/Orange MoMo
*   **Paiement Séquestre** : Intégration d'un système de séquestre sécurisé. L'acheteur dépose les fonds en exécutant un code USSD généré dynamiquement sur les numéros administrateurs (MTN `681570075`, Orange `641458777` - Arthur Romi Ngalamo Kekenou).
*   **Webhooks SMS Callback** : Un endpoint de callback backend `/api/payments/sms-callback` écoute et valide les messages SMS de transferts de fonds.
*   **Ajustement de Solde** : Gestion automatique des sous-paiements (demande de complément) et sur-paiements (crédit du surplus dans le portefeuille de l'acheteur).

### 2. Livraison Sécurisée par QR Code
*   **Génération QR Code** : L'acheteur dispose d'un QR code unique de livraison (et code secret à 6 chiffres) sur sa page `/commandes`.
*   **Scan et Libération** : Le vendeur scanne ce QR code via la caméra (bibliothèque `html5-qrcode` intégrée au dashboard) pour valider la livraison et débloquer instantanément les fonds du séquestre vers son portefeuille.
*   **Facturation** : Option de téléchargement de la facture au format PDF.

### 3. Portefeuille Virtuel Vendeur (Wallet)
*   **Sécurisation par code PIN** : L'accès au solde et aux retraits est verrouillé par un code PIN à 6 chiffres configuré par le vendeur.
*   **Opérations financières** : Support des dépôts et demandes de retraits (sur numéro MoMo/Orange configuré) avec historique de transactions complet.

### 4. Demande de Statut Vendeur et Bypass
*   **Formulaire d'adhésion** : Les utilisateurs demandent à être vendeurs via un formulaire professionnel (Nom, Tél, Bio).
*   **Simulation Admin** : Bouton de simulation d'approbation instantanée en développement local.
*   **Bypass hérité** : Les anciens comptes déjà actifs avec boutique, WhatsApp ou articles publiés obtiennent automatiquement le statut approuvé.

### 5. Aplatissement des Menus de Navigation
*   **Liens directs** : Remplacement du lien unique "Tableau de Bord" dans les en-têtes desktop et mobile par les sections directes : *Espace Vendeur*, *Commandes Reçues*, *Mon Portefeuille*, *Statistiques & Métriques*, *Mon Profil*.
*   **Navigation sans rechargement** : Le dashboard écoute dynamiquement la query `tab` de l'URL via `useSearchParams()` et bascule réactivement d'onglet. La page `/dashboard` a été enveloppée dans une zone `<Suspense>` pour se conformer au rendu statique de Next.js.

---

## Vérification et Validation
- ✅ Build Next.js (`npm run build`) validé avec succès.
- ✅ Correctifs et fonctionnalités de paiement testés et validés localement sans erreurs CORS ni blocages sur iPhone.
- ✅ Navigation à plat vérifiée et validée avec succès sur Desktop et Mobile.
