import React, { useState, useEffect } from "react";
import { Sidebar, UserSession } from "./components/common/Sidebar.js";
import { Header } from "./components/common/Header.js";
import { ErrorBoundary } from "./components/common/ErrorBoundary.js";
import { FoundationDashboard } from "./components/dashboard/FoundationDashboard.js";
import { LoginView } from "./components/modules/LoginView.js";
import { QuotesModule } from "./components/modules/QuotesModule.js";
import { CrmModule } from "./components/modules/CrmModule.js";
import { CatalogueModule } from "./components/modules/CatalogueModule.js";
import { ProcurementModule } from "./components/modules/ProcurementModule.js";
import { FulfilmentModule } from "./components/modules/FulfilmentModule.js";
import { FinanceModule } from "./components/modules/FinanceModule.js";
import { AnalyticsModule } from "./components/modules/AnalyticsModule.js";
import { UsersModule } from "./components/modules/UsersModule.js";
import { IdentityModule } from "./components/modules/IdentityModule.js";
import { AuditModule } from "./components/modules/AuditModule.js";
import { FxMarketsModule } from "./components/modules/FxMarketsModule.js";
import { TradeDocumentsModule } from "./components/modules/TradeDocumentsModule.js";

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [currentTab, setCurrentTab] = useState<string>("dashboard");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] =
    useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("pbv_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Check existing session on load
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch("/api/v1/auth/me");
        if (res.ok) {
          const stored = localStorage.getItem("pbv_session_user");
          if (stored) {
            setCurrentUser(JSON.parse(stored));
          }
        }
      } catch {
        // API offline or starting
      }
    };
    checkSession();
  }, []);

  const handleLoginSuccess = (user: UserSession) => {
    setCurrentUser(user);
    localStorage.setItem("pbv_session_user", JSON.stringify(user));
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    localStorage.removeItem("pbv_session_user");
    setCurrentUser(null);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("pbv_sidebar_collapsed", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // 1. If not authenticated, display the branded Login View
  if (!currentUser) {
    return (
      <ErrorBoundary>
        <LoginView onLoginSuccess={handleLoginSuccess} />
      </ErrorBoundary>
    );
  }

  // 2. Main Authenticated Application
  return (
    <ErrorBoundary>
      <div className="app-container">
        {/* Mobile Backdrop Overlay */}
        {isMobileSidebarOpen && (
          <div
            className="mobile-sidebar-backdrop"
            onClick={() => setIsMobileSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Navigation Sidebar (Desktop persistent + Mobile off-canvas drawer) */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          user={currentUser}
          onLogout={handleLogout}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <div
          className={`main-content ${isSidebarCollapsed ? "sidebar-collapsed" : ""}`}
        >
          <Header
            currentTab={currentTab}
            theme={theme}
            onToggleTheme={toggleTheme}
            onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
          />

          <main className="content-body">
            {currentTab === "dashboard" && <FoundationDashboard />}
            {currentTab === "reporting" && <AnalyticsModule />}
            {currentTab === "crm" && <CrmModule />}
            {currentTab === "catalogue" && <CatalogueModule />}
            {currentTab === "sales" && (
              <QuotesModule
                onNavigateToFinance={() => setCurrentTab("finance")}
              />
            )}
            {currentTab === "procurement" && <ProcurementModule />}
            {currentTab === "fulfilment" && <FulfilmentModule />}
            {currentTab === "finance" && <FinanceModule />}
            {currentTab === "users" && <UsersModule />}
            {currentTab === "identity" && <IdentityModule />}
            {currentTab === "audit" && <AuditModule />}
            {currentTab === "fx-markets" && <FxMarketsModule />}
            {currentTab === "documents" && <TradeDocumentsModule />}
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default App;
