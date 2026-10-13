import React from "react";

type CardProps = {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "elevated" | "outline";
};

export const Card: React.FC<CardProps> = ({
  children,
  className,
  variant = "default",
}) => {
  const variantClasses = {
    default: "bg-white dark:bg-gray-800 shadow-sm rounded-lg",
    elevated: "bg-white dark:bg-gray-800 shadow-md rounded-lg",
    outline: "border border-gray-200 dark:border-gray-700 rounded-lg",
  };

  return (
    <div className={variantClasses[variant] + (className || "")}>
      {children}
    </div>
  );
};