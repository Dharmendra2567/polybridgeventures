import React from "react";
import { Moon, Sun } from "lucide-react";

export interface HeaderProps {
  currentTab: string;
  theme: "dark" | "light";
  onToggleTheme: () => void;
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
};

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  theme,
  onToggleTheme,
}) => {
  const title = TAB_TITLES[currentTab] || "Trading Operations";

  return (
    <header className="top-header">
      <div className="header-title-container">
        <h1 className="page-title">{title}</h1>
      </div>

      <div className="header-actions">
        <button
          onClick={onToggleTheme}
          className="btn btn-outline"
          style={{ padding: "0.45rem", borderRadius: "50%" }}
          title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </header>
  );
};
