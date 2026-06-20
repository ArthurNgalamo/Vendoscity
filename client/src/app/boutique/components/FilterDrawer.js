// client/src/app/boutique/components/FilterDrawer.js
'use client';

import React, { useState } from 'react';
import { X, Grid, MapPin } from 'lucide-react';

const QUARTIERS = [
  { value: 'all', label: 'Tous les quartiers' },
  // Douala
  { value: 'Bonamoussadi', label: 'Bonamoussadi (Douala)' },
  { value: 'Akwa', label: 'Akwa (Douala)' },
  { value: 'Bonapriso', label: 'Bonapriso (Douala)' },
  // Yaoundé
  { value: 'Bastos', label: 'Bastos (Yaoundé)' },
  { value: 'Omnisports', label: 'Omnisports (Yaoundé)' },
  { value: 'Mendong', label: 'Mendong (Yaoundé)' },
  { value: 'Mvan', label: 'Mvan (Yaoundé)' },
  // Autre
  { value: 'Kribi', label: 'Kribi (Plage)' }
];

export default function FilterDrawer({
  filterDrawerOpen,
  setFilterDrawerOpen,
  CATEGORIES,
  selectedCategory,
  setSelectedCategory,
  selectedLocation,
  setSelectedLocation,
  setProducts,
  setCurrentPage,
  setHasMore
}) {
  const [activeTab, setActiveTab] = useState('categories'); // 'categories' or 'quartiers'

  if (!filterDrawerOpen) return null;

  return (
    <div
      className="order-confirmation-overlay"
      onClick={() => setFilterDrawerOpen(false)}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.4)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '440px',
          padding: '20px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
          animation: 'scaleUpPwa 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid #eee' }}>
          <h3 style={{ margin: 0, color: 'var(--primary-blue)', fontWeight: '800', fontSize: '1.2rem' }}>Filtres de recherche</h3>
          <button
            onClick={() => setFilterDrawerOpen(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}
            aria-label="Fermer"
          >
            <X width="20" height="20" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div style={{ display: 'flex', borderBottom: '2px solid #f3f4f6', marginBottom: '15px', gap: '4px' }}>
          <button
            onClick={() => setActiveTab('categories')}
            style={{
              flex: 1,
              padding: '10px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'categories' ? '3px solid var(--primary-blue)' : '3px solid transparent',
              color: activeTab === 'categories' ? 'var(--primary-blue)' : '#666',
              fontWeight: activeTab === 'categories' ? '800' : '600',
              cursor: 'pointer',
              fontSize: '0.9rem',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Grid width="15" height="15" /> Catégories
          </button>
          <button
            onClick={() => setActiveTab('quartiers')}
            style={{
              flex: 1,
              padding: '10px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'quartiers' ? '3px solid var(--primary-blue)' : '3px solid transparent',
              color: activeTab === 'quartiers' ? 'var(--primary-blue)' : '#666',
              fontWeight: activeTab === 'quartiers' ? '800' : '600',
              cursor: 'pointer',
              fontSize: '0.9rem',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <MapPin width="15" height="15" /> Quartiers
          </button>
        </div>

        {/* Tab Contents */}
        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {activeTab === 'categories' ? (
            CATEGORIES.map((c) => (
              <button
                key={c.value}
                onClick={() => {
                  setSelectedCategory(c.value);
                  setFilterDrawerOpen(false);
                  setProducts([]);
                  setCurrentPage(0);
                  setHasMore(true);
                }}
                className="pressable"
                style={{
                  textAlign: 'left',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: selectedCategory === c.value ? 'var(--primary-blue)' : '#eee',
                  background: selectedCategory === c.value ? 'var(--brand-warm-tint)' : '#fff',
                  color: selectedCategory === c.value ? 'var(--primary-blue)' : '#333',
                  fontWeight: selectedCategory === c.value ? '800' : '500',
                  cursor: 'pointer',
                  fontSize: '0.95rem'
                }}
              >
                {c.label}
              </button>
            ))
          ) : (
            QUARTIERS.map((q) => (
              <button
                key={q.value}
                onClick={() => {
                  setSelectedLocation(q.value);
                  setFilterDrawerOpen(false);
                  setProducts([]);
                  setCurrentPage(0);
                  setHasMore(true);
                }}
                className="pressable"
                style={{
                  textAlign: 'left',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: selectedLocation === q.value || (q.value === 'all' && !selectedLocation) ? 'var(--primary-blue)' : '#eee',
                  background: selectedLocation === q.value || (q.value === 'all' && !selectedLocation) ? 'var(--brand-warm-tint)' : '#fff',
                  color: selectedLocation === q.value || (q.value === 'all' && !selectedLocation) ? 'var(--primary-blue)' : '#333',
                  fontWeight: selectedLocation === q.value || (q.value === 'all' && !selectedLocation) ? '800' : '500',
                  cursor: 'pointer',
                  fontSize: '0.95rem'
                }}
              >
                {q.label}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
