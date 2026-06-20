/**
 * BLOG PAGE SCRIPT
 * - Removes inline onclick handlers (framework-friendly)
 * - Handles category filtering + newsletter subscription UX
 */

function setActiveFilterButton(btn) {
  document.querySelectorAll('.blog-filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}

function applyBlogFilter(category) {
  const normalized = String(category || 'all');
  document.querySelectorAll('.blog-card').forEach(card => {
    if (normalized === 'all') {
      card.style.display = 'block';
      return;
    }
    const c = String(card.getAttribute('data-category') || '');
    card.style.display = c.includes(normalized) ? 'block' : 'none';
  });
}

// Back-compat if something still calls filterBlog(category)
window.filterBlog = function(category) {
  applyBlogFilter(category);
};

window.subscribeNewsletter = function() {
  const emailInput = document.getElementById('newsletter-email');
  const email = String(emailInput?.value || '').trim();

  if (!email || !email.includes('@')) {
    alert('Entrez une adresse email valide.');
    emailInput?.focus();
    return;
  }

  alert("Merci. Votre demande d'abonnement a ete prise en compte.");
  if (emailInput) emailInput.value = '';
};

document.addEventListener('DOMContentLoaded', () => {
  const filters = document.querySelector('.blog-filters');
  if (filters) {
    filters.addEventListener('click', (e) => {
      const btn = e.target.closest?.('.blog-filter-btn');
      if (!btn) return;

      const filter = btn.dataset.filter || 'all';
      setActiveFilterButton(btn);
      applyBlogFilter(filter);
    });
  }

  const submit = document.getElementById('newsletter-submit');
  if (submit) {
    submit.addEventListener('click', () => window.subscribeNewsletter());
  }

  const email = document.getElementById('newsletter-email');
  if (email) {
    email.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      window.subscribeNewsletter();
    });
  }

  if (window.lucide) lucide.createIcons();
});

