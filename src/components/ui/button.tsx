import React from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "link";

type ButtonProps = {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
};

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  disabled,
  onClick,
  className,
}) => {
  const variantStyles = {
    primary: "inline-flex items-center justify-center rounded bg-primary text-white hover:bg-secondary transition-colors",
    secondary: "inline-flex items-center justify-center rounded bg-white/10 text-white hover:bg-white/20 transition-colors",
    danger: "inline-flex items-center justify-center rounded bg-red-600 text-white hover:bg-red-700 transition-colors",
    link: "text-primary underline underline-offset-4 hover-opacity-80",
  };

  const sizeStyles = {
    sm: "h-8 px-3 text-sm rounded",
    md: "h-10 px-4 text-base rounded",
    lg: "h-12 px-6 text-lg rounded",
  };

  const baseClasses =
    variantStyles[variant] +
    " " +
    sizeStyles[size] +
    " disabled:opacity-50 disabled:cursor-not-allowed ";

  const classes = `${baseClasses}${className || ""}`;

  return (
    <button className={classes} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
};