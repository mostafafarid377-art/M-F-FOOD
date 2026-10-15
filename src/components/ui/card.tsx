import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Removes the default padding (useful for image-first menu cards). */
  flush?: boolean;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = "",
  flush = false,
  hoverable = false,
  ...rest
}) => {
  return (
    <div
      className={[
        "bg-white rounded-xl border border-primary-100 shadow-sm",
        flush ? "" : "p-4",
        hoverable
          ? "transition-shadow hover:shadow-lg hover:border-primary-200"
          : "",
        className,
      ]
        .join(" ")
        .trim()}
      {...rest}
    >
      {children}
    </div>
  );
};
