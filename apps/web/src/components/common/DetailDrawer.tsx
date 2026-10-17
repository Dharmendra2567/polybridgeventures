import React, { useEffect } from "react";
import { X } from "lucide-react";

export interface DetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const DetailDrawer: React.FC<DetailDrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  badge,
  children,
  footer,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div className="drawer-title-group">
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}
            >
              <h2 className="drawer-title">{title}</h2>
              {badge}
            </div>
            {subtitle && <div className="drawer-subtitle">{subtitle}</div>}
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-icon"
            title="Close Drawer (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        <div className="drawer-body">{children}</div>

        {footer && <div className="drawer-footer">{footer}</div>}
      </div>
    </div>
  );
};
