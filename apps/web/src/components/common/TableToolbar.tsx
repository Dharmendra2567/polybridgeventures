import React from "react";
import { Search, X, Download } from "lucide-react";

export interface FilterOption {
  id: string;
  label: string;
  count?: number;
}

export interface TableToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchPlaceholder?: string;
  filterOptions?: FilterOption[];
  activeFilter?: string;
  onFilterChange?: (filterId: string) => void;
  selectedCount?: number;
  onClearSelection?: () => void;
  selectionActions?: React.ReactNode;
  onExportCsv?: () => void;
  extraActions?: React.ReactNode;
}

export const TableToolbar: React.FC<TableToolbarProps> = ({
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search records...",
  filterOptions,
  activeFilter,
  onFilterChange,
  selectedCount = 0,
  onClearSelection,
  selectionActions,
  onExportCsv,
  extraActions,
}) => {
  return (
    <div>
      {/* Batch Selection Action Bar */}
      {selectedCount > 0 && (
        <div className="selection-action-bar">
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
          >
            <span style={{ fontWeight: 600 }}>
              {selectedCount} item{selectedCount > 1 ? "s" : ""} selected
            </span>
            {onClearSelection && (
              <button
                onClick={onClearSelection}
                className="btn btn-xs btn-ghost"
                style={{ textDecoration: "underline" }}
              >
                Clear selection
              </button>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {selectionActions}
          </div>
        </div>
      )}

      {/* Main Toolbar Controls */}
      <div className="table-toolbar">
        <div className="toolbar-left">
          {/* Real-time Search Box */}
          <div className="table-search-box">
            <Search size={15} className="table-search-icon" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="table-search-input"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange("")}
                className="table-search-clear"
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          {filterOptions && filterOptions.length > 0 && onFilterChange && (
            <div className="filter-chips-container">
              {filterOptions.map((opt) => {
                const isActive = activeFilter === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => onFilterChange(opt.id)}
                    className={`filter-chip ${isActive ? "active" : ""}`}
                  >
                    <span>{opt.label}</span>
                    {typeof opt.count === "number" && (
                      <span className="filter-chip-count">{opt.count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Toolbar Controls */}
        <div className="toolbar-right">
          {extraActions}

          {onExportCsv && (
            <button
              onClick={onExportCsv}
              className="btn btn-sm btn-outline"
              title="Export current table data to CSV"
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
