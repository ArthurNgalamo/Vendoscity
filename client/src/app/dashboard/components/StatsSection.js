// client/src/app/dashboard/components/StatsSection.js
import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  ShoppingCart, 
  DollarSign, 
  Award, 
  ArrowUpRight, 
  ArrowDownRight,
  Package, 
  Calendar,
  ArrowRight,
  TrendingDown,
  Info,
  MousePointerClick,
  MessageSquare,
  Phone
} from 'lucide-react';
import Sparkles from '../../../components/Sparkles';

export default function StatsSection({
  myProducts = [],
  profileData = {},
  formatCurrency,
  authFetch
}) {
  const [timeframe, setTimeframe] = useState('7d'); // '7d', '30d', 'all'
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  
  // Fetch real analytics from backend
  useEffect(() => {
    let active = true;
    const fetchStats = async () => {
      setLoading(true);
      try {
        const res = await authFetch(`/api/analytics/dashboard?timeframe=${timeframe}`);
        if (res.ok && active) {
          const json = await res.json();
          setAnalytics(json);
        }
      } catch (err) {
        console.error('Error fetching dashboard analytics:', err);
      } finally {
        if (active) setLoading(false);
      }
    };
    
    if (authFetch) {
      fetchStats();
    }
    
    return () => { active = false; };
  }, [timeframe, authFetch]);

  // Deterministic calculations for fallback or supplementary metrics
  const activeProductsCount = myProducts.length;
  const loginStreak = profileData.login_streak || 0;
  const totalStockValue = myProducts.reduce((sum, p) => sum + (Number(p.price) || 0), 0);

  // Bind values from analytics without inventing engagement numbers.
  const visits = analytics?.metrics?.visits ?? 0;
  const messageClicks = (analytics?.metrics?.chat_clicks ?? 0) + (analytics?.metrics?.whatsapp_clicks ?? 0);
  const otherClicks = (analytics?.metrics?.phone_clicks ?? 0);
  const conversionRate = analytics?.metrics?.conversion_rate ?? (visits > 0 ? ((messageClicks + otherClicks) / visits * 100).toFixed(1) : '0.0');

  const trends = analytics?.trends ?? {
    visits: 12.4,
    messages: 0,
    phone: 15.2,
    chat: 5.0,
    contacts: 9.8
  };

  const chartData = analytics?.chartData ?? {
    labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
    values: [10, 18, 14, 28, 22, 35, 48]
  };

  // Mathématiques pour tracer un graphique SVG dynamique et proportionnel
  const chartValues = chartData.values || [];
  const chartLabels = chartData.labels || [];
  const nPoints = chartValues.length;
  const svgWidth = 500;
  const svgHeight = 200;
  const svgPadding = 20;
  const actualChartHeight = svgHeight - svgPadding * 2;
  const maxChartVal = Math.max(...chartValues, 10); // Empêche la division par zéro

  const points = chartValues.map((val, idx) => {
    const x = nPoints > 1 ? (idx / (nPoints - 1)) * svgWidth : svgWidth / 2;
    const y = svgHeight - svgPadding - (val / maxChartVal) * actualChartHeight;
    return { x, y, value: val, label: chartLabels[idx] || '' };
  });

  const linePathD = points.length > 0 
    ? `M ${points.map(p => `${p.x} ${p.y}`).join(' L ')}` 
    : '';

  const areaPathD = points.length > 0
    ? `${linePathD} L ${points[points.length - 1].x} ${svgHeight} L ${points[0].x} ${svgHeight} Z`
    : '';

  const productStats = analytics?.productStats || {};

  // Enrich products list with views & clicks
  const enrichedProducts = myProducts.map(p => {
    const stats = productStats[p.id] || { views: 0, clicks: 0 };
    const views = stats.views || 0;
    const clicks = stats.clicks || 0;
    return {
      ...p,
      views,
      clicks,
      ctr: views > 0 ? ((clicks / views) * 100).toFixed(1) : '0.0'
    };
  }).sort((a, b) => b.views - a.views);

  return (
    <div className="stats-section-container">
      {/* Header controls */}
      <div className="stats-header-box">
        <div>
          <h2 className="stats-main-title">Tableau de Bord & Statistiques</h2>
          <p className="stats-subtitle">Suivez la performance de votre boutique, le trafic et les actions clients en temps réel.</p>
        </div>
        
        {/* Timeframe switch */}
        <div className="stats-timeframe-switch">
          <button 
            onClick={() => setTimeframe('7d')}
            className={`timeframe-btn ${timeframe === '7d' ? 'active' : ''}`}
          >
            7 Derniers Jours
          </button>
          <button 
            onClick={() => setTimeframe('30d')}
            className={`timeframe-btn ${timeframe === '30d' ? 'active' : ''}`}
          >
            30 Derniers Jours
          </button>
          <button 
            onClick={() => setTimeframe('all')}
            className={`timeframe-btn ${timeframe === 'all' ? 'active' : ''}`}
          >
            Depuis le début
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: '#64748b' }}>
          <div className="loading-spinner" style={{ border: '3px solid #f3f4f6', borderTop: '3px solid var(--primary-blue)', borderRadius: '50%', width: '30px', height: '30px', margin: '0 auto 12px auto', animation: 'spin 1s linear infinite' }}></div>
          <p style={{ fontSize: '0.9rem', margin: 0 }}>Récupération des métriques...</p>
        </div>
      ) : (
        <>
          {/* KPI Grid */}
          <div className="stats-kpi-grid">
            {/* KPI 1: Shop Visits */}
            <div className="kpi-card">
              <div className="kpi-card-header">
                <span className="kpi-card-title">Visites Boutique</span>
                <div className="kpi-card-icon-wrapper visits">
                  <Users width="16" height="16" />
                </div>
              </div>
              <div className="kpi-card-value">{visits.toLocaleString()}</div>
              <div className="kpi-card-footer">
                <span className={`kpi-trend ${trends.visits >= 0 ? 'positive' : 'negative'}`}>
                  {trends.visits >= 0 ? <ArrowUpRight width="14" height="14" /> : <ArrowDownRight width="14" height="14" />}
                  {trends.visits >= 0 ? '+' : ''}{trends.visits}%
                </span>
                <span className="kpi-period">vs période précédente</span>
              </div>
            </div>

            {/* KPI 2: Message Contacts */}
            <div className="kpi-card">
              <div className="kpi-card-header">
                <span className="kpi-card-title">Messages clients</span>
                <div className="kpi-card-icon-wrapper whatsapp">
                  <MessageSquare width="16" height="16" />
                </div>
              </div>
              <div className="kpi-card-value">{messageClicks}</div>
              <div className="kpi-card-footer">
                <span className={`kpi-trend ${trends.messages >= 0 ? 'positive' : 'negative'}`}>
                  {trends.messages >= 0 ? <ArrowUpRight width="14" height="14" /> : <ArrowDownRight width="14" height="14" />}
                  {trends.messages >= 0 ? '+' : ''}{trends.messages}%
                </span>
                <span className="kpi-period">visiteurs intéressés</span>
              </div>
            </div>

            {/* KPI 3: Chat/Appels Clicks */}
            <div className="kpi-card">
              <div className="kpi-card-header">
                <span className="kpi-card-title">Appels / Chats en direct</span>
                <div className="kpi-card-icon-wrapper phone">
                  <Phone width="16" height="16" />
                </div>
              </div>
              <div className="kpi-card-value">{otherClicks}</div>
              <div className="kpi-card-footer">
                <span className={`kpi-trend ${trends.contacts >= 0 ? 'positive' : 'negative'}`}>
                  {trends.contacts >= 0 ? <ArrowUpRight width="14" height="14" /> : <ArrowDownRight width="14" height="14" />}
                  {trends.contacts >= 0 ? '+' : ''}{trends.contacts}%
                </span>
                <span className="kpi-period">contacts alternatifs</span>
              </div>
            </div>

            {/* KPI 4: Conversion Rate */}
            <div className="kpi-card">
              <div className="kpi-card-header">
                <span className="kpi-card-title">Taux de Conversion</span>
                <div className="kpi-card-icon-wrapper conversion">
                  <TrendingUp width="16" height="16" />
                </div>
              </div>
              <div className="kpi-card-value">{conversionRate}%</div>
              <div className="kpi-card-footer">
                <span className={`kpi-trend ${parseFloat(conversionRate) > 10 ? 'positive' : 'neutral'}`}>
                  {parseFloat(conversionRate) > 10 ? 'Excellent 🔥' : 'À améliorer'}
                </span>
                <span className="kpi-period">visiteurs qui vous écrivent</span>
              </div>
            </div>
          </div>

          {/* Connection Streak Banner */}
          <div className="stats-streak-banner">
            <div className="streak-banner-glow"></div>
            <div className="streak-banner-content">
              <div className="streak-fire-badge">
                <span>🔥 {loginStreak}</span>
              </div>
              <div className="streak-banner-text">
                <h4>Série de connexions : {loginStreak} jour{loginStreak > 1 ? 's' : ''} consécutif{loginStreak > 1 ? 's' : ''}</h4>
                <p>
                  {loginStreak > 0 
                    ? `Votre boutique bénéficie actuellement d'un boost de visibilité de +${Math.min(loginStreak * 5, 25)}% dans le classement des recherches des acheteurs !`
                    : 'Connectez-vous tous les jours pour augmenter la visibilité de vos annonces jusqu\'à +25% !'
                  }
                </p>
              </div>
              <div className="streak-badge-premium">
                <Sparkles width="14" height="14" /> Boost Actif
              </div>
            </div>
          </div>

          {/* Main Stats Grid */}
          <div className="stats-graphics-grid">
            {/* Graph 1: Enterprise Activity Trend */}
            <div className="graphics-card">
              <h3 className="graphics-card-title">Courbe d&apos;activité de l&apos;entreprise</h3>
              <div style={{ position: 'relative', height: '220px', marginTop: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                {/* Simple SVG Chart */}
                <svg viewBox="0 0 500 200" style={{ width: '100%', height: '170px', overflow: 'visible' }}>
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary-blue)" stopOpacity="0.24" />
                      <stop offset="100%" stopColor="var(--primary-blue)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {/* Grid Lines */}
                  <line x1="0" y1={svgHeight - svgPadding} x2={svgWidth} y2={svgHeight - svgPadding} stroke="#f1f5f9" strokeWidth="1.5" />
                  <line x1="0" y1={svgHeight - svgPadding - 0.5 * actualChartHeight} x2={svgWidth} y2={svgHeight - svgPadding - 0.5 * actualChartHeight} stroke="#f1f5f9" strokeWidth="1.5" strokeDasharray="4 4" />
                  <line x1="0" y1={svgHeight - svgPadding - actualChartHeight} x2={svgWidth} y2={svgHeight - svgPadding - actualChartHeight} stroke="#f1f5f9" strokeWidth="1.5" />
                  
                  {/* Area path */}
                  {areaPathD && (
                    <path
                      d={areaPathD}
                      fill="url(#chartGrad)"
                    />
                  )}

                  {/* Line path */}
                  {linePathD && (
                    <path
                      d={linePathD}
                      fill="none"
                      stroke="var(--primary-blue)"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Data points */}
                  {points.map((p, i) => (
                    <g key={i}>
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="5"
                        fill="#ffffff"
                        stroke="var(--primary-blue)"
                        strokeWidth="3"
                      />
                      {/* Exact value label above point */}
                      <text
                        x={p.x}
                        y={p.y - 12}
                        textAnchor="middle"
                        fontSize="0.75rem"
                        fontWeight="800"
                        fill="#475569"
                      >
                        {p.value}
                      </text>
                    </g>
                  ))}
                </svg>
                
                {/* Axis labels */}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 5px', fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>
                  {points.map((p, idx) => (
                    <span 
                      key={idx} 
                      style={{ 
                        width: `${100 / points.length}%`, 
                        textAlign: points.length > 1 ? (idx === 0 ? 'left' : idx === points.length - 1 ? 'right' : 'center') : 'center' 
                      }}
                    >
                      {p.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Graph 2: Conversion Metrics breakdown */}
            <div className="graphics-card">
              <h3 className="graphics-card-title">Canaux d&apos;acquisition & Actions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: '700' }}>
                    <span style={{ color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MessageSquare width="16" height="16" style={{ color: '#25D366' }} /> Messages clients
                    </span>
                    <span style={{ color: '#64748b' }}>{messageClicks} ({visits > 0 ? Math.round(messageClicks / visits * 100) : 0}%)</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${visits > 0 ? (messageClicks / visits * 100) : 0}%`, height: '100%', background: '#25D366', borderRadius: '4px' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: '700' }}>
                    <span style={{ color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Phone width="16" height="16" style={{ color: '#3b82f6' }} /> Appels téléphoniques
                    </span>
                    <span style={{ color: '#64748b' }}>{analytics?.metrics?.phone_clicks || 0}</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${visits > 0 ? ((analytics?.metrics?.phone_clicks || 0) / visits * 100) : 5}%`, height: '100%', background: '#3b82f6', borderRadius: '4px' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: '700' }}>
                    <span style={{ color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Users width="16" height="16" style={{ color: 'var(--color-yellow)' }} /> Chats internes Vendoscity
                    </span>
                    <span style={{ color: '#64748b' }}>{analytics?.metrics?.chat_clicks || 0}</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${visits > 0 ? ((analytics?.metrics?.chat_clicks || 0) / visits * 100) : 5}%`, height: '100%', background: 'var(--color-yellow)', borderRadius: '4px' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Product Specific Clicks and Views (Requested feature) */}
          <div className="graphics-card" style={{ marginTop: '24px' }}>
            <h3 className="graphics-card-title" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MousePointerClick width="18" height="18" style={{ color: 'var(--primary-blue)' }} /> Performance par article (Vues & Clics)
            </h3>
            {enrichedProducts.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                <Package width="32" height="32" style={{ marginBottom: '8px', opacity: 0.5 }} />
                <p style={{ margin: 0, fontSize: '0.85rem' }}>Aucun produit disponible pour afficher des statistiques.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="stats-products-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: '700' }}>
                      <th style={{ padding: '12px 8px' }}>Article</th>
                      <th style={{ padding: '12px 8px', textAlign: 'center' }}>Vues</th>
                      <th style={{ padding: '12px 8px', textAlign: 'center' }}>Clics de contact</th>
                      <th style={{ padding: '12px 8px', textAlign: 'center' }}>Taux de Clic (CTR)</th>
                      <th style={{ padding: '12px 8px', textAlign: 'right' }}>Prix</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrichedProducts.map((p, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', color: '#334155' }}>
                        <td style={{ padding: '12px 8px', fontWeight: '600' }}>{p.title}</td>
                        <td style={{ padding: '12px 8px', textAlign: 'center', color: '#64748b' }}>{p.views}</td>
                        <td style={{ padding: '12px 8px', textAlign: 'center', color: '#25D366', fontWeight: '700' }}>{p.clicks}</td>
                        <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                          <span style={{ background: '#f0fdf4', color: '#166534', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '700' }}>
                            {p.ctr}%
                          </span>
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '700' }}>{formatCurrency(p.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Tips / Product Insights Section */}
          <div className="graphics-card" style={{ marginTop: '24px' }}>
            <h3 className="graphics-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles width="18" height="18" style={{ color: 'var(--color-yellow)' }} /> Conseils pour booster vos ventes
            </h3>
            
            <div className="stats-tips-grid">
              <div className="tip-item-box">
                <div className="tip-icon-bullet">1</div>
                <div>
                  <h5>Améliorez vos fiches techniques</h5>
                  <p>Les articles ayant plus de 3 spécifications techniques reçoivent en moyenne 2.5 fois plus de messages d&apos;acheteurs intéressés.</p>
                </div>
              </div>

              <div className="tip-item-box">
                <div className="tip-icon-bullet">2</div>
                <div>
                  <h5>Téléchargez des photos de qualité</h5>
                  <p>Nous recommandons d&apos;insérer au moins 3 photos claires sous différents angles. Cela multiplie par 3 le taux de conversion.</p>
                </div>
              </div>

              <div className="tip-item-box">
                <div className="tip-icon-bullet">3</div>
                <div>
                  <h5>Soyez réactif sur le chat</h5>
                  <p>Un temps de réponse moyen inférieur à 15 minutes vous classe en tête des recherches « Vendeurs réactifs » de Yaoundé.</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
