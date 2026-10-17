import { PieChart, Globe2 } from 'lucide-react';


export const AnalyticsModule: React.FC = () => {
  const categories = [
    { name: 'Indian Spices (Whole & Ground)', share: '54%', revenue: '$100,800', margin: '19.4%', color: 'var(--primary)' },
    { name: 'Fresh Fruits (Bhagwa Pomegranate / Banana)', share: '24%', revenue: '$44,700', margin: '15.8%', color: '#10b981' },
    { name: 'Industrial Packaging (FIBC / PP Bags)', share: '14%', revenue: '$26,100', margin: '22.0%', color: '#f59e0b' },
    { name: 'Fresh Vegetables (Nashik Onions / Ginger)', share: '8%', revenue: '$14,900', margin: '18.2%', color: '#06b6d4' },
  ];

  const exportDestinations = [
    { country: 'United Arab Emirates (Jebel Ali)', orders: 4, value: '$114,800', share: '61%' },
    { country: 'Netherlands (Port of Rotterdam)', orders: 2, value: '$41,000', share: '22%' },
    { country: 'Norway (Oslo Havn)', orders: 1, value: '$28,500', share: '15%' },
    { country: 'Singapore (Jurong Port)', orders: 1, value: '$65,200', share: '—' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Grid: Commodity Breakdown & Top Export Countries */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        {/* Commodity Performance */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Export Revenue by Commodity Category</h3>
            <PieChart size={18} color="var(--primary-light)" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {categories.map((c) => (
              <div key={c.name} style={{ background: 'var(--bg-tertiary)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{c.name}</span>
                  <span style={{ fontWeight: 700, color: 'var(--primary-light)' }}>{c.revenue}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <span>Volume Share: {c.share}</span>
                  <span style={{ color: 'var(--success)' }}>Avg Margin: {c.margin}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Destination Ports */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Top Overseas Destination Markets</h3>
            <Globe2 size={18} color="var(--primary-light)" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {exportDestinations.map((d) => (
              <div key={d.country} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', borderBottom: '1px solid var(--border-subtle)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{d.country}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{d.orders} Shipments Processed</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{d.value}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--primary-light)' }}>{d.share} of total trade</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
