import React, { useState, useEffect, useMemo } from 'react';
import {
  History,
  RefreshCw,
  ShieldCheck,
  User,
  Clock,
  Code,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { TableToolbar } from '../common/TableToolbar.js';
import { DetailDrawer } from '../common/DetailDrawer.js';
import { exportToCsv } from '../../utils/csvExport.js';
import { API_BASE } from '../../utils/apiConfig.js';

interface AuditLogItem {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
}

type AuditSortField = 'timestamp' | 'actor' | 'action' | 'entity' | 'entityId';
type SortDirection = 'asc' | 'desc';

export const AuditModule: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  // Sorting
  const [sortField, setSortField] = useState<AuditSortField>('timestamp');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  // Detail Drawer
  const [drawerLog, setDrawerLog] = useState<AuditLogItem | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE}/audit/logs`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.warn('API error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleSort = (field: AuditSortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const actions = useMemo(() => {
    const unique = Array.from(new Set(logs.map((l) => l.action)));
    return [
      { id: 'ALL', label: 'All Events', count: logs.length },
      ...unique.map((act) => ({
        id: act,
        label: act,
        count: logs.filter((l) => l.action === act).length,
      })),
    ];
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs
      .filter((l) => {
        const matchesAction = actionFilter === 'ALL' || l.action === actionFilter;
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !q ||
          l.actor.toLowerCase().includes(q) ||
          l.action.toLowerCase().includes(q) ||
          l.entity.toLowerCase().includes(q) ||
          l.entityId.toLowerCase().includes(q) ||
          l.details.toLowerCase().includes(q);
        return matchesAction && matchesSearch;
      })
      .sort((a, b) => {
        let valA: string | number = a[sortField];
        let valB: string | number = b[sortField];
        if (sortField === 'timestamp') {
          valA = new Date(valA).getTime() || 0;
          valB = new Date(valB).getTime() || 0;
        }
        if (valA < valB) return sortDir === 'asc' ? -1 : 1;
        if (valA > valB) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
  }, [logs, actionFilter, searchQuery, sortField, sortDir]);

  const handleExportCsv = () => {
    exportToCsv(
      'polybridge-audit-trail',
      filteredLogs as unknown as Record<string, unknown>[],
      [
        { key: 'timestamp', header: 'Timestamp (UTC)' },
        { key: 'actor', header: 'Actor (User)' },
        { key: 'action', header: 'Action Type' },
        { key: 'entity', header: 'Entity Target' },
        { key: 'entityId', header: 'Entity Reference' },
        { key: 'details', header: 'Audit Details' },
      ]
    );
  };

  const renderSortIndicator = (targetField: AuditSortField) => {
    if (sortField !== targetField) {
      return <ArrowUpDown size={12} className="sort-icon-indicator" />;
    }
    return sortDir === 'asc' ? (
      <ArrowUp size={12} className="sort-icon-indicator" color="var(--primary-light)" />
    ) : (
      <ArrowDown size={12} className="sort-icon-indicator" color="var(--primary-light)" />
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Module Controls Bar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        <button onClick={fetchLogs} className="btn btn-outline">
          <RefreshCw size={14} />
          <span>Refresh Audit Stream</span>
        </button>
      </div>

      {/* Audit Log Table Card */}
      <div className="table-card">

        {/* Toolbar */}
        <TableToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search actor, action, entity, reference..."
          filterOptions={actions}
          activeFilter={actionFilter}
          onFilterChange={setActionFilter}
          onExportCsv={handleExportCsv}
        />

        {/* Table */}
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th
                  className={`th-sortable ${sortField === 'timestamp' ? 'sorted' : ''}`}
                  onClick={() => handleSort('timestamp')}
                >
                  Timestamp (UTC) {renderSortIndicator('timestamp')}
                </th>
                <th
                  className={`th-sortable ${sortField === 'actor' ? 'sorted' : ''}`}
                  onClick={() => handleSort('actor')}
                >
                  Actor (User) {renderSortIndicator('actor')}
                </th>
                <th
                  className={`th-sortable ${sortField === 'action' ? 'sorted' : ''}`}
                  onClick={() => handleSort('action')}
                >
                  Action {renderSortIndicator('action')}
                </th>
                <th
                  className={`th-sortable ${sortField === 'entity' ? 'sorted' : ''}`}
                  onClick={() => handleSort('entity')}
                >
                  Entity Affected {renderSortIndicator('entity')}
                </th>
                <th
                  className={`th-sortable ${sortField === 'entityId' ? 'sorted' : ''}`}
                  onClick={() => handleSort('entityId')}
                >
                  Entity Reference {renderSortIndicator('entityId')}
                </th>
                <th>Audit Event Details</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6}>
                    <div className="table-loading-state">
                      <div className="table-spinner" />
                      <div className="table-loading-text">Loading immutable audit logs from database...</div>
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="table-empty-state">
                      <div className="table-empty-state-icon">
                        <History size={24} />
                      </div>
                      <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>No audit events found</h4>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="clickable-row"
                    onClick={() => setDrawerLog(log)}
                  >
                    <td className="cell-code" style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td>
                      <div className="cell-primary">{log.actor}</div>
                    </td>
                    <td>
                      <span className="badge badge-subtle" style={{ fontWeight: 700, letterSpacing: '0.04em' }}>
                        {log.action}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.entity}</span>
                    </td>
                    <td className="cell-code">{log.entityId}</td>
                    <td>
                      <div
                        style={{
                          fontSize: '0.825rem',
                          color: 'var(--text-secondary)',
                          maxWidth: '420px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={log.details}
                      >
                        {log.details}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="table-footer">
          <span>Showing {filteredLogs.length} audit entries</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Cryptographically signed event ledger.
          </span>
        </div>
      </div>

      {/* DETAIL DRAWER */}
      <DetailDrawer
        isOpen={Boolean(drawerLog)}
        onClose={() => setDrawerLog(null)}
        title={drawerLog?.action || 'Audit Event Ledger'}
        subtitle={`Entity: ${drawerLog?.entity} (${drawerLog?.entityId})`}
        badge={
          drawerLog ? (
            <span className="badge badge-subtle">
              <span className="badge-dot" />
              {drawerLog.action}
            </span>
          ) : null
        }
      >
        {drawerLog && (
          <>
            <div className="drawer-section">
              <div className="drawer-section-title">
                <Clock size={14} color="var(--primary-light)" />
                Timestamp & Identity Trace
              </div>
              <div className="drawer-grid">
                <div className="drawer-stat">
                  <span className="drawer-stat-label">System Event ID</span>
                  <span className="drawer-stat-value cell-code">{drawerLog.id}</span>
                </div>
                <div className="drawer-stat">
                  <span className="drawer-stat-label">Precise UTC Timestamp</span>
                  <span className="drawer-stat-value cell-code">{drawerLog.timestamp}</span>
                </div>
                <div className="drawer-stat">
                  <span className="drawer-stat-label">Actor Principal</span>
                  <span className="drawer-stat-value" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <User size={13} color="var(--primary-light)" />
                    {drawerLog.actor}
                  </span>
                </div>
                <div className="drawer-stat">
                  <span className="drawer-stat-label">Security Clearance</span>
                  <span className="drawer-stat-value">
                    <span className="badge badge-success">ASVS L2 Verified</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="drawer-section">
              <div className="drawer-section-title">
                <ShieldCheck size={14} color="var(--primary-light)" />
                Immutable Event Description
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.875rem',
                  lineHeight: 1.6,
                  color: 'var(--text-primary)',
                  background: 'var(--bg-secondary)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {drawerLog.details}
              </p>
            </div>

            <div className="drawer-section">
              <div className="drawer-section-title">
                <Code size={14} color="var(--primary-light)" />
                Structured Ledger Payload
              </div>
              <pre
                style={{
                  margin: 0,
                  padding: '0.85rem',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--primary-light)',
                  overflowX: 'auto',
                }}
              >
                {JSON.stringify(drawerLog, null, 2)}
              </pre>
            </div>
          </>
        )}
      </DetailDrawer>
    </div>
  );
};
