// client/src/app/boutique/page.js
'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ProductCard from '../../components/ProductCard';
import { getApiBaseUrl, fetchWithTimeout } from '../../core/api';
import { fuzzyFilterProducts } from '../../core/fuzzySearch';
import { Info } from 'lucide-react';

import FilterDrawer from './components/FilterDrawer';
import BoutiqueToolbar from './components/BoutiqueToolbar';
import '../boutique.css';

const CATEGORIES = [
  { value: 'all', label: 'Toutes les catégories' },
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

const SORTS = [
  { value: 'recommended', label: 'Recommandé' },
  { value: 'recent', label: 'Nouveautés' },
  { value: 'price_asc', label: 'Prix : croissant' },
  { value: 'price_desc', label: 'Prix : décroissant' }
];

function normalizeCategoryKey(raw) {
  const s = String(raw || '').toLowerCase().trim();
  if (s.includes('electr')) return 'electronique';
  if (s.includes('inform')) return 'informatique';
  if (s.includes('vetem') || s.includes('habil')) return 'vetements';
  if (s.includes('beaut')) return 'beaute';
  if (s.includes('deco') || s.includes('mais')) return 'maison';
  if (s.includes('cuis')) return 'cuisine';
  if (s.includes('enf') || s.includes('beb')) return 'bebe-enfants';
  if (s.includes('sant') || s.includes('medic')) return 'sante';
  if (s.includes('anim')) return 'animaux';
  if (s.includes('jard')) return 'jardin';
  if (s.includes('jeu') || s.includes('consol')) return 'jeux';
  if (s.includes('musi')) return 'musique';
  if (s.includes('auto') || s.includes('vehic') || s.includes('voit')) return 'vehicules';
  if (s.includes('immo') || s.includes('terrai') || s.includes('maison')) return 'immobilier';
  if (s.includes('serv')) return 'services';
  if (s.includes('sport')) return 'sports';
  if (s.includes('livr') || s.includes('bouq')) return 'livres';
  if (s.includes('empl') || s.includes('recrut')) return 'emploi';
  return s || 'autres';
}

function BoutiqueContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Query params
  // _raw = requête originale de l'utilisateur (pour le filtrage fuzzy côté client)
  // q   = requête enrichie/nettoyée envoyée à l'API backend
  const initialQ = searchParams.get('_raw') || searchParams.get('q') || '';
  const initialCategory = searchParams.get('category') || 'all';
  const initialLocation = searchParams.get('location') || '';
  const initialSort = searchParams.get('sort') || searchParams.get('order') || 'recommended';
  const initialFilter = searchParams.get('filter') || 'products';
  const initialCustom = searchParams.get('custom') || '';

  // Filters State
  const [searchTerm, setSearchTerm] = useState(initialQ);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);
  const [selectedSort, setSelectedSort] = useState(initialSort);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  // Pagination & Loading States
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const sentinelRef = useRef(null);

  // Load page 0 cache key
  const getCacheKey = (sort) => `vc_boutique_cache_${sort}`;

  // Sync state when URL params change (e.g. searching from Header)
  useEffect(() => {
    setSearchTerm(initialQ);
    setSelectedCategory(initialCategory);
    setSelectedLocation(initialLocation);
    setSelectedSort(initialSort);
    // Force reset products
    setProducts([]);
    setCurrentPage(0);
    setHasMore(true);
  }, [initialQ, initialCategory, initialLocation, initialSort, initialFilter, initialCustom]);

  // Fetch products from server (paginated)
  const loadProducts = async (pageToLoad, isAppend = false) => {
    if (isLoading) return;
    setIsLoading(true);

    const base = getApiBaseUrl();
    const CACHE_KEY = getCacheKey(selectedSort);

    try {
      if (pageToLoad === 0 && !isAppend) {
        try {
          const cached = localStorage.getItem(CACHE_KEY);
          if (cached) {
            const data = JSON.parse(cached);
            if (Array.isArray(data) && data.length > 0) {
              setProducts(data);
            }
          }
        } catch (_) {}
      }

      const url = `${base}/api/products?page=${pageToLoad}&limit=12&sort=${encodeURIComponent(selectedSort)}`;
      const response = await fetchWithTimeout(url, {}, 15000);
      
      if (response.ok) {
        const data = await response.json();
        const newProducts = data.products || [];
        setHasMore(data.hasMore);

        setProducts((prev) => {
          if (isAppend) {
            const existingIds = new Set(prev.map(p => String(p.id)));
            const uniqueNew = newProducts.filter(p => !existingIds.has(String(p.id)));
            return [...prev, ...uniqueNew];
          } else {
            if (pageToLoad === 0) {
              try {
                localStorage.setItem(CACHE_KEY, JSON.stringify(newProducts));
              } catch (_) {}
            }
            return newProducts;
          }
        });
      }
    } catch (e) {
      console.error('Error loading boutique products:', e);
      // Empêcher la boucle infinie si le réseau est coupé ou le fetch échoue
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts(currentPage, currentPage > 0);
  }, [currentPage, selectedSort]);

  // Client-side search and category/location/tab filtering on loaded products list
  useEffect(() => {
    let filtered = [...products];

    if (selectedCategory && selectedCategory !== 'all') {
      filtered = filtered.filter((p) => {
        const itemCat = normalizeCategoryKey(p.category);
        return itemCat === selectedCategory || String(p.category || '') === String(selectedCategory);
      });
    }

    if (selectedLocation && selectedLocation !== 'all') {
      const locLower = selectedLocation.toLowerCase();
      filtered = filtered.filter((p) => {
        const locLabel = String(p.quartier || p.district || p.location || '').toLowerCase();
        const cleanLocLabel = locLabel.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const cleanLocSelected = locLower.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return cleanLocLabel.includes(cleanLocSelected);
      });
    }

    if (searchTerm) {
      // Recherche floue : tolère les fautes de frappe, longues phrases,
      // synonymes et mots partiels via le moteur fuzzySearch
      filtered = fuzzyFilterProducts(filtered, searchTerm);
    }

    const tabFilter = searchParams.get('filter') || 'products';
    if (tabFilter === 'ai') {
      filtered = filtered.filter((p) => String(p.description || '').trim().length > 40);
    } else if (tabFilter === 'sellers') {
      filtered = filtered.filter((p) => p.shop_name || p.seller_name || p.seller);
    }

    const customFilter = searchParams.get('custom');
    if (customFilter === 'custom') {
      filtered = filtered.filter((p) => {
        const cat = String(p.category || '').toLowerCase();
        const title = String(p.title || '').toLowerCase();
        return cat.includes('vetement') || cat.includes('deco') || cat.includes('maison') || title.includes('perso') || title.includes('sur mesure');
      });
    }

    setFilteredProducts(filtered);
  }, [products, selectedCategory, selectedLocation, searchTerm, searchParams]);

  // Infinite scroll
  useEffect(() => {
    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          if (filteredProducts.length === products.length) {
            setCurrentPage((prev) => prev + 1);
          }
        }
      },
      { root: null, rootMargin: '120px', threshold: 0.1 }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, isLoading, filteredProducts.length, products.length]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedLocation('');
    setSelectedSort('recommended');
    setCurrentPage(0);
    setProducts([]);
    setHasMore(true);
    router.replace('/boutique');
  };

  const clearSearchFilter = () => {
    setSearchTerm('');
    const params = new URLSearchParams(searchParams);
    params.delete('q');
    router.replace(`/boutique?${params.toString()}`);
  };

  const clearCategoryFilter = () => {
    setSelectedCategory('all');
    const params = new URLSearchParams(searchParams);
    params.delete('category');
    router.replace(`/boutique?${params.toString()}`);
  };

  const clearLocationFilter = () => {
    setSelectedLocation('');
    const params = new URLSearchParams(searchParams);
    params.delete('location');
    router.replace(`/boutique?${params.toString()}`);
  };

  const clearSortFilter = () => {
    setSelectedSort('recommended');
    const params = new URLSearchParams(searchParams);
    params.delete('sort');
    params.delete('order');
    router.replace(`/boutique?${params.toString()}`);
  };

  const getCategoryLabel = (val) => {
    const found = CATEGORIES.find(c => c.value === val);
    return found ? found.label : val;
  };

  const getSortLabel = (val) => {
    const found = SORTS.find(s => s.value === val);
    return found ? found.label : val;
  };

  const renderSkeletons = (count = 4) => {
    return Array(count)
      .fill(null)
      .map((_, idx) => (
        <article className="product-card skeleton-loading" key={idx}>
          <div className="product-media vc-skeleton" style={{ height: '180px' }}></div>
          <div className="product-info">
            <div className="vc-skeleton-text long"></div>
            <div className="product-loc-price-row">
              <div className="vc-skeleton-text short"></div>
              <div className="vc-skeleton-text short"></div>
            </div>
            <div className="product-meta-row">
              <div className="vc-skeleton-text medium"></div>
            </div>
          </div>
        </article>
      ));
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      
      <BoutiqueToolbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedSort={selectedSort}
        setSelectedSort={setSelectedSort}
        SORTS={SORTS}
        setCurrentPage={setCurrentPage}
        setProducts={setProducts}
        searchParams={searchParams}
        router={router}
        setFilterDrawerOpen={setFilterDrawerOpen}
        selectedCategory={selectedCategory}
        selectedLocation={selectedLocation}
        handleResetFilters={handleResetFilters}
        clearSearchFilter={clearSearchFilter}
        clearCategoryFilter={clearCategoryFilter}
        clearLocationFilter={clearLocationFilter}
        clearSortFilter={clearSortFilter}
        getCategoryLabel={getCategoryLabel}
        getSortLabel={getSortLabel}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px' }}>
        <div>
          {searchParams.get('imageSearch') === 'true' && searchTerm && (
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#166534',
              fontWeight: '600',
              fontSize: '0.95rem',
              boxShadow: '0 2px 8px rgba(22, 101, 52, 0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>📷</span>
                <span>Résultats pour la recherche par image : <strong style={{ color: 'var(--primary-blue)', textTransform: 'uppercase' }}>{searchTerm}</strong></span>
              </div>
              <button
                onClick={() => {
                  const params = new URLSearchParams(searchParams);
                  params.delete('q');
                  params.delete('_raw');
                  params.delete('imageSearch');
                  router.replace(`/boutique?${params.toString()}`);
                }}
                style={{
                  background: '#ffe4e6',
                  color: '#991b1b',
                  border: '1px solid #fecdd3',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '0.85rem'
                }}
              >
                Réinitialiser
              </button>
            </div>
          )}
          <div className="products-grid" id="products-grid">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((p) => <ProductCard key={p.id} product={p} />)
            ) : isLoading ? (
              renderSkeletons(6)
            ) : (
              <div
                className="loading"
                style={{
                  gridColumn: '1 / -1',
                  textAlign: 'center',
                  padding: '60px 20px',
                  background: '#fff',
                  borderRadius: '12px',
                  border: '1px dashed #ddd',
                  color: '#666'
                }}
              >
                <Info width="40" height="40" style={{ color: '#aaa', marginBottom: '10px' }} />
                <p>Aucun produit ne correspond à vos filtres actuels.</p>
                <button
                  onClick={handleResetFilters}
                  style={{
                    background: 'var(--primary-blue)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 16px',
                    marginTop: '12px',
                    cursor: 'pointer',
                    fontWeight: '700'
                  }}
                >
                  Voir tous les articles
                </button>
              </div>
            )}
          </div>

          {hasMore && (
            <div
              ref={sentinelRef}
              id="infinite-scroll-sentinel"
              style={{
                height: '40px',
                margin: '20px 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#888'
              }}
            >
              {isLoading && <div className="spinner">Chargement...</div>}
            </div>
          )}
        </div>
      </div>

      <FilterDrawer
        filterDrawerOpen={filterDrawerOpen}
        setFilterDrawerOpen={setFilterDrawerOpen}
        CATEGORIES={CATEGORIES}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        selectedLocation={selectedLocation}
        setSelectedLocation={setSelectedLocation}
        setProducts={setProducts}
        setCurrentPage={setCurrentPage}
        setHasMore={setHasMore}
      />
    </div>
  );
}

export default function BoutiquePage() {
  return (
    <Suspense fallback={<div className="loading" style={{ padding: '60px 20px', textAlign: 'center' }}>Chargement...</div>}>
      <BoutiqueContent />
    </Suspense>
  );
}
