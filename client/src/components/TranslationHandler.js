// client/src/components/TranslationHandler.js
'use client';

import { useEffect } from 'react';

export default function TranslationHandler() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Catch and ignore NotFoundError when browser translation engines (like Google Translate)
      // dynamically modify DOM text nodes, which otherwise causes React to crash.
      const originalRemoveChild = Node.prototype.removeChild;
      Node.prototype.removeChild = function (child) {
        try {
          return originalRemoveChild.call(this, child);
        } catch (error) {
          if (
            error.name === 'NotFoundError' || 
            (error instanceof DOMException && error.code === 8) // NotFoundError code is 8
          ) {
            return child;
          }
          throw error;
        }
      };

      const originalInsertBefore = Node.prototype.insertBefore;
      Node.prototype.insertBefore = function (newNode, referenceNode) {
        try {
          return originalInsertBefore.call(this, newNode, referenceNode);
        } catch (error) {
          if (
            error.name === 'NotFoundError' || 
            (error instanceof DOMException && error.code === 8)
          ) {
            return newNode;
          }
          throw error;
        }
      };
      // Désenregistrer les Service Workers hérités (Legacy) une seule fois pour libérer le cache Next.js
      if ('serviceWorker' in navigator && typeof window !== 'undefined' && !localStorage.getItem('legacy_sw_cleaned_v2')) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          if (registrations.length === 0) {
            localStorage.setItem('legacy_sw_cleaned_v2', 'true');
            return;
          }
          let unregisteredAny = false;
          const promises = registrations.map((registration) => 
            registration.unregister().then((success) => {
              if (success) {
                console.log('Legacy Service Worker désenregistré avec succès.');
                unregisteredAny = true;
              }
            })
          );
          Promise.all(promises).then(() => {
            localStorage.setItem('legacy_sw_cleaned_v2', 'true');
            if (unregisteredAny) {
              window.location.reload();
            }
          });
        });
      }

      // Google Translate widget loader for non-French browsers
      const userLang = navigator.language || navigator.userLanguage || '';
      if (userLang && !userLang.startsWith('fr') && !window.googleTranslateElementInit) {
        window.googleTranslateElementInit = () => {
          new window.google.translate.TranslateElement(
            { pageLanguage: 'fr', layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE },
            'google_translate_element'
          );
        };
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
        document.body.appendChild(script);
      }
    }
  }, []);

  return null;
}
