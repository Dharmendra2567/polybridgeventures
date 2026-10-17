import React from "react";
import { Moon, Sun, Menu } from "lucide-react";

export interface HeaderProps {
  currentTab: string;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  onOpenMobileMenu?: () => void;
}

const TAB_TITLES: Record<string, string> = {
  dashboard: "Trading Operations Dashboard",
  crm: "CRM Pipeline",
  sales: "Quotes & Sales Orders",
  procurement: "Procurement & Sourcing",
  fulfilment: "Fulfilment & Logistics",
  finance: "Trade Finance & Invoices",
  catalogue: "Product Catalogue",
  reporting: "Analytics & Reporting",
  users: "Internal User Management",
  identity: "Identity & Access",
  audit: "Audit & Governance",
  "fx-markets": "Global Export Markets & Foreign Exchange (FX) Matrix",
  documents: "Trade Documents Vault",
};

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  theme,
  onToggleTheme,
  onOpenMobileMenu,
}) => {
  const title = TAB_TITLES[currentTab] || "Trading Operations";

  return (
    <header className="top-header">
      <div className="header-title-container">
        {onOpenMobileMenu && (
          <button
            onClick={onOpenMobileMenu}
            className="mobile-menu-btn"
            aria-label="Open Navigation Menu"
            title="Open Navigation Menu"
          >
            <Menu size={20} />
          </button>
        )}
        <div className="mobile-brand-pill">PV</div>
        <h1 className="page-title">{title}</h1>
      </div>

      <div className="header-actions">
        <button
          onClick={onToggleTheme}
          className="btn btn-outline theme-toggle-btn"
          style={{ padding: "0.45rem", borderRadius: "50%" }}
          title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </header>
  );
};
