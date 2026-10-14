import React from "react";

type BadgeVariant = "primary" | "secondary";

type BadgeProps = {
  children: React.ReactNode;
  variant?: BadgeVariant;
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "primary",
}) => {
  const baseClass = "inline-flex items-center rounded text-xs px-2 py-0.5";
  const variantClass = variant === "primary"
    ? "bg-primary text-white"
    : "bg-gray-200 text-gray-800";

  return (
    <span className={`${baseClass} ${variantClass}`}>
      {children}
    </span>
  );
};