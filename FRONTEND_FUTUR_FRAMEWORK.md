# Vendoscity: Preparation Pour Un Framework Frontend (Sans Reecriture)

Objectif: conserver le frontend actuel (HTML/CSS/JS) tout en reduisant les points de friction pour migrer plus tard vers un framework (React/Vue/Svelte/Angular, ou un meta-framework type Next/Nuxt/SvelteKit).

Date: 2026-03-25

## Etat Actuel (Resume)

- `client/` contient un site statique multi-pages.
  - Pages: `client/pages/*.html` + `client/index.html`
  - Styles: `client/style/*.css`
  - Scripts: `client/script/*.js`
  - Header/Footer "composants": `client/components/_header.html`, `client/components/_footer.html` charges via `client/script/component-loader.js`
- `server/` est un backend Express qui expose une API REST `GET/POST/... /api/*` et sert `client/` en developpement.
- En production, `client/vercel.json` rewrite `/api/*` vers le backend (Render).
- La DB est abstraite via `server/config/db.js`:
  - Prod: Supabase
  - Dev: wrapper Postgres local

## Pourquoi C'est Difficile De Migrer Tel Quel

Les frameworks preferent:
- pas de handlers inline (`onclick="..."`) ni de grosses dependances `window.*`
- des modules et services re-utilisables (API client, storage, formatters)
- une separation "logique/metier" vs "DOM/UI"
- un point d'entree clair (bootstrap) et des initialiseurs par page

## Principes A Appliquer Des Maintenant (Sans Changer L'UI)

1. **Zero inline handlers**
   - Utiliser `addEventListener` + delegation d'evenements.
2. **Limiter les globals**
   - Autoriser `window.*` uniquement pour compatibilite temporaire, mais coder en "module interne".
3. **Separer Logique et DOM**
   - Ex: un `CartStore` (etat + actions) et une couche UI qui fait le rendu.
4. **Centraliser les acces externes**
   - 1 seul module pour `fetch` (API), 1 seul pour `localStorage`, 1 seul pour `formatCurrency`, etc.
5. **Hooks DOM stables**
   - Utiliser `data-action`, `data-id`, `data-page`, etc. Eviter d'utiliser des classes CSS comme selecteurs JS.

## Refactorings Progressifs Recommandes

### Etape 1 (faible risque, 0 tooling)

- Introduire des attributs `data-action` et une delegation d'evenements (deja applique sur certaines zones).
- Introduire une mini couche utilitaire, sans bundler:
  - `client/script/core/api.js` (wrapper fetch: JSON parse robuste, erreurs normalisees)
  - `client/script/core/storage.js` (get/set JSON + fallback)
  - `client/script/core/format.js` (format FCFA, dates)

Impact: aucun changement visuel, code plus testable et portable.

### Etape 2 (faible a moyen risque)

- Standardiser l'initialisation par page:
  - Ajouter `data-page="boutique"` (ou deduire par URL) et n'initialiser que le code necessaire.
- Extraire les "renderers" (fonctions pures qui produisent du HTML) vs "controllers" (bind events, appels API).

### Etape 3 (moyen risque, mais grosse valeur)

- Passer progressivement en ES Modules:
  - scripts en `type="module"` sur les pages
  - imports/exports pour supprimer les dependances globales

### Etape 4 (framework)

Deux strategies:
- **"Island architecture"**: garder les pages statiques et remplacer seulement des zones dynamiques (panier, dashboard) par un framework.
- **SPA/MPA full framework**: remplacer les pages par du routing framework et garder le backend API.

## Structure Cible (Compatible Migration)

Sans tout casser, on peut viser:

- `client/` (reste servit tel quel)
  - `pages/` (HTML)
  - `components/` (partials HTML)
  - `style/`
  - `script/`
    - `core/` (services purs: api, storage, format)
    - `pages/` (controllers par page: boutique, dashboard, seller, product-detail)
    - `legacy/` (scripts restants non migres)

Quand on adopte Vite/Next/Nuxt:
- `client/public/` = fichiers statiques (images, components si besoin)
- `client/src/` = framework
- l'API reste `server/` ou migre en serverless selon besoin

## Checklist "Framework-Ready"

- [ ] Plus de `onclick=` genere dans le JS
- [ ] Une seule facon d'appeler l'API (wrapper)
- [ ] Une seule facon de lire/ecrire localStorage (wrapper)
- [ ] Les scripts n'assument pas que le header/footer sont deja dans le DOM (ou ils attendent explicitement)
- [ ] Chaque page a un init unique, idempotent (peut etre appele 2 fois sans casser)

