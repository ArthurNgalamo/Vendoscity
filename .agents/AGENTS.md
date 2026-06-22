# Mémoire et Règles du Projet Vendoscity

Ce fichier contient l'historique des choix d'architecture clés, des correctifs critiques et des règles de développement spécifiques à ce projet.

## 🚀 Règles de Développement et Contraintes

1. **Langue du Projet :**
   - Tous les messages utilisateur, messages de commit Git, commentaires de code et documentation doivent impérativement être rédigés en **français**.

2. **Éviter le Chargement Infini sur Mobile (Safari/iOS) :**
   - **Proxy de géolocalisation :** Ne jamais appeler d'APIs de géolocalisation tierces (comme `ipapi.co` ou `freeipapi.com`) directement depuis le client. Passer systématiquement par l'endpoint proxy backend `/api/geolocation`.
   - **Timeouts stricts :** Tous les appels de requêtes réseau (côté client et serveur) doivent comporter des timeouts stricts (ex: `AbortSignal.timeout(3500)` sur le serveur et `fetchWithTimeout` à 5s sur le client) pour éviter qu'une API suspendue n'épuise le pool de connexions du navigateur et ne bloque le chargement de l'application.
   - **Nettoyage des Service Workers :** Next.js n'utilise pas de Service Worker dans ce projet. Pour éviter que d'anciens Service Workers de la version legacy n'interceptent les requêtes et ne causent des chargements infinis, le composant `TranslationHandler.js` doit désenregistrer activement tout Service Worker détecté au démarrage.

3. **Intégrité UI/UX et Design System :**
   - **Flat Premium Design :** Privilégier des thèmes sobres, modernes et épurés (par exemple, le footer de bureau utilise une couleur anthracite `#111827` mat flat avec des bordures très fines et des hover gris/blanc).
   - **Composants SVG dynamiques :** Ne jamais coder en dur des coordonnées de tracés SVG (comme le graphique d'activité du dashboard). Toujours calculer les coordonnées X et Y de manière dynamique et proportionnelle selon le nombre de points et la valeur maximale de la série de données pour s'adapter à toutes les périodes (7 jours, 30 jours, 6 mois, etc.) sans distorsion ni valeurs `NaN`.
   - **Scroll progressif :** Les transitions d'en-tête lors du défilement (comme l'en-tête de messagerie) doivent être gérées par des manipulations directes du DOM via des références (`refs`) et des transformations GPU (`transform: translateY(...)`) sans déclencher de re-renders React à chaque pixel de scroll.

## 🗄️ Choix d'Architecture

- **Marketplace WhatsApp-First & Séquestre Hybride :** La plateforme met en relation directe via WhatsApp, mais intègre également un système de paiement par tiers de confiance (séquestre) facultatif pour sécuriser les transactions de proximité.
- **Routage Next.js / Express Backend :** Le frontend Next.js redirige les requêtes d'API vers le backend Express via des rewrites dans `next.config.mjs` en production pour assurer un fonctionnement fluide en même-origine.
- **Séquestre Mobile Money (MTN/Orange) :** Réception centralisée des fonds sur les numéros administratifs de la plateforme (Arthur Romi Ngalamo Kekenou) via génération dynamique de code USSD. Détection et validation automatiques via un webhook de réception SMS (simulation de passerelle).
- **Validation Physique par QR Code :** Système de déblocage sécurisé des fonds du séquestre vers le portefeuille du vendeur via scan de QR Code de commande unique (ou code secret à 6 chiffres) par l'appareil photo du dashboard vendeur.
- **Portefeuille Vendeur Sécurisé par PIN :** Solde virtuel pour les vendeurs avec historique de transactions, système de dépôts et demandes de retraits, le tout protégé par un code d'accès PIN à 6 chiffres.
- **Aplatissement des menus (Desktop/Mobile) :** Remplacement du lien générique "Tableau de Bord" par des liens directs vers ses sous-onglets dans les en-têtes principaux pour une expérience utilisateur à plat. Synchronisation d'état réactive gérée via `useSearchParams` et `<Suspense>` sous Next.js.
