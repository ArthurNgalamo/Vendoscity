'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Package, Globe, X, ShoppingBag, Loader } from 'lucide-react';

const SOURCE_OPTIONS = [
  { value: 'aliexpress', label: 'AliExpress', color: '#FF6A00', flag: '🛒' },
  { value: 'alibaba',    label: 'Alibaba',    color: '#E8372C', flag: '🏭' },
  { value: '1688',       label: '1688',       color: '#CC0000', flag: '🇨🇳' },
];

export default function ImportSection({ profile, authFetch, showToast, formatCurrency }) {
  const [activeTab, setActiveTab] = useState('search'); // 'search' | 'catalog'
  const [source, setSource] = useState('aliexpress');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [myCatalog, setMyCatalog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState(null);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await authFetch(`/api/imports/search?q=${encodeURIComponent(query)}&source=${source}`);
      const data = await res.json();
      setResults(data.items || []);
    } catch (err) {
      showToast?.('Erreur lors de la recherche : ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadCatalog = useCallback(async () => {
    try {
      const res = await authFetch('/api/imports/my-catalog');
      const data = await res.json();
      setMyCatalog(data || []);
    } catch (err) {
      console.error('Error loading my catalog:', err);
    }
  }, [authFetch]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const handleAdd = async (item) => {
    setAddingId(item.id);
    try {
      const res = await authFetch('/api/imports/add-to-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pool_product_id: item.id }),
      });
      if (res.ok) {
        showToast?.('Article ajouté à votre catalogue !', 'success');
        await loadCatalog();
      } else {
        const err = await res.json();
        showToast?.(err.error || 'Erreur lors de l\'ajout', 'error');
      }
    } catch (err) {
      showToast?.('Erreur de connexion : ' + err.message, 'error');
    } finally {
      setAddingId(null);
    }
  };

  const handleRemove = async (catalogId) => {
    try {
      const res = await authFetch(`/api/imports/catalog/${catalogId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast?.('Article retiré du catalogue.', 'success');
        await loadCatalog();
      } else {
        const err = await res.json();
        showToast?.(err.error || 'Erreur lors du retrait', 'error');
      }
    } catch (err) {
      showToast?.('Erreur : ' + err.message, 'error');
    }
  };

  const formatPrice = (price) => {
    if (formatCurrency) return formatCurrency(price);
    return `${price.toLocaleString('fr-FR')} FCFA`;
  };

  const catalogIds = new Set(myCatalog.map(c => c.pool_product_id));

  // Note: if profile has verification info, handle it
  const isVerified = profile?.is_verified || false;

  if (!isVerified) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-12 bg-gray-900/60 backdrop-blur-md rounded-2xl border border-white/10 max-w-2xl mx-auto my-8">
        <Package size={48} className="text-indigo-500 mb-4 animate-pulse" />
        <h3 className="text-white text-xl font-bold mb-2">Accès Vendeur Vérifié Requis</h3>
        <p className="text-gray-400 mb-6 max-w-md">
          L'importation d'articles depuis l'étranger et leur revente avec commissions automatiques est réservée aux vendeurs vérifiés. Certifiez votre boutique pour y accéder.
        </p>
        <div className="text-sm text-indigo-400 font-semibold px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
          Rapprochez-vous de l'administration pour valider votre statut.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Premium Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(99,102,241,0.15),transparent)] pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Globe size={24} className="text-indigo-400" />
              <h2 className="text-white text-xl font-bold">Importer des Articles</h2>
              <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/30 px-3 py-1 rounded-full uppercase tracking-wider">
                Vendeur Certifié
              </span>
            </div>
            <p className="text-gray-400 text-sm max-w-xl">
              Recherchez des milliers d'articles sur Alibaba, AliExpress ou 1688. Ajoutez-les en un clic à votre catalogue et vendez-les directement sur le marché camerounais avec une commission de 1/7 (ou 1/6 dès 50k FCFA).
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-3">
        <button
          onClick={() => setActiveTab('search')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
            activeTab === 'search'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 border border-indigo-500'
              : 'bg-white/5 text-gray-400 hover:text-white border border-white/5'
          }`}
        >
          <Search size={16} />
          Rechercher & Importer
        </button>
        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
            activeTab === 'catalog'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 border border-indigo-500'
              : 'bg-white/5 text-gray-400 hover:text-white border border-white/5'
          }`}
        >
          <ShoppingBag size={16} />
          Mon Catalogue Importé ({myCatalog.length})
        </button>
      </div>

      {activeTab === 'search' && (
        <div className="space-y-6">
          {/* Search Form */}
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="flex flex-1 rounded-xl bg-white/5 border border-white/10 overflow-hidden focus-within:border-indigo-500 transition-all">
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="bg-indigo-950/80 text-white text-sm font-semibold border-none px-4 outline-none cursor-pointer border-r border-white/10 hover:bg-indigo-900 transition-all"
              >
                {SOURCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
                    {opt.flag} {opt.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Entrez un mot-clé (ex: sac à main, montre, baskets)..."
                className="flex-1 bg-transparent text-white text-sm px-4 py-3 outline-none placeholder:text-gray-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-6 py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              {loading ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  Recherche...
                </>
              ) : (
                <>
                  <Search size={18} />
                  Rechercher
                </>
              )}
            </button>
          </form>

          {/* Results Grid */}
          {loading && (
            <div className="flex flex-col items-center justify-center p-12 text-gray-400">
              <Loader size={36} className="text-indigo-400 animate-spin mb-4" />
              <p className="text-sm">Scraping en cours, veuillez patienter...</p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {results.map((item) => {
                const inCatalog = catalogIds.has(item.id);
                const srcOpt = SOURCE_OPTIONS.find((s) => s.value === item.source) || SOURCE_OPTIONS[0];
                return (
                  <div key={item.id} className="group bg-white/5 border border-white/10 rounded-xl overflow-hidden flex flex-col hover:border-indigo-500/50 hover:bg-white/10 transition-all duration-300">
                    <div className="relative aspect-square bg-slate-950 overflow-hidden">
                      {item.image_urls?.[0] ? (
                        <img
                          src={item.image_urls[0]}
                          alt={item.title_fr}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600">
                          <Package size={32} />
                        </div>
                      )}
                      {/* Platform Badge */}
                      <span
                        className="absolute top-2 left-2 text-[10px] font-bold text-white px-2 py-1 rounded shadow-md uppercase tracking-wider"
                        style={{ backgroundColor: srcOpt.color }}
                      >
                        {srcOpt.label}
                      </span>
                      {/* Video Badge */}
                      {item.video_url && (
                        <span className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded shadow-md flex items-center gap-1">
                          ▶ Vidéo
                        </span>
                      )}
                    </div>

                    <div className="p-4 flex flex-col flex-1 justify-between gap-3">
                      <div className="space-y-1">
                        <h4 className="text-white text-xs font-semibold line-clamp-2 leading-relaxed" title={item.title_fr}>
                          {item.title_fr}
                        </h4>
                        <p className="text-emerald-400 font-bold text-base">
                          {formatPrice(item.price_final)}
                        </p>
                      </div>

                      <button
                        onClick={() => handleAdd(item)}
                        disabled={inCatalog || addingId === item.id}
                        className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                          inCatalog
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 cursor-default'
                            : 'bg-indigo-600/20 text-indigo-300 border-indigo-500/30 hover:bg-indigo-600 hover:text-white hover:border-indigo-500 cursor-pointer'
                        }`}
                      >
                        {inCatalog ? (
                          <>✓ Dans ma boutique</>
                        ) : addingId === item.id ? (
                          <>Ajout...</>
                        ) : (
                          <>
                            <Plus size={14} />
                            Ajouter à ma boutique
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!loading && results.length === 0 && query && (
            <div className="text-center p-12 bg-white/5 border border-white/10 rounded-xl text-gray-400">
              <Search size={36} className="mx-auto mb-4 opacity-50" />
              <p className="text-sm">Aucun résultat trouvé pour "{query}".</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'catalog' && (
        <div className="space-y-6">
          {myCatalog.length === 0 ? (
            <div className="text-center p-12 bg-white/5 border border-white/10 rounded-xl text-gray-400">
              <ShoppingBag size={36} className="mx-auto mb-4 opacity-50" />
              <p className="text-sm">Votre catalogue importé est vide. Recherchez des articles pour commencer à en ajouter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {myCatalog.map((entry) => {
                const item = entry.pool_product || {};
                const srcOpt = SOURCE_OPTIONS.find((s) => s.value === item.source) || SOURCE_OPTIONS[0];
                return (
                  <div key={entry.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden flex flex-col hover:border-white/20 transition-all">
                    <div className="relative aspect-square bg-slate-950 overflow-hidden">
                      {item.image_urls?.[0] ? (
                        <img
                          src={item.image_urls[0]}
                          alt={entry.custom_title || item.title_fr}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600">
                          <Package size={32} />
                        </div>
                      )}
                      <span
                        className="absolute top-2 left-2 text-[10px] font-bold text-white px-2 py-1 rounded shadow-md uppercase tracking-wider"
                        style={{ backgroundColor: srcOpt.color }}
                      >
                        {srcOpt.label}
                      </span>
                    </div>

                    <div className="p-4 flex flex-col flex-1 justify-between gap-3">
                      <div className="space-y-1">
                        <h4 className="text-white text-xs font-semibold line-clamp-2 leading-relaxed">
                          {entry.custom_title || item.title_fr}
                        </h4>
                        <p className="text-emerald-400 font-bold text-base">
                          {formatPrice(item.price_final || 0)}
                        </p>
                      </div>

                      <button
                        onClick={() => handleRemove(entry.id)}
                        className="w-full py-2 px-3 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 border border-red-500/20 hover:border-red-500 rounded-lg text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
                      >
                        <X size={14} />
                        Retirer de la boutique
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
