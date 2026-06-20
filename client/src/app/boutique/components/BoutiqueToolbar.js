// client/src/app/boutique/components/BoutiqueToolbar.js
import React from 'react';
import { Filter, RotateCcw, X } from 'lucide-react';

export default function BoutiqueToolbar({
  searchTerm,
  setSearchTerm,
  selectedSort,
  setSelectedSort,
  SORTS,
  setCurrentPage,
  setProducts,
  searchParams,
  router,
  setFilterDrawerOpen,
  selectedCategory,
  selectedLocation,
  handleResetFilters,
  clearSearchFilter,
  clearCategoryFilter,
  clearLocationFilter,
  clearSortFilter,
  getCategoryLabel,
  getSortLabel
}) {
  return (
    <>
      {/* Search and Sort row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center', marginBottom: '25px' }}>
        <div style={{ flex: 1, minWidth: '260px', position: 'relative' }}>
          <input
            type="search"
            placeholder="Rechercher un article..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '2px solid #ddd',
              fontFamily: 'inherit',
              fontSize: '1rem',
              boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
            }}
          />
        </div>

        {/* Sort selector */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <label htmlFor="sort-select" style={{ fontSize: '0.9rem', color: '#555', fontWeight: '700' }}>Trier par</label>
          <select
            id="sort-select"
            value={selectedSort}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedSort(val);
              setCurrentPage(0);
              setProducts([]);
              const params = new URLSearchParams(searchParams);
              params.set('sort', val);
              router.replace(`/boutique?${params.toString()}`);
            }}
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              border: '2px solid #ddd',
              background: '#fff',
              fontSize: '0.95rem',
              cursor: 'pointer'
            }}
          >
            {SORTS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => setFilterDrawerOpen(true)}
          className="pressable"
          style={{
            background: 'var(--primary-blue)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 16px',
            cursor: 'pointer',
            fontWeight: '700',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Filter width="16" height="16" /> Catégories
        </button>
      </div>

      {/* Filter Chips row (Temu-like active filters) */}
      {(searchTerm || (selectedCategory && selectedCategory !== 'all') || (selectedLocation && selectedLocation !== '') || selectedSort !== 'recommended') && (
        <div className="vc-filter-chips-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px', alignItems: 'center' }}>
          <button
            onClick={handleResetFilters}
            className="vc-chip is-reset pressable"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: 'none',
              border: '1px dashed #bbb',
              borderRadius: '50px',
              padding: '6px 12px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: '700'
            }}
          >
            <RotateCcw width="12" height="12" /> Réinitialiser
          </button>

          {searchTerm && (
            <span className="vc-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#e5e7eb', padding: '6px 12px', borderRadius: '50px', fontSize: '0.85rem' }}>
              Recherche : {searchTerm}
              <X onClick={clearSearchFilter} width="14" height="14" style={{ cursor: 'pointer', color: '#666' }} />
            </span>
          )}

          {selectedCategory && selectedCategory !== 'all' && (
            <span className="vc-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#e5e7eb', padding: '6px 12px', borderRadius: '50px', fontSize: '0.85rem' }}>
              Catégorie : {getCategoryLabel(selectedCategory)}
              <X onClick={clearCategoryFilter} width="14" height="14" style={{ cursor: 'pointer', color: '#666' }} />
            </span>
          )}

          {selectedLocation && selectedLocation !== '' && (
            <span className="vc-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#e5e7eb', padding: '6px 12px', borderRadius: '50px', fontSize: '0.85rem' }}>
              Ville : {selectedLocation}
              <X onClick={clearLocationFilter} width="14" height="14" style={{ cursor: 'pointer', color: '#666' }} />
            </span>
          )}

          {selectedSort !== 'recommended' && (
            <span className="vc-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#e5e7eb', padding: '6px 12px', borderRadius: '50px', fontSize: '0.85rem' }}>
              Tri : {getSortLabel(selectedSort)}
              <X onClick={clearSortFilter} width="14" height="14" style={{ cursor: 'pointer', color: '#666' }} />
            </span>
          )}
        </div>
      )}
    </>
  );
}
