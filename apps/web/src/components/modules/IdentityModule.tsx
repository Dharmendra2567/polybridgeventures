import { Check, X } from 'lucide-react';

export const IdentityModule: React.FC = () => {
  const departments = [
    {
      name: 'Executive Management',
      head: 'Rahul Patel (Managing Partner)',
      subdepartments: ['Managing Desk', 'Corporate Strategy'],
      designations: ['Managing Partner (Level 5)', 'Executive Director (Level 5)'],
      approvalLimit: '$500,000 USD',
      scope: 'GLOBAL',
    },
    {
      name: 'International Sales & Trading',
      head: 'Amit Sharma (Senior Export Trader)',
      subdepartments: ['Spices & Ground Powders Desk', 'Fresh Produce Desk', 'Industrial Packaging Desk'],
      designations: ['Senior Export Trader (Level 4)', 'Trade Executive (Level 2)'],
      approvalLimit: '$100,000 USD',
      scope: 'TEAM_AND_SUBORDINATES',
    },
    {
      name: 'Sourcing & Supplier Coordination',
      head: 'Priya Desai (Sourcing Specialist)',
      subdepartments: ['Vendor Relations', 'Quality & Sampling Desk'],
      designations: ['Sourcing Specialist (Level 3)', 'Procurement Officer (Level 2)'],
      approvalLimit: '$50,000 USD',
      scope: 'DEPARTMENT',
    },
    {
      name: 'Logistics & Shipping Operations',
      head: 'Vikram Joshi (Logistics Officer)',
      subdepartments: ['Port Coordination', 'Customs & Documentation'],
      designations: ['Logistics Officer (Level 2)', 'Documentation Executive (Level 1)'],
      approvalLimit: '$25,000 USD',
      scope: 'DEPARTMENT',
    },
  ];

  const permissions = [
    { role: 'Managing Partner (Admin)', quoteApprove: true, convertSO: true, issuePO: true, recordPay: true, dataScope: 'GLOBAL', level: 'Level 5' },
    { role: 'Senior Export Trader', quoteApprove: false, convertSO: true, issuePO: false, recordPay: false, dataScope: 'TEAM_AND_SUBORDINATES', level: 'Level 4' },
    { role: 'Sourcing Specialist', quoteApprove: false, convertSO: false, issuePO: true, recordPay: false, dataScope: 'DEPARTMENT', level: 'Level 3' },
    { role: 'Logistics Officer', quoteApprove: false, convertSO: false, issuePO: false, recordPay: false, dataScope: 'DEPARTMENT', level: 'Level 2' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Departments & Subdepartments Hierarchy */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Polybridge Ventures LLP Corporate Organization Tree
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem', padding: '1.5rem' }}>
          {departments.map((d) => (
            <div key={d.name} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                {d.name}
              </div>
              <div style={{ fontSize: '0.825rem', color: 'var(--primary-light)', marginBottom: '0.75rem', fontWeight: 600 }}>
                Desk Lead: {d.head}
              </div>

              <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem', fontWeight: 700 }}>
                Subdepartments:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.85rem' }}>
                {d.subdepartments.map((sub) => (
                  <span key={sub} className="badge badge-subtle">{sub}</span>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Approval Cap: <strong style={{ color: 'var(--text-primary)' }}>{d.approvalLimit}</strong></span>
                <span style={{ color: 'var(--text-secondary)' }}>Scope: <strong style={{ color: 'var(--primary-light)' }}>{d.scope}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Permission Matrix */}
      <div className="table-card">
        <div style={{ padding: '1.15rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              RBAC Permission & Commercial Delegation Matrix
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Enforced by Fastify enterprise RBAC guards and OWASP ASVS access control verification
            </span>
          </div>
          <span className="badge badge-primary">Level 1 - 5 Hierarchy</span>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Designation / Role</th>
                <th>Access Level</th>
                <th style={{ textAlign: 'center' }}>Approve Low-Margin Quotes</th>
                <th style={{ textAlign: 'center' }}>Convert Quotes to SO</th>
                <th style={{ textAlign: 'center' }}>Issue Supplier PO</th>
                <th style={{ textAlign: 'center' }}>Allocate Payment</th>
                <th>Data Scope</th>
              </tr>
            </thead>
            <tbody>
              {permissions.map((p) => (
                <tr key={p.role}>
                  <td>
                    <div className="cell-primary">{p.role}</div>
                  </td>
                  <td>
                    <span className="badge badge-subtle">{p.level}</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {p.quoteApprove ? (
                      <span className="badge badge-success"><Check size={13} /> Allowed</span>
                    ) : (
                      <span className="badge badge-subtle" style={{ color: 'var(--text-muted)' }}><X size={13} /> Blocked</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {p.convertSO ? (
                      <span className="badge badge-success"><Check size={13} /> Allowed</span>
                    ) : (
                      <span className="badge badge-subtle" style={{ color: 'var(--text-muted)' }}><X size={13} /> Blocked</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {p.issuePO ? (
                      <span className="badge badge-success"><Check size={13} /> Allowed</span>
                    ) : (
                      <span className="badge badge-subtle" style={{ color: 'var(--text-muted)' }}><X size={13} /> Blocked</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {p.recordPay ? (
                      <span className="badge badge-success"><Check size={13} /> Allowed</span>
                    ) : (
                      <span className="badge badge-subtle" style={{ color: 'var(--text-muted)' }}><X size={13} /> Blocked</span>
                    )}
                  </td>
                  <td>
                    <span className="badge badge-primary">{p.dataScope}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
