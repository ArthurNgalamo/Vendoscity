// client/src/app/boutique/components/FilterDrawer.js
import React from 'react';
import { X } from 'lucide-react';

export default function FilterDrawer({
  filterDrawerOpen,
  setFilterDrawerOpen,
  CATEGORIES,
  selectedCategory,
  setSelectedCategory,
  setProducts,
  setCurrentPage,
  setHasMore
}) {
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
          borderRadius: '12px',
          width: '100%',
          maxWidth: '440px',
          padding: '20px',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: '0 10px 25px rgba(0,0,0,0.15)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid #eee' }}>
          <h3 style={{ margin: 0, color: 'var(--primary-blue)', fontWeight: '800' }}>Catégories</h3>
          <button
            onClick={() => setFilterDrawerOpen(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <X width="18" height="18" />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {CATEGORIES.map((c) => (
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
          ))}
        </div>
      </div>
    </div>
  );
}
