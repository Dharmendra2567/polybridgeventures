import React from "react";

export interface BadgeProps {
  variant?: "primary" | "success" | "warning" | "danger";
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = "primary",
  children,
  className = "",
}) => {
  return (
    <span className={`badge badge-${variant} ${className}`}>{children}</span>
  );
};
