import React from "react";
import {
  LayoutDashboard,
  Users,
  Package,
  FileSpreadsheet,
  ShoppingCart,
  Truck,
  DollarSign,
  BarChart3,
  History,
  Lock,
  UserCog,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Globe,
  FileCheck,
  LucideIcon,
  X,
} from "lucide-react";

export interface UserSession {
  id: string;
  email: string;
  name: string;
  department: string;
  subdepartment: string;
  designation: string;
  role: string;
  dataScope: string;
  approvalLimit: number;
}

export interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  user?: UserSession | null;
  onLogout?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  user,
  onLogout,
  isCollapsed = false,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const navSections: NavSection[] = [
    {
      title: "Executive & Overview",
      items: [
        {
          id: "dashboard",
          label: "Executive Dashboard",
          icon: LayoutDashboard,
        },
        { id: "reporting", label: "Trade Analytics", icon: BarChart3 },
      ],
    },
    {
      title: "Commercial Engine",
      items: [
        { id: "crm", label: "CRM & Pipeline", icon: Users, badge: "Live" },
        {
          id: "catalogue",
          label: "Product Catalogue",
          icon: Package,
          badge: "Active",
        },
        {
          id: "sales",
          label: "Quotes & Orders",
          icon: FileSpreadsheet,
          badge: "Live",
        },
        {
          id: "procurement",
          label: "Procurement & POs",
          icon: ShoppingCart,
          badge: "Live",
        },
        {
          id: "fulfilment",
          label: "Supplier-Direct Fulfilment",
          icon: Truck,
          badge: "Live",
        },
        {
          id: "finance",
          label: "Finance & Invoices",
          icon: DollarSign,
          badge: "Live",
        },
        {
          id: "fx-markets",
          label: "Markets & FX Rates",
          icon: Globe,
          badge: "11 Markets",
        },
        {
          id: "documents",
          label: "Trade Documents Vault",
          icon: FileCheck,
          badge: "Vault",
        },
      ],
    },
    {
      title: "Administration & Governance",
      items: [
        {
          id: "users",
          label: "Users",
          icon: UserCog,
          badge: "Staff",
        },
        {
          id: "identity",
          label: "Roles & Hierarchy",
          icon: Lock,
          badge: "RBAC",
        },
        { id: "audit", label: "Audit Trail", icon: History, badge: "ASVS" },
      ],
    },
  ];

  const getInitials = (name?: string) => {
    if (!name) return "PV";
    const parts = name.split(" ");
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <aside
      className={`sidebar ${isCollapsed ? "collapsed" : ""} ${isMobileOpen ? "mobile-open" : ""}`}
    >
      <div
        className="sidebar-header"
        style={
          isCollapsed && !isMobileOpen
            ? {
                padding: "0.6rem 0.25rem",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.4rem",
              }
            : {
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 1.25rem",
              }
        }
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            overflow: "hidden",
          }}
        >
          <div
            className="brand-logo"
            style={
              isCollapsed && !isMobileOpen
                ? { width: 30, height: 30, fontSize: "0.95rem" }
                : undefined
            }
            title="Polybridge Ventures LLP"
          >
            PV
          </div>
          {(!isCollapsed || isMobileOpen) && (
            <div className="brand-title">Polybridge Ventures</div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="sidebar-toggle-btn desktop-only"
              style={{
                padding: "0.35rem",
                color: "var(--text-muted)",
              }}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? (
                <PanelLeftOpen size={16} />
              ) : (
                <PanelLeftClose size={17} />
              )}
            </button>
          )}

          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="mobile-sidebar-close-btn mobile-only"
              aria-label="Close navigation"
              title="Close navigation"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <div
        className="sidebar-nav"
        style={
          isCollapsed && !isMobileOpen
            ? { padding: "1rem 0.4rem", gap: "1rem" }
            : undefined
        }
      >
        {navSections.map((section) => (
          <div key={section.title} className="nav-group">
            {(!isCollapsed || isMobileOpen) && (
              <div className="nav-group-title">{section.title}</div>
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              const showExpanded = !isCollapsed || isMobileOpen;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className={`nav-item ${isActive ? "active" : ""}`}
                  style={{
                    width: "100%",
                    textAlign: showExpanded ? "left" : "center",
                    justifyContent: showExpanded ? "flex-start" : "center",
                    padding: showExpanded ? "0.65rem 0.75rem" : "0.65rem 0",
                    background: "none",
                  }}
                  title={!showExpanded ? item.label : undefined}
                >
                  <Icon size={18} />
                  {showExpanded && <span>{item.label}</span>}
                  {showExpanded && item.badge && (
                    <span className="nav-badge">{item.badge}</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div
        className="sidebar-footer"
        style={
          isCollapsed && !isMobileOpen
            ? { padding: "0.75rem 0.25rem" }
            : undefined
        }
      >
        {isCollapsed && !isMobileOpen ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.5rem",
              width: "100%",
            }}
          >
            <div
              className="user-avatar"
              style={{ width: 32, height: 32, fontSize: "0.85rem" }}
              title={`${user?.name || "User"} (${user?.designation || "Staff"})`}
            >
              {getInitials(user?.name)}
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                className="btn btn-ghost"
                style={{ padding: "0.3rem", color: "var(--text-muted)" }}
                title="Sign Out / Switch User"
              >
                <LogOut size={15} />
              </button>
            )}
          </div>
        ) : (
          <div
            className="user-card"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                overflow: "hidden",
              }}
            >
              <div className="user-avatar">{getInitials(user?.name)}</div>
              <div className="user-info" style={{ overflow: "hidden" }}>
                <span
                  className="user-name"
                  style={{
                    whiteSpace: "nowrap",
                    textOverflow: "ellipsis",
                    overflow: "hidden",
                  }}
                >
                  {user?.name || "Rahul Patel"}
                </span>
                <span className="user-role-badge">
                  {user?.designation || "Managing Partner"}
                </span>
                <span
                  style={{
                    fontSize: "0.65rem",
                    color: "var(--text-muted)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                  }}
                >
                  Scope: {user?.dataScope || "GLOBAL"}
                </span>
              </div>
            </div>

            {onLogout && (
              <button
                onClick={onLogout}
                className="btn btn-ghost"
                style={{ padding: "0.4rem", color: "var(--text-muted)" }}
                title="Sign Out / Switch User"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
