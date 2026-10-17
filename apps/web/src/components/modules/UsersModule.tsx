import React, { useState, useEffect, useMemo } from 'react';
import {
  UserCog,
  Plus,
  Mail,
  Phone,
  Shield,
  DollarSign,
  Pencil,
  Trash2,
  CheckCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  Briefcase,
  UserCheck,
} from 'lucide-react';
import { TableToolbar, FilterOption } from '../common/TableToolbar.js';
import { DetailDrawer } from '../common/DetailDrawer.js';
import { exportToCsv } from '../../utils/csvExport.js';

export interface InternalUser {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  department: string;
  subdepartment: string;
  designation: string;
  role: string;
  dataScope: string;
  approvalLimit: number;
  reportingTo?: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
  isMfaEnabled?: boolean;
  createdAt?: string;
}

const DEPARTMENTS_DATA: Record<string, { subdepartments: string[]; defaultDesignations: string[] }> = {
  'Executive Management': {
    subdepartments: ['Managing Desk', 'Corporate Strategy', 'Partner Governance'],
    defaultDesignations: ['Managing Partner', 'Executive Director', 'Senior Partner'],
  },
  'International Sales': {
    subdepartments: ['Spices & Agro Desk', 'Fresh Produce Desk', 'Industrial Packaging Desk'],
    defaultDesignations: ['Senior Export Trader', 'Export Sales Executive', 'Trade Desk Lead'],
  },
  'Sourcing & Procurement': {
    subdepartments: ['Vendor Relations', 'Quality & Sampling Desk', 'Domestic APMC Sourcing'],
    defaultDesignations: ['Sourcing Specialist', 'Procurement Manager', 'Vendor Auditor'],
  },
  'Logistics & Fulfilment': {
    subdepartments: ['Shipping Operations', 'Port Coordination', 'Customs & Documentation Desk'],
    defaultDesignations: ['Logistics Officer', 'Documentation Executive', 'Port Agent Specialist'],
  },
  'Trade Finance': {
    subdepartments: ['Letter of Credit & Treasury', 'Invoicing & Receivables', 'FX & Hedging'],
    defaultDesignations: ['Finance Controller', 'Treasury Manager', 'Credit Risk Analyst'],
  },
  'Governance & Compliance': {
    subdepartments: ['Sanctions & KYC Screening', 'Regulatory ASVS Audit', 'Trade Contracts & Legal'],
    defaultDesignations: ['Compliance Officer', 'Legal Counsel', 'Governance Auditor'],
  },
};

const SYSTEM_ROLES = [
  { value: 'ADMINISTRATOR', label: 'Administrator (Firm-wide Authority)' },
  { value: 'SALES_MANAGER', label: 'Sales Manager (Commercial Desk)' },
  { value: 'PROCUREMENT_MANAGER', label: 'Procurement Manager (Sourcing)' },
  { value: 'OPERATIONS_SPECIALIST', label: 'Operations Specialist (Logistics)' },
  { value: 'FINANCE_CONTROLLER', label: 'Finance Controller (Treasury/LC)' },
  { value: 'AUDITOR', label: 'Auditor (KYC/Sanctions/Governance)' },
  { value: 'TRADER', label: 'Trader (Execution Desk)' },
  { value: 'VIEWER', label: 'Viewer (Read Only)' },
];

const DATA_SCOPES = [
  { value: 'GLOBAL', label: 'GLOBAL (Unrestricted Multi-Desk Access)' },
  { value: 'TEAM_AND_SUBORDINATES', label: 'TEAM & SUBORDINATES (Desk & Direct Reports)' },
  { value: 'DEPARTMENT', label: 'DEPARTMENT (Department Scoped Only)' },
];

type SortField = 'name' | 'email' | 'department' | 'designation' | 'role' | 'approvalLimit' | 'status' | 'createdAt';
type SortDirection = 'asc' | 'desc';

