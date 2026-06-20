/**
 * COUNTRY PHONE CODE SELECTOR
 * Sélecteur moderne avec recherche, drapeaux et indicatifs
 */

const CountryPhoneSelector = {
  countries: [
    // AFRIQUE DU NORD
    { code: 'DZ', name: 'Algérie', flag: '🇩🇿', dial: '+213', pattern: '^\\d{8,9}$' },
    { code: 'EG', name: 'Égypte', flag: '🇪🇬', dial: '+20', pattern: '^\\d{9,10}$' },
    { code: 'LY', name: 'Libye', flag: '🇱🇾', dial: '+218', pattern: '^\\d{8,9}$' },
    { code: 'MA', name: 'Maroc', flag: '🇲🇦', dial: '+212', pattern: '^\\d{9}$' },
    { code: 'SD', name: 'Soudan', flag: '🇸🇩', dial: '+249', pattern: '^\\d{9}$' },
    { code: 'TN', name: 'Tunisie', flag: '🇹🇳', dial: '+216', pattern: '^\\d{8}$' },
    { code: 'EH', name: 'Sahara Occidental', flag: '🇪🇭', dial: '+212', pattern: '^\\d{9}$' },

    // AFRIQUE DE L'OUEST
    { code: 'BJ', name: 'Bénin', flag: '🇧🇯', dial: '+229', pattern: '^\\d{8}$' },
    { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫', dial: '+226', pattern: '^\\d{8}$' },
    { code: 'CV', name: 'Cap-Vert', flag: '🇨🇻', dial: '+238', pattern: '^\\d{7}$' },
    { code: 'CI', name: 'Côte d\'Ivoire', flag: '🇨🇮', dial: '+225', pattern: '^\\d{8,10}$' },
    { code: 'GM', name: 'Gambie', flag: '🇬🇲', dial: '+220', pattern: '^\\d{7}$' },
    { code: 'GH', name: 'Ghana', flag: '🇬🇭', dial: '+233', pattern: '^\\d{9}$' },
    { code: 'GN', name: 'Guinée', flag: '🇬🇳', dial: '+224', pattern: '^\\d{9}$' },
    { code: 'GW', name: 'Guinée-Bissau', flag: '🇬🇼', dial: '+245', pattern: '^\\d{7}$' },
    { code: 'LR', name: 'Liberia', flag: '🇱🇷', dial: '+231', pattern: '^\\d{7,8}$' },
    { code: 'ML', name: 'Mali', flag: '🇲🇱', dial: '+223', pattern: '^\\d{8}$' },
    { code: 'MR', name: 'Mauritanie', flag: '🇲🇷', dial: '+222', pattern: '^\\d{8}$' },
    { code: 'NE', name: 'Niger', flag: '🇳🇪', dial: '+227', pattern: '^\\d{8}$' },
    { code: 'NG', name: 'Nigéria', flag: '🇳🇬', dial: '+234', pattern: '^\\d{10}$' },
    { code: 'SN', name: 'Sénégal', flag: '🇸🇳', dial: '+221', pattern: '^\\d{9}$' },
    { code: 'SL', name: 'Sierra Leone', flag: '🇸🇱', dial: '+232', pattern: '^\\d{8}$' },
    { code: 'TG', name: 'Togo', flag: '🇹🇬', dial: '+228', pattern: '^\\d{8}$' },

    // AFRIQUE CENTRALE
    { code: 'AO', name: 'Angola', flag: '🇦🇴', dial: '+244', pattern: '^\\d{9}$' },
    { code: 'CM', name: 'Cameroun', flag: '🇨🇲', dial: '+237', pattern: '^\\d{9}$' },
    { code: 'CF', name: 'Centrafrique', flag: '🇨🇫', dial: '+236', pattern: '^\\d{8}$' },
    { code: 'TD', name: 'Tchad', flag: '🇹🇩', dial: '+235', pattern: '^\\d{8}$' },
    { code: 'CG', name: 'Congo-Brazzaville', flag: '🇨🇬', dial: '+242', pattern: '^\\d{9}$' },
    { code: 'CD', name: 'Congo-Kinshasa (RDC)', flag: '🇨🇩', dial: '+243', pattern: '^\\d{9}$' },
    { code: 'GQ', name: 'Guinée Équatoriale', flag: '🇬🇶', dial: '+240', pattern: '^\\d{9}$' },
    { code: 'GA', name: 'Gabon', flag: '🇬🇦', dial: '+241', pattern: '^\\d{7,8}$' },
    { code: 'ST', name: 'Sao Tomé-et-Principe', flag: '🇸🇹', dial: '+239', pattern: '^\\d{7}$' },

    // AFRIQUE DE L'EST
    { code: 'BI', name: 'Burundi', flag: '🇧🇮', dial: '+257', pattern: '^\\d{8}$' },
    { code: 'KM', name: 'Comores', flag: '🇰🇲', dial: '+269', pattern: '^\\d{7}$' },
    { code: 'DJ', name: 'Djibouti', flag: '🇩🇯', dial: '+253', pattern: '^\\d{8}$' },
    { code: 'ER', name: 'Érythrée', flag: '🇪🇷', dial: '+291', pattern: '^\\d{7}$' },
    { code: 'ET', name: 'Éthiopie', flag: '🇪🇹', dial: '+251', pattern: '^\\d{9}$' },
    { code: 'KE', name: 'Kenya', flag: '🇰🇪', dial: '+254', pattern: '^\\d{9}$' },
    { code: 'MG', name: 'Madagascar', flag: '🇲🇬', dial: '+261', pattern: '^\\d{9}$' },
    { code: 'MW', name: 'Malawi', flag: '🇲🇼', dial: '+265', pattern: '^\\d{7,9}$' },
    { code: 'MU', name: 'Maurice', flag: '🇲🇺', dial: '+230', pattern: '^\\d{7,8}$' },
    { code: 'YT', name: 'Mayotte', flag: '🇾🇹', dial: '+262', pattern: '^\\d{9}$' },
    { code: 'MZ', name: 'Mozambique', flag: '🇲🇿', dial: '+258', pattern: '^\\d{8,9}$' },
    { code: 'RW', name: 'Rwanda', flag: '🇷🇼', dial: '+250', pattern: '^\\d{9}$' },
    { code: 'SC', name: 'Seychelles', flag: '🇸🇨', dial: '+248', pattern: '^\\d{7}$' },
    { code: 'SO', name: 'Somalie', flag: '🇸🇴', dial: '+252', pattern: '^\\d{8,9}$' },
    { code: 'SS', name: 'Soudan du Sud', flag: '🇸🇸', dial: '+211', pattern: '^\\d{9}$' },
    { code: 'TZ', name: 'Tanzanie', flag: '🇹🇿', dial: '+255', pattern: '^\\d{9}$' },
    { code: 'UG', name: 'Ouganda', flag: '🇺🇬', dial: '+256', pattern: '^\\d{9}$' },

    // AFRIQUE AUSTRALE
    { code: 'BW', name: 'Botswana', flag: '🇧🇼', dial: '+267', pattern: '^\\d{7,8}$' },
    { code: 'LS', name: 'Lesotho', flag: '🇱🇸', dial: '+266', pattern: '^\\d{8}$' },
    { code: 'NA', name: 'Namibie', flag: '🇳🇦', dial: '+264', pattern: '^\\d{8,9}$' },
    { code: 'ZA', name: 'Afrique du Sud', flag: '🇿🇦', dial: '+27', pattern: '^\\d{9}$' },
    { code: 'SZ', name: 'Eswatini', flag: '🇸🇿', dial: '+268', pattern: '^\\d{7,8}$' },
    { code: 'ZM', name: 'Zambie', flag: '🇿🇲', dial: '+260', pattern: '^\\d{9}$' },
    { code: 'ZW', name: 'Zimbabwe', flag: '🇿🇼', dial: '+263', pattern: '^\\d{9}$' },

    // EUROPE
    { code: 'FR', name: 'France', flag: '🇫🇷', dial: '+33', pattern: '^\\d{9}$' },
    { code: 'BE', name: 'Belgique', flag: '🇧🇪', dial: '+32', pattern: '^\\d{8,9}$' },
    { code: 'CH', name: 'Suisse', flag: '🇨🇭', dial: '+41', pattern: '^\\d{9}$' },
    { code: 'DE', name: 'Allemagne', flag: '🇩🇪', dial: '+49', pattern: '^\\d{10,11}$' },
    { code: 'GB', name: 'Royaume-Uni', flag: '🇬🇧', dial: '+44', pattern: '^\\d{10}$' },
    { code: 'IT', name: 'Italie', flag: '🇮🇹', dial: '+39', pattern: '^\\d{10}$' },
    { code: 'ES', name: 'Espagne', flag: '🇪🇸', dial: '+34', pattern: '^\\d{9}$' },
    { code: 'PT', name: 'Portugal', flag: '🇵🇹', dial: '+351', pattern: '^\\d{9}$' },
    { code: 'NL', name: 'Pays-Bas', flag: '🇳🇱', dial: '+31', pattern: '^\\d{9}$' },
    { code: 'LU', name: 'Luxembourg', flag: '🇱🇺', dial: '+352', pattern: '^\\d{8,9}$' },
    { code: 'IE', name: 'Irlande', flag: '🇮🇪', dial: '+353', pattern: '^\\d{7,9}$' },
    { code: 'AT', name: 'Autriche', flag: '🇦🇹', dial: '+43', pattern: '^\\d{10,11}$' },
    { code: 'SE', name: 'Suède', flag: '🇸🇪', dial: '+46', pattern: '^\\d{9}$' },
    { code: 'NO', name: 'Norvège', flag: '🇳🇴', dial: '+47', pattern: '^\\d{8}$' },
    { code: 'DK', name: 'Danemark', flag: '🇩🇰', dial: '+45', pattern: '^\\d{8}$' },
    { code: 'FI', name: 'Finlande', flag: '🇫🇮', dial: '+358', pattern: '^\\d{5,12}$' },
    { code: 'PL', name: 'Pologne', flag: '🇵🇱', dial: '+48', pattern: '^\\d{9}$' },
    { code: 'RO', name: 'Roumanie', flag: '🇷🇴', dial: '+40', pattern: '^\\d{9}$' },
    { code: 'TR', name: 'Turquie', flag: '🇹🇷', dial: '+90', pattern: '^\\d{10}$' },
    { code: 'RU', name: 'Russie', flag: '🇷🇺', dial: '+7', pattern: '^\\d{10}$' },
    { code: 'UA', name: 'Ukraine', flag: '🇺🇦', dial: '+380', pattern: '^\\d{9}$' },

    // AMÉRIQUES
    { code: 'US', name: 'États-Unis', flag: '🇺🇸', dial: '+1', pattern: '^\\d{10}$' },
    { code: 'CA', name: 'Canada', flag: '🇨🇦', dial: '+1', pattern: '^\\d{10}$' },
    { code: 'BR', name: 'Brésil', flag: '🇧🇷', dial: '+55', pattern: '^\\d{10,11}$' },
    { code: 'AR', name: 'Argentine', flag: '🇦🇷', dial: '+54', pattern: '^\\d{10}$' },
    { code: 'MX', name: 'Mexique', flag: '🇲🇽', dial: '+52', pattern: '^\\d{10}$' },
    { code: 'CO', name: 'Colombie', flag: '🇨🇴', dial: '+57', pattern: '^\\d{10}$' },
    { code: 'CL', name: 'Chili', flag: '🇨🇱', dial: '+56', pattern: '^\\d{9}$' },
    { code: 'PE', name: 'Pérou', flag: '🇵🇪', dial: '+51', pattern: '^\\d{9}$' },
    { code: 'HT', name: 'Haïti', flag: '🇭🇹', dial: '+509', pattern: '^\\d{8}$' },

    // ASIE & OCÉANIE
    { code: 'CN', name: 'Chine', flag: '🇨🇳', dial: '+86', pattern: '^\\d{11}$' },
    { code: 'IN', name: 'Inde', flag: '🇮🇳', dial: '+91', pattern: '^\\d{10}$' },
    { code: 'JP', name: 'Japon', flag: '🇯🇵', dial: '+81', pattern: '^\\d{10}$' },
    { code: 'KR', name: 'Corée du Sud', flag: '🇰🇷', dial: '+82', pattern: '^\\d{9,10}$' },
    { code: 'AU', name: 'Australie', flag: '🇦🇺', dial: '+61', pattern: '^\\d{9}$' },
    { code: 'NZ', name: 'Nouvelle-Zélande', flag: '🇳🇿', dial: '+64', pattern: '^\\d{8,10}$' },
    { code: 'AE', name: 'Émirats Arabes Unis', flag: '🇦🇪', dial: '+971', pattern: '^\\d{9}$' },
    { code: 'SA', name: 'Arabie Saoudite', flag: '🇸🇦', dial: '+966', pattern: '^\\d{9}$' },
    { code: 'QA', name: 'Qatar', flag: '🇶🇦', dial: '+974', pattern: '^\\d{8}$' },
    { code: 'IL', name: 'Israël', flag: '🇮🇱', dial: '+972', pattern: '^\\d{8,9}$' },
    { code: 'VN', name: 'Vietnam', flag: '🇻🇳', dial: '+84', pattern: '^\\d{9,10}$' },
    { code: 'TH', name: 'Thaïlande', flag: '🇹🇭', dial: '+66', pattern: '^\\d{9}$' }
  ],

  /**
   * Initialiser un sélecteur de pays
   */
  init: function(inputElementOrSelector) {
    const input = typeof inputElementOrSelector === 'string' 
      ? document.querySelector(inputElementOrSelector) 
      : inputElementOrSelector;
      
    if (!input || input.dataset.selectorInitialized) return;

    // Marquer l'élément pour éviter les doubles initialisations
    input.dataset.selectorInitialized = 'true';

    // Créer le wrapper si nécessaire
    let wrapper = input.parentElement;
    if (!wrapper.classList.contains('phone-selector-wrapper')) {
      const newWrapper = document.createElement('div');
      newWrapper.className = 'phone-selector-wrapper';
      input.parentElement.insertBefore(newWrapper, input);
      newWrapper.appendChild(input);
      wrapper = newWrapper;
    }

    // Supprimer tout ancien sélecteur existant dans ce wrapper
    const oldSelector = wrapper.querySelector('.country-selector');
    if (oldSelector) oldSelector.remove();

    // Créer un wrapper pour l'input et le sélecteur si nécessaire
    let phoneWrapper = input.parentElement;
    if (!phoneWrapper.classList.contains('phone-selector-wrapper')) {
      const newWrapper = document.createElement('div');
      newWrapper.className = 'phone-selector-wrapper';
      input.parentNode.insertBefore(newWrapper, input);
      newWrapper.appendChild(input);
      phoneWrapper = newWrapper;
    }

    // Créer le nouveau sélecteur de pays
    const selector = document.createElement('div');
    selector.className = 'country-selector';
    selector.innerHTML = `
      <button type="button" class="country-trigger" tabindex="0">
        <span class="country-flag" aria-hidden="true">🇨🇲</span>
        <span class="country-code">${input.dataset.dial || '+237'}</span>
        <i data-lucide="chevron-down" width="16" height="16"></i>
      </button>
      <div class="country-dropdown">
        <div class="country-search">
          <input type="text" placeholder="Chercher un pays..." class="country-search-input">
        </div>
        <div class="country-list"></div>
      </div>
    `;

    phoneWrapper.insertBefore(selector, input);
    input.classList.add('phone-input');

    // Événements
    this.attachEvents(selector, input);
    this.populateCountries(selector);
    
    // Initialiser avec la valeur par défaut si présente
    if (input.dataset.country) {
      this.selectCountry(selector, input, input.dataset.country);
    }

    // Lucide icons
    if (typeof lucide !== 'undefined') {
        setTimeout(() => {
            if (window.lucide) lucide.createIcons();
        }, 100);
    }
  },

  /**
   * Attacher les événements
   */
  attachEvents: function(selector, input) {
    const trigger = selector.querySelector('.country-trigger');
    const dropdown = selector.querySelector('.country-dropdown');
    const searchInput = selector.querySelector('.country-search-input');

    // Ouvrir/fermer dropdown
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Si l'input est désactivé (mode lecture seule), on ne fait rien
      if (input.disabled || input.readOnly) return;
      
      const isOpen = selector.classList.contains('open');
      
      // Fermer tous les autres d'abord
      document.querySelectorAll('.country-selector.open').forEach(s => {
        if (s !== selector) s.classList.remove('open');
      });

      selector.classList.toggle('open');
      
      if (selector.classList.contains('open')) {
        setTimeout(() => searchInput.focus(), 10);
      }
    });

    // Recherche
    searchInput.addEventListener('input', (e) => {
      this.filterCountries(selector, e.target.value);
    });

    // Sélectionner un pays
    dropdown.addEventListener('click', (e) => {
      const item = e.target.closest('.country-item');
      if (item) {
        this.selectCountry(selector, input, item.dataset.code);
        selector.classList.remove('open');
      }
    });

    // Fermer au clic extérieur
    document.addEventListener('click', (e) => {
      if (!selector.contains(e.target) && !input.contains(e.target)) {
        selector.classList.remove('open');
      }
    });

    // Formater le numéro lors de la saisie
    input.addEventListener('input', (e) => {
      this.formatPhoneNumber(input);
    });
  },

  /**
   * Remplir la liste des pays
   */
  populateCountries: function(selector) {
    const list = selector.querySelector('.country-list');
    list.innerHTML = this.countries
      .map(country => `
        <div class="country-item" data-code="${country.code}">
          <span class="flag" aria-hidden="true">${country.flag}</span>
          <span class="name">${country.name}</span>
          <span class="dial">${country.dial}</span>
        </div>
      `)
      .join('');
  },

  /**
   * Filtrer les pays
   */
  filterCountries: function(selector, query) {
    const items = selector.querySelectorAll('.country-item');
    const term = query.toLowerCase();

    items.forEach(item => {
      const name = item.querySelector('.name').textContent.toLowerCase();
      const dial = item.querySelector('.dial').textContent;
      const matches = name.includes(term) || dial.includes(term);
      item.style.display = matches ? 'flex' : 'none';
    });
  },

  /**
   * Sélectionner un pays
   */
  selectCountry: function(selector, input, countryCode) {
    const country = this.countries.find(c => c.code === countryCode);
    if (!country) return;

    const trigger = selector.querySelector('.country-trigger');
    trigger.querySelector('.country-flag').textContent = country.flag;
    trigger.querySelector('.country-code').textContent = country.dial;
    trigger.setAttribute('title', country.name);

    // Stocker le pays sélectionné
    input.dataset.country = countryCode;
    input.dataset.dial = country.dial;
    input.dataset.pattern = country.pattern;

    // Focus sur l'input
    input.focus();
  },

  /**
   * Formater le numéro de téléphone
   */
  formatPhoneNumber: function(input) {
    let value = input.value.replace(/\D/g, '');
    const dialCodeRaw = (input.dataset.dial || '').replace(/\D/g, '');

    // 1. Si l'utilisateur commence à taper l'indicatif (ex: 237...), on le retire
    if (dialCodeRaw && value.startsWith(dialCodeRaw) && value.length > dialCodeRaw.length) {
      value = value.substring(dialCodeRaw.length);
    }

    // 2. Si le numéro commence par 0 (souvent une habitude locale), on le retire car l'indicatif s'en charge
    if (value.startsWith('0')) {
      value = value.substring(1);
    }

    // Reformatter
    const maxLength = input.maxLength || 15;
    value = value.substring(0, maxLength);

    input.value = value;
  },

  /**
   * Obtenir le numéro complet avec indicatif
   */
  getFullNumber: function(input) {
    const dial = input.dataset.dial || '+237';
    const number = input.value.replace(/\D/g, '');
    return dial + number;
  },

  /**
   * Valider le numéro
   */
  validateNumber: function(input) {
    const pattern = input.dataset.pattern;
    if (!pattern) return true;

    const number = input.value.replace(/\D/g, '');
    const regex = new RegExp(pattern);
    return regex.test(number);
  }
};

// Initialisation automatique au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
  // Initialiser tous les champs téléphone
  const phoneInputs = document.querySelectorAll('[data-phone-selector]');
  phoneInputs.forEach(input => {
    CountryPhoneSelector.init(input);
  });
});
