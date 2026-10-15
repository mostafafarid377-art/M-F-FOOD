import React from "react";

export type BadgeVariant =
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  primary: "bg-primary-100 text-primary-800",
  secondary: "bg-secondary/10 text-secondary",
  success: "bg-green-100 text-green-800",
  warning: "bg-amber-100 text-amber-800",
  danger: "bg-red-100 text-red-800",
  info: "bg-sky-100 text-sky-800",
  neutral: "bg-gray-100 text-gray-700",
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "primary",
  dot = false,
  className = "",
  ...rest
}) => {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
        variantClasses[variant],
        className,
      ]
        .join(" ")
        .trim()}
      {...rest}
    >
      {dot && (
        <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      )}
      {children}
    </span>
  );
};

/** Maps order/payment/table statuses to badge variants for consistent display. */
export function statusVariant(status: string): BadgeVariant {
  switch (status) {
    case "completed":
    case "paid":
    case "available":
    case "ready":
      return "success";
    case "preparing":
    case "confirmed":
    case "occupied":
      return "info";
    case "pending":
    case "reserved":
      return "warning";
    case "cancelled":
    case "failed":
      return "danger";
    case "refunded":
    case "checked_out":
      return "neutral";
    default:
      return "primary";
  }
}
