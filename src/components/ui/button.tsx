import React from "react";

type ButtonVariant = "primary" | "secondary";

type ButtonProps = {
  children: React.ReactNode;
  variant?: ButtonVariant;
  onClick?: () => void;
  className?: string;
};

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  onClick,
  className,
}) => {
  const baseClass =
    variant === "primary"
      ? "bg-primary text-white hover:bg-secondary transition-colors"
      : "bg-white/10 text-white hover:bg-white/20 transition-colors";

  return (
    <button
      className={`${baseClass} px-4 py-2 rounded hover:transition-colors ${className || ""}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};