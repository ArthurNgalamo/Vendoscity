/**
 * coalescer.js
 * Mutualise les requêtes asynchrones en cours.
 * Si une promesse pour la même clé est active, elle est partagée.
 */

const activePromises = new Map();

/**
 * Exécute une tâche de façon unique pour une clé donnée.
 * Si la tâche est déjà en cours, retourne la promesse existante.
 * @param {string} key - Clé unique identifiant la requête
 * @param {Function} taskFn - Fonction retournant une Promesse (() => Promise<any>)
 * @returns {Promise<any>}
 */
async function coalesce(key, taskFn) {
  if (!key) return taskFn();

  if (activePromises.has(key)) {
    console.log(`[Coalescer] Réutilisation de la requête active pour : "${key}"`);
    return activePromises.get(key);
  }

  const promise = taskFn().finally(() => {
    activePromises.delete(key);
  });

  activePromises.set(key, promise);
  return promise;
}

module.exports = {
  coalesce
};
