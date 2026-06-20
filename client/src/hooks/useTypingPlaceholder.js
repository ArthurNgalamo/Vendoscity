// client/src/hooks/useTypingPlaceholder.js
'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * Hook qui anime un placeholder façon machine à écrire.
 * 
 * - Chaque phrase est tapée lettre par lettre à `typingSpeed` ms/lettre
 * - Une pause `pauseDuration` ms est faite après la fin de la phrase
 * - La phrase est ensuite effacée lettre par lettre à `erasingSpeed` ms/lettre
 * - La durée totale entre deux phrases est donc proportionnelle à leur longueur
 * 
 * @param {string[]} phrases   - Liste des phrases à afficher
 * @param {number}   typingSpeed  - ms entre chaque lettre (défaut: 80ms)
 * @param {number}   erasingSpeed - ms entre chaque effacement (défaut: 40ms)
 * @param {number}   pauseDuration - ms à attendre une fois la phrase complète (défaut: 2000ms)
 * @param {boolean}  paused    - Si true, stoppe l'animation (ex: quand l'user tape)
 * @returns {string} Le texte courant à utiliser comme placeholder
 */
export function useTypingPlaceholder(
  phrases,
  typingSpeed = 80,
  erasingSpeed = 40,
  pauseDuration = 2200,
  paused = false
) {
  const [displayText, setDisplayText] = useState('');
  const stateRef = useRef({
    phraseIndex: 0,
    charIndex: 0,
    isErasing: false,
    isPaused: false,
  });
  const timerRef = useRef(null);

  useEffect(() => {
    if (!phrases || phrases.length === 0) return;

    const tick = () => {
      const s = stateRef.current;

      if (paused) {
        timerRef.current = setTimeout(tick, 300);
        return;
      }

      const currentPhrase = phrases[s.phraseIndex];

      if (s.isPaused) {
        // Pause terminée → on commence à effacer
        s.isPaused = false;
        s.isErasing = true;
        timerRef.current = setTimeout(tick, erasingSpeed);
        return;
      }

      if (!s.isErasing) {
        // Phase de frappe
        if (s.charIndex < currentPhrase.length) {
          const next = currentPhrase.slice(0, s.charIndex + 1);
          setDisplayText(next);
          s.charIndex += 1;
          timerRef.current = setTimeout(tick, typingSpeed);
        } else {
          // Phrase complète → pause
          s.isPaused = true;
          timerRef.current = setTimeout(tick, pauseDuration);
        }
      } else {
        // Phase d'effacement
        if (s.charIndex > 0) {
          const next = currentPhrase.slice(0, s.charIndex - 1);
          setDisplayText(next);
          s.charIndex -= 1;
          timerRef.current = setTimeout(tick, erasingSpeed);
        } else {
          // Effacement terminé → phrase suivante
          s.isErasing = false;
          s.phraseIndex = (s.phraseIndex + 1) % phrases.length;
          s.charIndex = 0;
          timerRef.current = setTimeout(tick, typingSpeed + 100);
        }
      }
    };

    timerRef.current = setTimeout(tick, 600);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phrases, typingSpeed, erasingSpeed, pauseDuration, paused]);

  return displayText;
}

/**
 * Génère une liste de phrases personnalisées à partir de l'historique de clics et recherches.
 * 
 * @param {string[]} defaultPhrases - Suggestions par défaut si pas d'historique
 * @returns {string[]} Liste de suggestions personnalisées
 */
export function getPersonalizedPhrases(defaultPhrases) {
  if (typeof window === 'undefined') return defaultPhrases;
  try {
    const history = JSON.parse(localStorage.getItem('vendoscity_user_history') || '[]');
    const searches = JSON.parse(localStorage.getItem('vendoscity_user_searches') || '[]');
    
    if (history.length === 0 && searches.length === 0) {
      return defaultPhrases;
    }
    
    const personalized = [];
    
    // 1. Ajouter les mots recherchés récemment
    searches.forEach(search => {
      if (search && !personalized.includes(search) && !personalized.includes(`${search}...`)) {
        // Rendre propre l'affichage en ajoutant des points de suspension
        const term = search.endsWith('...') ? search : `${search}...`;
        personalized.push(term);
      }
    });
    
    // 2. Associer les catégories visitées aux phrases d'exemple correspondantes
    const visitedCategories = [...new Set(history.map(item => String(item.category || '').toLowerCase()))].filter(Boolean);
    
    if (visitedCategories.some(c => c.includes('electronique') || c.includes('electro') || c.includes('phone') || c.includes('informatique'))) {
      personalized.push('iPhone 15 Pro Max 256 Go...');
      personalized.push('Ordinateur portable Dell Core i7...');
      personalized.push('Télévision 55 pouces 4K UHD...');
    }
    if (visitedCategories.some(c => c.includes('vetement') || c.includes('mode') || c.includes('chaussure') || c.includes('sac') || c.includes('habit'))) {
      personalized.push('Robe de soirée tendance Yaoundé...');
      personalized.push('Chaussures Nike Air Jordan neuves...');
      personalized.push('Sac à main Louis Vuitton original...');
    }
    if (visitedCategories.some(c => c.includes('vehicule') || c.includes('moto') || c.includes('voiture') || c.includes('auto'))) {
      personalized.push('Moto Yamaha YZF R15 2024...');
      personalized.push('Voiture Toyota Yaris occasion...');
    }
    if (visitedCategories.some(c => c.includes('maison') || c.includes('meuble') || c.includes('deco') || c.includes('canape') || c.includes('climatiseur'))) {
      personalized.push('Canapé 3 places cuir marron...');
      personalized.push('Climatiseur Samsung 1.5 chevaux...');
      personalized.push('Générateur électrique 3000W...');
    }
    
    // 3. Ajouter les titres des articles récemment vus
    history.slice(0, 3).forEach(item => {
      const titleClean = String(item.title || '').trim();
      if (!titleClean) return;
      const shortTitle = titleClean.length > 28 ? `${titleClean.slice(0, 28)}...` : `${titleClean}...`;
      if (!personalized.includes(shortTitle)) {
        personalized.push(shortTitle);
      }
    });
    
    // Remplir avec les phrases par défaut pour être sûr d'avoir 10 phrases
    defaultPhrases.forEach(phrase => {
      if (personalized.length < 10 && !personalized.includes(phrase)) {
        personalized.push(phrase);
      }
    });
    
    return personalized.slice(0, 10);
  } catch (_) {
    return defaultPhrases;
  }
}
