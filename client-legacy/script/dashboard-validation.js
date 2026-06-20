/**
 * VALIDATION DES CHAMPS DASHBOARD
 * Support complet UTF-8 pour Supabase
 * ✓ TEXT: Tous caractères UTF-8 supportés
 * ✓ NUMERIC: Nombres décimaux avec validation
 * ✓ Email: Format RFC 5322 standard
 */

const FieldValidator = {
  // Types de données Supabase supportées
  SUPABASE_TYPES: {
    TEXT: { 
      maxLength: 1000000, // Pratiquement illimité
      charsetUTF8: true,
      allowSpecial: true,
      allowAccents: true,
      example: 'Prénom, Nom, Bio, Adresse, etc.'
    },
    EMAIL: {
      maxLength: 254,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      charsetUTF8: false, // Email est ASCII seulement
      allowSpecial: false,
    },
    TEL: {
      maxLength: 20,
      pattern: /^[0-9+\-\s()]*$/,
      allowDigits: true,
      allowSymbols: ['+', '-', '(', ')', ' '],
    },
    NUMERIC: {
      pattern: /^[0-9]*\.?[0-9]*$/,
      allowDecimals: true,
    }
  },

  /**
   * Validateurs spécifiques pour chaque type de champ
   */
  validators: {
    text: function(value) {
      return {
        isValid: value.length > 0,
        isEmpty: value.length === 0,
        length: value.length,
        maxLength: 50,
        charTypes: {
          letters: /[a-zA-Z]/.test(value),
          accents: /[àâäéèêëïîôòùûüœæçÀÂÄÉÈÊËÏÎÔÒÙÛÜŒÆÇ]/.test(value),
          space: /\s/.test(value),
          digits: /\d/.test(value),
          special: /[!@#$%^&*()_+=\[\]{};:'",.<>?/\\|`~-]/.test(value),
        },
        supportsUTF8: true,
        supportedChars: 'Tout caractère UTF-8 (lettres, chiffres, accents, symboles)',
        progress: (value.length / 50) * 100,
      };
    },

    email: function(value) {
      const hasEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      const [localPart, domain] = value.split('@');
      return {
        isValid: hasEmail && value.length <= 254,
        isEmpty: value.length === 0,
        length: value.length,
        maxLength: 254,
        charTypes: {
          email: hasEmail,
          domain: domain ? domain.includes('.') : false,
          local: localPart ? localPart.length > 0 : false,
        },
        format: hasEmail ? 'Valide' : 'Format invalide',
        supportsUTF8: false, // Email est ASCII seulement
        supportedChars: 'ASCII seulement (a-z, 0-9, ., +, -)',
        progress: hasEmail ? 100 : (value.includes('@') ? 50 : 0),
      };
    },

    phone: function(value) {
      const phonePattern = /^[0-9+\-\s()]*$/;
      const digitsOnly = value.replace(/\D/g, '');
      const minDigits = 9; // Changé de 10 à 9 pour le Cameroun
      const isValid = phonePattern.test(value) && digitsOnly.length >= minDigits;
      return {
        isValid: isValid,
        isEmpty: value.length === 0,
        length: value.length,
        maxLength: 20,
        charTypes: {
          digits: /\d/.test(value),
          symbols: /[+\-()]/.test(value),
          spaces: /\s/.test(value),
        },
        digitsCount: digitsOnly.length,
        minDigits: minDigits,
        supportsUTF8: false,
        supportedChars: `Chiffres (0-9), + - ( ) (min ${minDigits} chiffres)`,
        progress: Math.min((digitsOnly.length / minDigits) * 100, 100),
      };
    },

    password: function(value) {
      const hasLower = /[a-z]/.test(value);
      const hasUpper = /[A-Z]/.test(value);
      const hasDigits = /\d/.test(value);
      const hasSpecial = /[!@#$%^&*()_+=\[\]{};:'",.<>?/\\|`~-]/.test(value);
      const strength = [hasLower, hasUpper, hasDigits, hasSpecial].filter(Boolean).length;
      
      return {
        isValid: value.length >= 8,
        isEmpty: value.length === 0,
        length: value.length,
        minLength: 8,
        charTypes: {
          lowercase: hasLower,
          uppercase: hasUpper,
          digits: hasDigits,
          special: hasSpecial,
        },
        strength: strength,
        strengthLabel: ['Très faible', 'Faible', 'Moyen', 'Bon', 'Excellent'][strength] || 'Très faible',
        supportsUTF8: true,
        supportedChars: 'Lettres, chiffres, symboles',
        progress: Math.min((value.length / 8) * 100, 100),
      };
    },

    address: function(value) {
      const minLength = 10;
      return {
        isValid: value.length >= minLength,
        isEmpty: value.length === 0,
        length: value.length,
        minLength: minLength,
        maxLength: 200,
        charTypes: {
          letters: /[a-zA-Z]/.test(value),
          digits: /\d/.test(value),
          comma: /,/.test(value),
          space: /\s/.test(value),
        },
        supportsUTF8: true,
        supportedChars: 'Lettres, chiffres, virgules, accents',
        progress: (value.length / minLength) * 100,
      };
    },

    numeric: function(value) {
      const numericPattern = /^[0-9]*\.?[0-9]*$/;
      const isValid = numericPattern.test(value) && value.length > 0;
      return {
        isValid: isValid,
        isEmpty: value.length === 0,
        value: parseFloat(value) || 0,
        charTypes: {
          digits: /\d/.test(value),
          decimal: /\./.test(value),
        },
        supportsUTF8: false,
        supportedChars: 'Chiffres (0-9) et point décimal',
        progress: isValid ? 100 : 0,
      };
    },
  },

  /**
   * Initialiser les validateurs sur tous les champs
   */
  init: function() {
    const inputs = document.querySelectorAll('[data-validate]');
    inputs.forEach(input => {
      input.addEventListener('input', () => this.validateField(input));
      input.addEventListener('blur', () => this.validateField(input));
      input.addEventListener('focus', () => this.showProgress(input));
    });

    // Lucide icons (réinitialiser après insertion)
    setTimeout(() => {
      if (typeof lucide !== 'undefined') {
    if (window.lucide) lucide.createIcons();
      }
    }, 100);
  },

  /**
   * Valider un champ spécifique
   */
  validateField: function(input) {
    const validateType = input.dataset.validate;
    const value = input.value.trim();
    const validatorFn = this.validators[validateType];

    if (!validatorFn) {
      console.warn(`Validateur '${validateType}' non trouvé`);
      return;
    }

    const result = validatorFn.call(this, value);
    this.updateFieldUI(input, result);
    return result;
  },

  /**
   * Mettre à jour l'interface du champ
   */
  updateFieldUI: function(input, result) {
    const group = input.closest('.form-group');
    if (!group) return;

    // Classe de validation
    if (input.value.length === 0) {
      input.classList.remove('valid', 'invalid', 'warning');
    } else if (result.isValid) {
      input.classList.add('valid');
      input.classList.remove('invalid', 'warning');
    } else {
      input.classList.add('invalid');
      input.classList.remove('valid', 'warning');
    }

    // Mise à jour barre de progression
    const progressContainer = group.querySelector('.field-progress');
    if (progressContainer) {
      const progressFill = progressContainer.querySelector('.progress-fill');
      const progressPercentage = progressContainer.querySelector('.progress-percentage');
      
      if (input.value.length > 0) {
        progressContainer.style.display = 'flex';
        progressFill.style.width = Math.min(result.progress, 100) + '%';
        progressPercentage.textContent = Math.round(result.progress) + '%';
      } else {
        progressContainer.style.display = 'none';
      }
    }

    // Mise à jour indicateurs de caractères
    const charTypes = group.querySelectorAll('.char-indicator');
    charTypes.forEach(indicator => {
      const type = indicator.dataset.type;
      const isActive = result.charTypes && result.charTypes[type];
      
      if (isActive) {
        indicator.classList.add('active');
      } else {
        indicator.classList.remove('active');
      }
    });

    // Messages d'erreur/succès
    const errorEl = group.querySelector('.field-error');
    const successEl = group.querySelector('.field-success');

    if (input.value.length === 0) {
      if (errorEl) {
        errorEl.classList.remove('show');
        errorEl.querySelector('span').textContent = '';
      }
      if (successEl) {
        successEl.classList.remove('show');
      }
    } else if (result.isValid) {
      if (successEl) {
        successEl.classList.add('show');
        // Use SVG icon instead of emoji/checkmark.
        const span = successEl.querySelector('span');
        if (span) {
          span.innerHTML = '<i class="inline-icon" data-lucide="check-circle"></i> Valide';
          if (window.lucide) lucide.createIcons();
        }
      }
      if (errorEl) {
        errorEl.classList.remove('show');
        errorEl.querySelector('span').textContent = '';
      }
    } else {
      if (errorEl) {
        errorEl.classList.add('show');
        errorEl.querySelector('span').textContent = this.getErrorMessage(input.dataset.validate, result);
      }
      if (successEl) {
        successEl.classList.remove('show');
      }
    }
  },

  /**
   * Afficher la barre de progression au focus
   */
  showProgress: function(input) {
    const group = input.closest('.form-group');
    if (!group) return;
    
    const progressContainer = group.querySelector('.field-progress');
    if (progressContainer && input.value.length > 0) {
      progressContainer.style.display = 'flex';
    }
  },

  /**
   * Messages d'erreur personnalisés
   */
  getErrorMessage: function(type, result) {
    const messages = {
      text: () => {
        if (result.isEmpty) return 'Ce champ est requis';
        return 'Contient des caractères non autorisés';
      },
      email: () => {
        if (result.isEmpty) return 'Ce champ est requis';
        if (!result.charTypes.email) return 'Format email invalide (ex: user@domain.com)';
        return 'Email invalide';
      },
      phone: () => {
        if (result.digitsCount < result.minDigits) {
          return `Au minimum ${result.minDigits} chiffres (vous en avez ${result.digitsCount})`;
        }
        return 'Format téléphone invalide (ex: +237681570075)';
      },
      password: () => {
        if (result.length < result.minLength) return `Minimum ${result.minLength} caractères`;
        return 'Mot de passe faible - Ajoutez des majuscules, chiffres ou symboles';
      },
      numeric: () => {
        if (result.isEmpty) return 'Entrez un nombre';
        return 'Format numérique invalide';
      },
    };

    return messages[type] ? messages[type]() : 'Valeur invalide';
  },

  /**
   * Logs de débogage (Supabase charset support)
   */
  logSupabaseInfo: function() {
    console.group('Supabase CHARACTER SET SUPPORT');
    Object.entries(this.SUPABASE_TYPES).forEach(([type, config]) => {
      console.log(`\n- ${type}:`);
      console.log(`   Max Length: ${config.maxLength}`);
      console.log(`   UTF-8: ${config.charsetUTF8 ? 'Oui' : 'Non (ASCII seulement)'}`);
      console.log(`   Caractères accentués: ${config.allowAccents ? 'Oui' : 'Non'}`);
      console.log(`   Caractères spéciaux: ${config.allowSpecial ? 'Oui' : 'Non'}`);
      console.log(`   Exemple: ${config.example || config.supportedChars}`);
    });
    console.groupEnd();
  },
};

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
  FieldValidator.init();
  FieldValidator.logSupabaseInfo();
});
