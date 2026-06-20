# 📊 VALIDATION DES CHAMPS & SUPPORT SUPABASE

## SUPABASE CHARACTER SET SUPPORT ✓

### Types de Données & Caractères Supportés

#### 1. **TEXT** (Champs Texte)
```sql
CREATE TABLE profiles (
    first_name TEXT,      -- ✓ Tous caractères UTF-8
    last_name TEXT,       -- ✓ Accents, symboles, emojis
    phone TEXT,           -- ✓ Numéros, +, -, espaces
    bio TEXT              -- ✓ Ponctuation, sauts de ligne
);
```

| Propriété | Valeur |
|-----------|--------|
| **Charset** | UTF-8 (Unicode) |
| **Max Length** | ~1048576 caractères (1 MB) |
| **Accents** | ✓ Oui (é, à, ù, ç, etc.) |
| **Emojis** | ✓ Oui (😀, 🚀, ✅, etc.) |
| **Symboles** | ✓ Oui (!@#$%^&*()) |
| **Sauts Ligne** | ✓ Oui (\n) |
| **Espaces** | ✓ Oui (regular, non-breaking) |

**Exemples valides:**
```
✓ "Jean-Paul Dupont"      -- Traits d'union, accents
✓ "Yaoundé, Cameroun"     -- Accents, virgule
✓ "🏠 Maison"             -- Emoji
✓ "ligne 1\nligne 2"      -- Sauts de ligne
✓ "Email: test@example.fr" -- Symboles
```

---

#### 2. **EMAIL** (Champs Email)
```sql
CREATE TABLE users (
    email TEXT             -- Format RFC 5322
);
```

**Important:** Les emails doivent être en ASCII (pas de caractères accentués)

| Propriété | Valeur |
|-----------|--------|
| **Charset** | ASCII seulement |
| **Max Length** | 254 caractères |
| **Format** | user@domain.com |
| **Accents** | ✗ Non autorisés |
| **Camel Case** | ✓ Insensible (test@ex = TEST@EX) |

**Exemples valides:**
```
✓ "user+tag@domain.com"   -- Avec +
✓ "first.last@domain.co.uk" -- Points et domaines multiples
✗ "utilisateur@domaine.fr"  -- Caractères non-ASCII non recommandés
```

---

#### 3. **NUMERIC** (Champs Numéro)
```sql
CREATE TABLE orders (
    total_amount NUMERIC   -- Nombres décimaux
);
```

| Propriété | Valeur |
|-----------|--------|
| **Type** | Décimal Précis |
| **Chiffres** | 0-9 |
| **Décimal** | Oui (.) |
| **Négatif** | Oui (-) |
| **Notation Scientifique** | Non recommandée |

**Exemples valides:**
```
✓ 123
✓ 123.45
✓ -50.99
✓ 0.01
```

---

#### 4. **TEL** (Champs Téléphone)
```sql
CREATE TABLE sellers (
    whatsapp TEXT         -- Format international
);
```

| Propriété | Valeur |
|-----------|--------|
| **Format** | International (+XXX...) |
| **Caractères** | 0-9, +, -, (, ), espace |
| **Min Chiffres** | 10 |
| **Max Length** | 20 caractères |

**Exemples valides:**
```
✓ "+237681570075"        -- Avec indicatif
✓ "+33 6 12 34 56 78"    -- Espaces groupés
✓ "+1 (555) 123-4567"    -- Format américain
✓ "06 12 34 56 78"       -- Format local (si contexte clair)
```

---

## SYSTÈME DE VALIDATION CLIENT ✓

### Architecture

Le système utilise **3 niveaux de validation:**

1. **Validation en temps réel** (pendant la saisie)
   - Indicateurs visuels instantanés
   - Barres de progression
   - Types de caractères détectés

2. **Validation au blur** (quand le champ perd le focus)
   - Vérification complète du format
   - Messages d'erreur spécifiques

3. **Validation au submit** (avant envoi)
   - Vérification finale de tous les champs
   - Blocage du formulaire si invalide

---

### Indicateurs Visuels

#### 🟢 **Champ Valide**
```css
background-color: #f0fff4;
border-color: #28a745;
background-image: ✓ (checkmark)
```

#### 🔴 **Champ Invalide**
```css
background-color: #fff5f5;
border-color: #dc3545;
background-image: ⚠ (circled exclamation)
```

#### 🟡 **Champ Avertissement**
```css
background-color: #fffbf0;
border-color: #ffc107;
```

---

### Barres de Progression

Chaque champ affiche sa complétude:

```
[████░░░░] 40% - Email (4 caract.)
[██████░░] 60% - Nom (12 caract./20 max)
[██████████] 100% - Bio complet
```

---

### Indicateurs de Type de Caractère

Pour chaque champ, les types de caractères détectés s'affichent:

**Exemple - Prénom "Jean-Paul":**
```
[A-Z active]  [Space]  [Accents]  [Digits]
  active        --       --         --
```

**Exemple - Email "user+tag@domain.com":**
```
[Format active]  [Domaine active]
   ✓ valid          ✓ valide
```

**Exemple - Téléphone "+237 681 570 075":**
```
[0-9 active]  [+- active]  [Spaces active]
   ✓ 15 ch.      ✓ +,()       ✓ yes
```

---

## RÈGLES DE VALIDATION PAR CHAMP

### 📝 Champs Texte (Prénom, Nom, Ville, etc.)

```javascript
{
  maxLength: 50,
  supportedChars: "Lettres, accents, espaces",
  regex: "Aucune restriction (UTF-8 libre)",
  examples: ["Jean", "Jean-Paul", "Émile", "José María"]
}
```

**Validation:**
- ✓ Accepte letters a-zA-Z
- ✓ Accepte accents àâäéèêëïîôòùûüœæçÀÂÄÉÈÊËÏÎÔÒÙÛÜŒÆÇ
- ✓ Accepte espaces
- ✓ Accepte tirets et apostrophes (Jean-Paul, O'Brien)
- ✗ Rejette valeurs vides

---

### 📧 Champs Email

```javascript
{
  maxLength: 254,
  pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  supportedChars: "ASCII seulement",
  examples: [
    "user@domain.com",
    "first.last@domain.co.uk",
    "user+tag@domain.com"
  ]
}
```

**Validation:**
- ✓ Format: user@domain.topleveldomain
- ✓ Contient exactement 1 @
- ✓ Domaine avec au moins 1 .
- ✓ Pas d'espaces
- ✗ Pas d'accents (ASCII seulement)
- ✗ Pas d'espaces internes

---

### 📞 Champs Téléphone (WhatsApp)

```javascript
{
  maxLength: 20,
  minDigits: 10,  // Minimum 10 chiffres
  pattern: /^[0-9+\-\s()]*$/,
  supportedChars: "0-9, +, -, (, ), espace",
  examples: [
    "+237681570075",
    "+33 6 12 34 56 78",
    "+1 (555) 123-4567"
  ]
}
```

**Validation:**
- ✓ Minimum 10 chiffres
- ✓ Peut commencer par +
- ✓ Accepte parenthèses et tirets
- ✓ Accepte espaces (groupage)
- ✗ Pas d'autres caractères

---

### 🔐 Champs Mot de Passe

```javascript
{
  minLength: 6,
  recommendedLength: 8,
  supportedChars: "Lettres, chiffres, symboles UTF-8",
  strength: {
    weak: "Seulement lettres minuscules",
    medium: "Lettres + chiffres",
    good: "Lettres + chiffres + symboles",
    excellent: "Tous les éléments + 8+ caractères"
  },
  examples: [
    "PassWord123",
    "MyPass@2024!",
    "Çédilla#123"
  ]
}
```

**Validation:**
- ✓ Minimum 6 caractères
- ✓ Recommandé: 8+ avec mélange
- ✓ Accepte minuscules (a-z)
- ✓ Accepte majuscules (A-Z)
- ✓ Accepte chiffres (0-9)
- ✓ Accepte symboles !@#$%^&*()_+-=[]{};\:'"<>?,./
- ✓ Accepte caractères accentués
- ✗ Pas de champ vide

**Indicateur Force:**
```
Très faible  (a) ────────────────── ✗
Faible       (aA1) ────────────────── ◐
Moyen        (aA1!) ────────────────── ◑
Bon          (aA1@2) ────────────────── ◕
Excellent    (aA1@2#3!) ────────────────── ✓
```

---

### 💰 Champs Numérique (Prix)

```javascript
{
  pattern: /^[0-9]*\.?[0-9]*$/,
  decimals: true,
  negative: false,
  examples: ["99.99", "1000", "0.50"]
}
```

**Validation:**
- ✓ Chiffres 0-9
- ✓ Un seul point (.) pour décimales
- ✓ Automatiquement converti en float
- ✗ Pas de symboles (€, $, etc.)
- ✗ Pas de lettres

---

### 🏠 Champs Adresse

```javascript
{
  minLength: 10,
  maxLength: 200,
  supportedChars: "Lettres, chiffres, symboles, accents",
  examples: [
    "123 Rue de la Paix",
    "Quartier Mimboman, Yaoundé",
    "Immeuble A, Apt. 5B"
  ]
}
```

**Validation:**
- ✓ Minimum 10 caractères
- ✓ Maximum 200 caractères
- ✓ Accepte tous types de caractères (UTF-8)
- ✓ Accepte virgules, points, tirets
- ✗ Champ vide rejeté

---

## MESSAGES D'ERREUR PERSONNALISÉS

### Affichage Contextuel

```javascript
// Email vide
❌ "Ce champ est requis"

// Email sans @
❌ "Format email invalide (ex: user@domain.com)"

// Téléphone < 10 chiffres
❌ "Au minimum 10 chiffres (vous en avez 7)"

// Mot de passe faible
❌ "Mot de passe faible - Ajoutez des chiffres ou symboles"

// Format invalide
❌ "Format invalide (accepte: 0-9, +, -, espaces)"
```

---

## INTÉGRATION SUPABASE

### Flux de Données

```
Client (Validation HTML5) 
  ↓
Client JS (FieldValidator)
  ↓ [Validation échoue → Affiche erreur & bloque]
  ↓ [Validation réussie → Envoie API]
API (Express Routes)
  ↓ [Re-validation côté serveur]
  ↓ [Encode en UTF-8 pour Supabase]
Supabase (Base de Données)
  ↓ [Stocke en UTF-8 natif]
Récupération
  ↓ [Retourne UTF-8 décodé]
  ↓
Client [Affiche avec accents & caractères spéciaux]
```

---

### Conversion Charset

**Node.js → Supabase (Automatic):**
```javascript
// Client envoie
{ name: "Émile José", city: "Yaoundé" }

// Express reçoit en UTF-8
req.body = { name: "Émile José", city: "Yaoundé" }

// Supabase stocke
TEXT: "Émile José"  -- UTF-8 natif
TEXT: "Yaoundé"     -- UTF-8 natif

// Client récupère décodé
response.data = { name: "Émile José", city: "Yaoundé" }
```

---

### Requêtes Supabase

```javascript
// Insert avec UTF-8
const { data, error } = await supabase
  .from('profiles')
  .insert([
    { 
      first_name: 'Émile',      // ✓ UTF-8 automatique
      bio: 'J\'aime les émojis 🚀'  // ✓ Emojis supportés
    }
  ])

// Select récupère UTF-8
const { data } = await supabase
  .from('profiles')
  .select('*')
// Retourne: [{ first_name: 'Émile', bio: 'J\'aime les émojis 🚀' }]

// Filter par accent
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('city', 'Yaoundé')  // ✓ Fonctionne avec accents
```

---

## CHECKLIST DE SÉCURITÉ

✅ **Validation Client** - Réduit appels API inutiles
✅ **Validation Serveur** - Évite bypass du client
✅ **Charset UTF-8** - Accepte tous caractères légitimes
✅ **Max Length** - Évite dépassements base données
✅ **Messages Clairs** - Aide utilisateur à corriger
✅ **Indicateurs Visuels** - Feedback instantané
✅ **Barres Progress** - Montre complétude
✅ **Support Accents** - Respecte tous les pays

---

## EXEMPLES FORMULAIRE COMPLET

### HTML Formfield avec Validations
```html
<div class="form-group">
  <label for="firstName">Prénom 
    <span class="field-hint">(max 50 caractères)</span>
  </label>
  <input 
    type="text" 
    id="firstName" 
    placeholder="Votre prénom" 
    maxlength="50" 
    data-validate="text" 
    required
  >
  <!-- Barre de progression -->
  <div class="field-progress" style="display: none;">
    <div class="progress-bar">
      <div class="progress-fill" style="width: 0%"></div>
    </div>
    <div class="progress-percentage">0%</div>
  </div>
  <!-- Indicateurs types -->
  <div class="char-types">
    <span class="char-indicator" data-type="letters">A-Z</span>
    <span class="char-indicator" data-type="space">Espace</span>
    <span class="char-indicator" data-type="special-allowed">Accents</span>
  </div>
  <!-- Messages erreur/succès -->
  <div class="field-error">
    <i data-lucide="alert-circle"></i> 
    <span></span>
  </div>
  <div class="field-success">
    <i data-lucide="check-circle"></i> 
    <span></span>
  </div>
</div>
```

### JavaScript Validation
```javascript
// Validation automatique à chaque input
document.addEventListener('DOMContentLoaded', () => {
  FieldValidator.init();  // Initialise tous les champs
});

// Résultat validation par champ
const result = FieldValidator.validateField(inputElement);
// {
//   isValid: true/false,
//   progress: 80,
//   charTypes: { letters: true, space: true, ... },
//   supportedChars: "Lettres, accents, espaces"
// }
```

---

## DÉPLOIEMENT

### Variables d'Environnement
```env
# .env.local (development)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxpsupabase.co
NEXT_PUBLIC_SUPABASE_KEY=eyJhbGciOiJIUzI1NiJ...

# NODE_ENV
NODE_ENV=development  # Mock Auth (UTF-8 libre)
NODE_ENV=production   # Supabase (UTF-8 natif)
```

---

## RÉSUMÉ

| Aspect | Status | Détail |
|--------|--------|--------|
| **UTF-8 Support** | ✓ Complet | Tous champs TEXT supportent UTF-8 natif |
| **Accents** | ✓ Oui | éàùçêôîûœæ tous supportés |
| **Emojis** | ✓ Oui | 😀 🚀 ✅ tous supportés |
| **Validation Client** | ✓ Temps réel | Barre progression + indicateurs |
| **Validation Serveur** | ✓ Doublée | Re-validation côté Express |
| **Longueur Max** | ✓ Configurée | TEXT=1MB, EMAIL=254, PHONE=20 |
| **Sécurité** | ✓ Renforcée | Validation + encoding natif |
| **UX** | ✓ Optimisée | Visuels instantanés + messages clairs |

---

**Dernière mise à jour:** 24 Mars 2026 | Version 1.0
