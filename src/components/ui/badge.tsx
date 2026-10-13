import React from "react";

type BadgeVariant = "primary" | "secondary" | "success" | "warning" | "danger" | "info";

type BadgeProps = {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "primary",
  className,
}) => {
  const variantStyles = {
    primary: "bg-primary text-white",
    secondary: "bg-gray-200 text-gray-800",
    success: "bg-green-100 text-green-800",
    warning: "bg-yellow-100 text-yellow-800",
    danger: "bg-red-100 text-red-800",
    info: "bg-blue-100 text-blue-800",
  };

  const baseClass = "inline-flex items-center rounded text-xs px-2 py-0.5";
  return (
    <span className={variantStyles[variant] + " " + baseClass + (className || "")}>
      {children}
    </span>
  );
};