export const UsersModule: React.FC = () => {
  const [users, setUsers] = useState<InternalUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED' | 'INACTIVE'>('ALL');

  // Sorting
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');

  // Selection
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Drawer / Modals
  const [drawerUser, setDrawerUser] = useState<InternalUser | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<InternalUser | null>(null);

  // Form states for Add / Edit
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formDept, setFormDept] = useState('International Sales');
  const [formSubdept, setFormSubdept] = useState('Spices & Agro Desk');
  const [formDesignation, setFormDesignation] = useState('Senior Export Trader');
  const [formRole, setFormRole] = useState('SALES_MANAGER');
  const [formDataScope, setFormDataScope] = useState('TEAM_AND_SUBORDINATES');
  const [formApprovalLimit, setFormApprovalLimit] = useState<number>(100000);
  const [formReportingTo, setFormReportingTo] = useState('Rahul Patel');
  const [formStatus, setFormStatus] = useState<'ACTIVE' | 'SUSPENDED' | 'INACTIVE'>('ACTIVE');
  const [formMfa, setFormMfa] = useState<boolean>(true);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch {
      showToast('Error connecting to backend services.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Update subdepartments and designations automatically when department changes in form
  const handleDeptChange = (dept: string) => {
    setFormDept(dept);
    const conf = DEPARTMENTS_DATA[dept];
    if (conf) {
      if (conf.subdepartments[0]) setFormSubdept(conf.subdepartments[0]);
      if (conf.defaultDesignations[0]) setFormDesignation(conf.defaultDesignations[0]);
    }
  };

  // Reset form to defaults
  const resetForm = () => {
    setFormName('');
    setFormEmail('');
    setFormPhone('+91 98');
    setFormDept('International Sales');
    setFormSubdept('Spices & Agro Desk');
    setFormDesignation('Senior Export Trader');
    setFormRole('SALES_MANAGER');
    setFormDataScope('TEAM_AND_SUBORDINATES');
    setFormApprovalLimit(100000);
    setFormReportingTo('Rahul Patel');
    setFormStatus('ACTIVE');
    setFormMfa(true);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleOpenEdit = (user: InternalUser) => {
    setEditingUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormPhone(user.phone || '');
    setFormDept(user.department);
    setFormSubdept(user.subdepartment);
    setFormDesignation(user.designation);
    setFormRole(user.role);
    setFormDataScope(user.dataScope);
    setFormApprovalLimit(user.approvalLimit || 0);
    setFormReportingTo(user.reportingTo || 'Rahul Patel');
    setFormStatus(user.status || 'ACTIVE');
    setFormMfa(user.isMfaEnabled !== false);
    setShowEditModal(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) {
      showToast('Name and email are required.');
      return;
    }

    try {
      const res = await fetch('/api/v1/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          email: formEmail.trim(),
          phone: formPhone.trim(),
          department: formDept,
          subdepartment: formSubdept,
          designation: formDesignation,
          role: formRole,
          dataScope: formDataScope,
          approvalLimit: Number(formApprovalLimit),
          reportingTo: formReportingTo,
          status: formStatus,
          isMfaEnabled: formMfa,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setUsers((prev) => [data.user, ...prev]);
        setShowAddModal(false);
        resetForm();
        showToast(`Internal user ${data.user.name} added successfully.`);
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to create user account.');
      }
    } catch {
      showToast('Failed to create user account due to network error.');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const res = await fetch(`/api/v1/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          email: formEmail.trim(),
          phone: formPhone.trim(),
          department: formDept,
          subdepartment: formSubdept,
          designation: formDesignation,
          role: formRole,
          dataScope: formDataScope,
          approvalLimit: Number(formApprovalLimit),
          reportingTo: formReportingTo,
          status: formStatus,
          isMfaEnabled: formMfa,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? data.user : u)));
        if (drawerUser && drawerUser.id === editingUser.id) {
          setDrawerUser(data.user);
        }
        setShowEditModal(false);
        setEditingUser(null);
        showToast(`User profile for ${data.user.name} updated.`);
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to update user profile.');
      }
    } catch {
      showToast('Error updating user profile.');
    }
  };

  const handleDirectUpdateStatus = async (userId: string, newStatus: InternalUser['status']) => {
    try {
      const res = await fetch(`/api/v1/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        const data = await res.json();
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u)));
        if (drawerUser && drawerUser.id === userId) {
          setDrawerUser({ ...drawerUser, status: newStatus });
        }
        showToast(`Status updated to ${newStatus} for ${data.user.name}.`);
      } else {
        const err = await res.json();
        showToast(err.error || 'Cannot change status.');
      }
    } catch {
      showToast('Network error updating status.');
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Are you sure you want to permanently remove user account: "${userName}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/users/${userId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        setSelectedUserIds((prev) => prev.filter((id) => id !== userId));
        if (drawerUser && drawerUser.id === userId) {
          setDrawerUser(null);
        }
        showToast(`User account "${userName}" removed.`);
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to delete user.');
      }
    } catch {
      showToast('Network error while deleting user.');
    }
  };

  // Bulk actions
  const handleBulkStatus = async (status: InternalUser['status']) => {
    for (const id of selectedUserIds) {
      await handleDirectUpdateStatus(id, status);
    }
    setSelectedUserIds([]);
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedUserIds.length} selected user accounts?`)) return;
    for (const id of selectedUserIds) {
      const user = users.find((u) => u.id === id);
      if (user) await handleDeleteUser(id, user.name);
    }
    setSelectedUserIds([]);
  };

  // Filtering & Sorting
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.department.toLowerCase().includes(q) ||
        u.subdepartment.toLowerCase().includes(q) ||
        u.designation.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        (u.phone && u.phone.toLowerCase().includes(q));

      const matchesDept = departmentFilter === 'ALL' || u.department === departmentFilter;
      const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;

      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [users, searchQuery, departmentFilter, statusFilter]);

  const sortedUsers = useMemo(() => {
    const list = [...filteredUsers];
    list.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (sortField === 'approvalLimit') {
        const diff = (a.approvalLimit || 0) - (b.approvalLimit || 0);
        return sortDir === 'asc' ? diff : -diff;
      }
      aVal = String(aVal || '').toLowerCase();
      bVal = String(bVal || '').toLowerCase();
      const comp = aVal.localeCompare(bVal);
      return sortDir === 'asc' ? comp : -comp;
    });
    return list;
  }, [filteredUsers, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown size={12} className="sort-icon inactive" />;
    }
    return sortDir === 'asc' ? (
      <ArrowUp size={12} className="sort-icon active" />
    ) : (
      <ArrowDown size={12} className="sort-icon active" />
    );
  };

  // CSV Export
  const handleExportCsv = () => {
    exportToCsv(
      'polybridge-internal-users',
      sortedUsers as unknown as Record<string, unknown>[],
      [
        { key: 'id', header: 'User ID' },
        { key: 'name', header: 'Full Name' },
        { key: 'email', header: 'Work Email' },
        { key: 'phone', header: 'Phone Number' },
        { key: 'department', header: 'Department' },
        { key: 'subdepartment', header: 'Subdepartment' },
        { key: 'designation', header: 'Designation' },
        { key: 'role', header: 'Role' },
        { key: 'dataScope', header: 'Data Scope' },
        { key: 'approvalLimit', header: 'Commercial Approval Limit (USD)' },
        { key: 'status', header: 'Account Status' },
        { key: 'reportingTo', header: 'Reporting To' },
        { key: 'createdAt', header: 'Created At' },
      ]
    );
  };

  // Filter Chips for Toolbar
  const filterOptions: FilterOption[] = useMemo(() => {
    const deptCounts: Record<string, number> = {};
    users.forEach((u) => {
      deptCounts[u.department] = (deptCounts[u.department] || 0) + 1;
    });

    const opts: FilterOption[] = [
      { id: 'ALL', label: 'All Departments', count: users.length },
      ...Object.keys(DEPARTMENTS_DATA).map((dept) => ({
        id: dept,
        label: dept.replace('International ', '').replace('Sourcing & ', '').replace('Logistics & ', ''),
        count: deptCounts[dept] || 0,
      })),
    ];
    return opts;
  }, [users]);

  // Overall Stats
  const activeCount = users.filter((u) => u.status === 'ACTIVE').length;
  const totalApprovalAllocation = users.reduce((sum, u) => sum + (u.approvalLimit || 0), 0);
  const globalScopeCount = users.filter((u) => u.dataScope === 'GLOBAL').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '1.5rem',
            right: '1.5rem',
            zIndex: 9999,
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-glow)',
            boxShadow: 'var(--shadow-lg)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1.25rem',
            color: 'var(--text-primary)',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <CheckCircle size={16} color="var(--success)" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* KPI Stats Overview Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '1rem',
        }}
      >
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Total Internal Users
            </span>
            <UserCog size={18} color="var(--primary-light)" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, marginTop: '0.35rem', color: 'var(--text-primary)' }}>
            {users.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            {activeCount} active • {users.length - activeCount} suspended/inactive
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Active Ratio
            </span>
            <UserCheck size={18} color="var(--success)" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, marginTop: '0.35rem', color: 'var(--success)' }}>
            {users.length > 0 ? Math.round((activeCount / users.length) * 100) : 0}%
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Identity-verified trading personnel
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Global Authority Scope
            </span>
            <Shield size={18} color="var(--info)" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, marginTop: '0.35rem', color: 'var(--info)' }}>
            {globalScopeCount} Users
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Executive multi-desk governance
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Authorized Limits (USD)
            </span>
            <DollarSign size={18} color="var(--primary)" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, marginTop: '0.35rem', color: 'var(--text-primary)' }}>
            ${(totalApprovalAllocation / 1000).toLocaleString()}k
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Commercial deal authority capacity
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Table Toolbar */}
        <TableToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search users by name, email, department, role, phone..."
          filterOptions={filterOptions}
          activeFilter={departmentFilter}
          onFilterChange={setDepartmentFilter}
          selectedCount={selectedUserIds.length}
          onClearSelection={() => setSelectedUserIds([])}
          onExportCsv={handleExportCsv}
          selectionActions={
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button
                onClick={() => handleBulkStatus('ACTIVE')}
                className="btn btn-xs btn-outline"
                style={{ color: 'var(--success)' }}
              >
                Activate ({selectedUserIds.length})
              </button>
              <button
                onClick={() => handleBulkStatus('SUSPENDED')}
                className="btn btn-xs btn-outline"
                style={{ color: 'var(--warning)' }}
              >
                Suspend ({selectedUserIds.length})
              </button>
              <button
                onClick={handleBulkDelete}
                className="btn btn-xs btn-outline"
                style={{ color: 'var(--danger)' }}
              >
                Delete
              </button>
            </div>
          }
          extraActions={
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                style={{
                  padding: '0.45rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface-elevated)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-medium)',
                  fontSize: '0.8rem',
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active Only</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="INACTIVE">Inactive</option>
              </select>

              <button onClick={handleOpenAdd} className="btn btn-primary btn-sm">
                <Plus size={15} />
                <span>Add User</span>
              </button>
            </div>
          }
        />

        {/* Users Table */}
        <div className="table-responsive">
          <table className="poly-table">
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={sortedUsers.length > 0 && selectedUserIds.length === sortedUsers.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedUserIds(sortedUsers.map((u) => u.id));
                      } else {
                        setSelectedUserIds([]);
                      }
                    }}
                  />
                </th>
                <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                  <div className="th-content">
                    <span>User Profile</span>
                    {renderSortIcon('name')}
                  </div>
                </th>
                <th onClick={() => handleSort('department')} style={{ cursor: 'pointer' }}>
                  <div className="th-content">
                    <span>Department & Desk</span>
                    {renderSortIcon('department')}
                  </div>
                </th>
                <th onClick={() => handleSort('designation')} style={{ cursor: 'pointer' }}>
                  <div className="th-content">
                    <span>Designation</span>
                    {renderSortIcon('designation')}
                  </div>
                </th>
                <th onClick={() => handleSort('role')} style={{ cursor: 'pointer' }}>
                  <div className="th-content">
                    <span>System Role</span>
                    {renderSortIcon('role')}
                  </div>
                </th>
                <th onClick={() => handleSort('approvalLimit')} style={{ cursor: 'pointer' }}>
                  <div className="th-content">
                    <span>Approval Limit</span>
                    {renderSortIcon('approvalLimit')}
                  </div>
                </th>
                <th>Data Scope</th>
                <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>
                  <div className="th-content">
                    <span>Status</span>
                    {renderSortIcon('status')}
                  </div>
                </th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9}>
                    <div className="table-loading-state">
                      <div className="table-spinner" />
                      <div className="table-loading-text">Loading internal users from database...</div>
                    </div>
                  </td>
                </tr>
              ) : sortedUsers.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No internal users found matching your criteria.
                  </td>
                </tr>
              ) : (
                sortedUsers.map((u) => {
                  const isSelected = selectedUserIds.includes(u.id);
                  const initials = u.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();

                  return (
                    <tr
                      key={u.id}
                      className={isSelected ? 'row-selected' : ''}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setDrawerUser(u)}
                    >
                      <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUserIds((prev) => [...prev, u.id]);
                            } else {
                              setSelectedUserIds((prev) => prev.filter((id) => id !== u.id));
                            }
                          }}
                        />
                      </td>

                      {/* User Profile Avatar & Name */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, var(--primary), #8b5cf6)',
                              color: 'white',
                              fontWeight: 700,
                              fontSize: '0.8rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <Mail size={11} />
                              <span>{u.email}</span>
                            </div>
                            {u.phone && (
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <Phone size={10} />
                                <span>{u.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Department & Subdepartment */}
                      <td>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{u.department}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.subdepartment}</div>
                      </td>

                      {/* Designation */}
                      <td>
                        <div style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{u.designation}</div>
                        {u.reportingTo && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            Reports to: {u.reportingTo}
                          </div>
                        )}
                      </td>

                      {/* Role Badge */}
                      <td>
                        <span
                          className={`badge ${
                            u.role === 'ADMINISTRATOR'
                              ? 'badge-primary'
                              : u.role === 'SALES_MANAGER'
                              ? 'badge-success'
                              : u.role === 'FINANCE_CONTROLLER'
                              ? 'badge-info'
                              : 'badge-outline'
                          }`}
                          style={{ fontSize: '0.72rem' }}
                        >
                          {u.role}
                        </span>
                      </td>

                      {/* Approval Limit */}
                      <td>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          ${(u.approvalLimit || 0).toLocaleString()}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '0.25rem' }}>USD</span>
                      </td>

                      {/* Data Scope */}
                      <td>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            padding: '0.2rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            background:
                              u.dataScope === 'GLOBAL'
                                ? 'rgba(99, 102, 241, 0.15)'
                                : 'rgba(255, 255, 255, 0.05)',
                            color: u.dataScope === 'GLOBAL' ? 'var(--primary-light)' : 'var(--text-secondary)',
                            fontWeight: 500,
                          }}
                        >
                          {u.dataScope}
                        </span>
                      </td>

                      {/* Interactive Status Pill */}
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="status-select-wrapper">
                          <select
                            value={u.status || 'ACTIVE'}
                            onChange={(e) =>
                              handleDirectUpdateStatus(u.id, e.target.value as InternalUser['status'])
                            }
                            className={`status-select-pill ${
                              u.status === 'ACTIVE'
                                ? 'badge-success'
                                : u.status === 'SUSPENDED'
                                ? 'badge-warning'
                                : 'badge-danger'
                            }`}
                            title="Click to toggle status"
                          >
                            <option value="ACTIVE">● ACTIVE</option>
                            <option value="SUSPENDED">● SUSPENDED</option>
                            <option value="INACTIVE">● INACTIVE</option>
                          </select>
                        </div>
                      </td>

                      {/* Row Action Buttons */}
                      <td onClick={(e) => e.stopPropagation()} style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="btn btn-sm btn-ghost btn-icon"
                            title="Edit user profile"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            className="btn btn-sm btn-ghost btn-icon"
                            style={{ color: 'var(--danger)' }}
                            title="Delete user account"
                          >
                            <Trash2 size={14} />
                          </button>
                          <button
                            onClick={() => setDrawerUser(u)}
                            className="btn btn-sm btn-ghost btn-icon"
                            title="Inspect complete user dossier"
                          >
                            <Eye size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Count */}
        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Showing {sortedUsers.length} of {users.length} internal users
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Tip: Click any user row to view complete organizational authority dossier.
          </span>
        </div>
      </div>

      {/* DETAIL SLIDE-OVER DRAWER */}
      <DetailDrawer
        isOpen={Boolean(drawerUser)}
        onClose={() => setDrawerUser(null)}
        title={drawerUser?.name || 'Internal User Profile'}
        subtitle={`Work Email: ${drawerUser?.email} • ID: ${drawerUser?.id}`}
        badge={
          drawerUser ? (
            <span
              className={`badge ${
                drawerUser.status === 'ACTIVE'
                  ? 'badge-success'
                  : drawerUser.status === 'SUSPENDED'
                  ? 'badge-warning'
                  : 'badge-danger'
              }`}
            >
              <span className="badge-dot" />
              {drawerUser.status || 'ACTIVE'}
            </span>
          ) : null
        }
        footer={
          drawerUser ? (
            <div style={{ display: 'flex', gap: '0.5rem', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    handleOpenEdit(drawerUser);
                  }}
                  title="Edit user details"
                >
                  <Pencil size={14} />
                  <span>Edit Profile</span>
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ color: 'var(--danger)' }}
                  onClick={() => handleDeleteUser(drawerUser.id, drawerUser.name)}
                  title="Remove user account"
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>
              </div>

              <button
                className={`btn btn-sm ${drawerUser.status === 'ACTIVE' ? 'btn-outline' : 'btn-primary'}`}
                onClick={() =>
                  handleDirectUpdateStatus(
                    drawerUser.id,
                    drawerUser.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
                  )
                }
              >
                <span>{drawerUser.status === 'ACTIVE' ? 'Suspend Access' : 'Activate User'}</span>
              </button>
            </div>
          ) : undefined
        }
      >
        {drawerUser && (
          <>
            {/* Identity & Contact Section */}
            <div className="drawer-section">
              <div className="drawer-section-title">
                <Briefcase size={14} color="var(--primary-light)" />
                Corporate Placement & Organizational Scope
              </div>
              <div className="drawer-grid">
                <div className="drawer-stat">
                  <span className="drawer-stat-label">Department</span>
                  <span className="drawer-stat-value">{drawerUser.department}</span>
                </div>
                <div className="drawer-stat">
                  <span className="drawer-stat-label">Subdepartment / Desk</span>
                  <span className="drawer-stat-value">{drawerUser.subdepartment}</span>
                </div>
                <div className="drawer-stat">
                  <span className="drawer-stat-label">Designation / Title</span>
                  <span className="drawer-stat-value">{drawerUser.designation}</span>
                </div>
                <div className="drawer-stat">
                  <span className="drawer-stat-label">Direct Reporting Manager</span>
                  <span className="drawer-stat-value">{drawerUser.reportingTo || 'Rahul Patel'}</span>
                </div>
              </div>
            </div>

            {/* Governance & Limits Section */}
            <div className="drawer-section">
              <div className="drawer-section-title">
                <Shield size={14} color="var(--info)" />
                Governance, Role & Commercial Authority
              </div>
              <div className="drawer-grid">
                <div className="drawer-stat">
                  <span className="drawer-stat-label">System Role</span>
                  <span className="drawer-stat-value cell-code">{drawerUser.role}</span>
                </div>
                <div className="drawer-stat">
                  <span className="drawer-stat-label">Data Access Scope</span>
                  <span className="drawer-stat-value">{drawerUser.dataScope}</span>
                </div>
                <div className="drawer-stat">
                  <span className="drawer-stat-label">Commercial Approval Limit</span>
                  <span className="drawer-stat-value highlight">
                    ${(drawerUser.approvalLimit || 0).toLocaleString()} USD
                  </span>
                </div>
                <div className="drawer-stat">
                  <span className="drawer-stat-label">MFA Authentication</span>
                  <span className="drawer-stat-value">
                    {drawerUser.isMfaEnabled !== false ? 'Enforced (TOTP)' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>

            {/* Contact Details */}
            <div className="drawer-section">
              <div className="drawer-section-title">
                <Mail size={14} color="var(--success)" />
                Contact & Account Security Details
              </div>
              <div className="drawer-grid">
                <div className="drawer-stat">
                  <span className="drawer-stat-label">Corporate Email</span>
                  <span className="drawer-stat-value">{drawerUser.email}</span>
                </div>
                <div className="drawer-stat">
                  <span className="drawer-stat-label">Direct Phone</span>
                  <span className="drawer-stat-value">{drawerUser.phone || 'N/A'}</span>
                </div>
                <div className="drawer-stat">
                  <span className="drawer-stat-label">Created / Provisioned On</span>
                  <span className="drawer-stat-value">
                    {drawerUser.createdAt ? new Date(drawerUser.createdAt).toLocaleDateString() : 'Active'}
                  </span>
                </div>
                <div className="drawer-stat">
                  <span className="drawer-stat-label">Organization Code</span>
                  <span className="drawer-stat-value cell-code">POLYBRIDGE-IN</span>
                </div>
              </div>
            </div>
          </>
        )}
      </DetailDrawer>

      {/* ADD USER MODAL */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '680px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.25rem',
                borderBottom: '1px solid var(--border-subtle)',
                paddingBottom: '0.75rem',
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Add Internal User Account
                </h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Provision trading desk operator with role permissions, data scope, and limits.
                </p>
              </div>
              <button className="btn btn-sm btn-ghost" onClick={() => setShowAddModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Section 1: Basic Identity */}
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary-light)', letterSpacing: '0.05em' }}>
                1. Basic Personnel Details
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Samir Merchant"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                    Work Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. samir@polybridgeventures.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                    Direct Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +91 98200 12345"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                    Direct Reporting Manager
                  </label>
                  <select
                    value={formReportingTo}
                    onChange={(e) => setFormReportingTo(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <option value="Rahul Patel">Rahul Patel (Managing Partner)</option>
                    <option value="Amit Sharma">Amit Sharma (Senior Trader)</option>
                    <option value="Priya Desai">Priya Desai (Sourcing Specialist)</option>
                    <option value="Board of Partners">Board of Partners</option>
                  </select>
                </div>
              </div>

              {/* Section 2: Department & Hierarchy */}
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary-light)', letterSpacing: '0.05em', marginTop: '0.5rem' }}>
                2. Department & Organizational Hierarchy (ADR-007)
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                    Department *
                  </label>
                  <select
                    value={formDept}
                    onChange={(e) => handleDeptChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    {Object.keys(DEPARTMENTS_DATA).map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                    Subdepartment / Desk *
                  </label>
                  <select
                    value={formSubdept}
                    onChange={(e) => setFormSubdept(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    {(DEPARTMENTS_DATA[formDept]?.subdepartments || []).map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                  Designation / Operational Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Export Trader"
                  value={formDesignation}
                  onChange={(e) => setFormDesignation(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-md)',
                  }}
                />
              </div>

              {/* Section 3: Governance, Role & Limits */}
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary-light)', letterSpacing: '0.05em', marginTop: '0.5rem' }}>
                3. Governance, RBAC Role & Commercial Limits
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                    System Role *
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    {SYSTEM_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                    Data Access Scope *
                  </label>
                  <select
                    value={formDataScope}
                    onChange={(e) => setFormDataScope(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    {DATA_SCOPES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                    Commercial Approval Limit ($ USD)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={formApprovalLimit}
                    onChange={(e) => setFormApprovalLimit(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '0.55rem',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                    Account Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as typeof formStatus)}
                    style={{
                      width: '100%',
                      padding: '0.55rem',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <option value="ACTIVE">ACTIVE (Authorized to trade & login)</option>
                    <option value="SUSPENDED">SUSPENDED (Temporarily locked)</option>
                    <option value="INACTIVE">INACTIVE (Dormant profile)</option>
                  </select>
                </div>
              </div>

              {/* MFA Checkbox */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                <input
                  type="checkbox"
                  id="mfaToggle"
                  checked={formMfa}
                  onChange={(e) => setFormMfa(e.target.checked)}
                />
                <label htmlFor="mfaToggle" style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  Enforce Two-Factor Authentication (MFA / TOTP)
                </label>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.5rem',
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '1rem',
                  marginTop: '0.5rem',
                }}
              >
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create User Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {showEditModal && editingUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '680px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.25rem',
                borderBottom: '1px solid var(--border-subtle)',
                paddingBottom: '0.75rem',
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Edit User Profile: {editingUser.name}
                </h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Update operational designations, limits, and departmental assignments.
                </p>
              </div>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingUser(null);
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                    Work Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                    Reporting Manager
                  </label>
                  <input
                    type="text"
                    value={formReportingTo}
                    onChange={(e) => setFormReportingTo(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                    Department *
                  </label>
                  <select
                    value={formDept}
                    onChange={(e) => handleDeptChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    {Object.keys(DEPARTMENTS_DATA).map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                    Subdepartment / Desk *
                  </label>
                  <select
                    value={formSubdept}
                    onChange={(e) => setFormSubdept(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    {(DEPARTMENTS_DATA[formDept]?.subdepartments || [formSubdept]).map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                  Designation / Operational Title *
                </label>
                <input
                  type="text"
                  required
                  value={formDesignation}
                  onChange={(e) => setFormDesignation(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-md)',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                    System Role *
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    {SYSTEM_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                    Data Access Scope *
                  </label>
                  <select
                    value={formDataScope}
                    onChange={(e) => setFormDataScope(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    {DATA_SCOPES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                    Commercial Approval Limit ($ USD)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={formApprovalLimit}
                    onChange={(e) => setFormApprovalLimit(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '0.55rem',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                    Account Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as typeof formStatus)}
                    style={{
                      width: '100%',
                      padding: '0.55rem',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                <input
                  type="checkbox"
                  id="editMfaToggle"
                  checked={formMfa}
                  onChange={(e) => setFormMfa(e.target.checked)}
                />
                <label htmlFor="editMfaToggle" style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  Enforce Two-Factor Authentication (MFA / TOTP)
                </label>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.5rem',
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '1rem',
                  marginTop: '0.5rem',
                }}
              >
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingUser(null);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
