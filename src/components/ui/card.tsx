import React from "react";

type CardProps = {
  children: React.ReactNode;
  className?: string;
};

export const Card: React.FC<CardProps> = ({
  children,
  className,
}) => {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg p-4 ${className || ""}`}>
      {children}
    </div>
  );
};