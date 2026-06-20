// client/src/app/dashboard/constants.js

export const CATEGORIES = [
  { value: 'electronique', label: 'Electronique' },
  { value: 'informatique', label: 'Informatique' },
  { value: 'vetements', label: 'Vetements' },
  { value: 'beaute', label: 'Beaute' },
  { value: 'maison', label: 'Maison & Deco' },
  { value: 'cuisine', label: 'Cuisine' },
  { value: 'bebe-enfants', label: 'Bebe & Enfants' },
  { value: 'sante', label: 'Sante' },
  { value: 'animaux', label: 'Animaux' },
  { value: 'jardin', label: 'Jardin' },
  { value: 'jeux', label: 'Jeux' },
  { value: 'musique', label: 'Musique' },
  { value: 'vehicules', label: 'Vehicules' },
  { value: 'immobilier', label: 'Immobilier' },
  { value: 'services', label: 'Services' },
  { value: 'sports', label: 'Sports' },
  { value: 'livres', label: 'Livres' },
  { value: 'emploi', label: 'Emploi' },
  { value: 'autres', label: 'Autres' }
];

export const POPULAR_NEIGHBORHOODS = [
  // Yaoundé
  { value: 'Bastos (Yaoundé)', label: 'Bastos (Yaoundé)' },
  { value: 'Omnisports (Yaoundé)', label: 'Omnisports (Yaoundé)' },
  { value: 'Essos (Yaoundé)', label: 'Essos (Yaoundé)' },
  { value: 'Mvan (Yaoundé)', label: 'Mvan (Yaoundé)' },
  { value: 'Tsinga (Yaoundé)', label: 'Tsinga (Yaoundé)' },
  { value: 'Biyem-Assi (Yaoundé)', label: 'Biyem-Assi (Yaoundé)' },
  { value: 'Mendong (Yaoundé)', label: 'Mendong (Yaoundé)' },
  { value: 'Ngousso (Yaoundé)', label: 'Ngousso (Yaoundé)' },
  // Douala
  { value: 'Akwa (Douala)', label: 'Akwa (Douala)' },
  { value: 'Bonapriso (Douala)', label: 'Bonapriso (Douala)' },
  { value: 'Bonanjo (Douala)', label: 'Bonanjo (Douala)' },
  { value: 'Deido (Douala)', label: 'Deido (Douala)' },
  { value: 'Kotto (Douala)', label: 'Kotto (Douala)' },
  { value: 'Makepe (Douala)', label: 'Makepe (Douala)' },
  // Autre
  { value: 'Autre', label: 'Autre quartier / Autre ville' }
];

export const COUNTRIES = [
  { code: 'CM', name: 'Cameroun', flag: '🇨🇲', dial: '+237' },
  { code: 'CI', name: 'Côte d\'Ivoire', flag: '🇨🇮', dial: '+225' },
  { code: 'SN', name: 'Sénégal', flag: '🇸🇳', dial: '+221' },
  { code: 'GA', name: 'Gabon', flag: '🇬🇦', dial: '+241' },
  { code: 'CG', name: 'Congo', flag: '🇨🇬', dial: '+242' },
  { code: 'CD', name: 'RDC', flag: '🇨🇩', dial: '+243' },
  { code: 'TG', name: 'Togo', flag: '🇹🇬', dial: '+228' },
  { code: 'BJ', name: 'Bénin', flag: '🇧🇯', dial: '+229' },
  { code: 'NE', name: 'Niger', flag: '🇳🇪', dial: '+227' },
  { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫', dial: '+226' },
  { code: 'ML', name: 'Mali', flag: '🇲🇱', dial: '+223' },
  { code: 'GN', name: 'Guinée', flag: '🇬🇳', dial: '+224' },
  { code: 'MA', name: 'Maroc', flag: '🇲🇦', dial: '+212' },
  { code: 'FR', name: 'France', flag: '🇫🇷', dial: '+33' },
  { code: 'BE', name: 'Belgique', flag: '🇧🇪', dial: '+32' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', dial: '+1' },
];

export const parsePhoneNumber = (rawPhone) => {
  let clean = String(rawPhone || '').trim();
  if (!clean) {
    return { country: COUNTRIES[0], national: '' };
  }
  if (!clean.startsWith('+')) {
    clean = '+' + clean;
  }
  const sorted = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
  for (const c of sorted) {
    if (clean.startsWith(c.dial)) {
      return {
        country: c,
        national: clean.slice(c.dial.length)
      };
    }
  }
  return {
    country: COUNTRIES.find(c => c.code === 'CM') || COUNTRIES[0],
    national: clean.replace(/^\+/, '')
  };
};
