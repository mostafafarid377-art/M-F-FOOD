import React from "react";

type InputProps = {
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
};

export const Input: React.FC<InputProps> = ({
  type = "text",
  placeholder,
  value,
  onChange,
  label,
  error,
  disabled,
  className,
}) => {
  const baseClasses =
    "w-full rounded border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary";
  const errorClasses = "text-sm text-red-600 dark:text-red-400";

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          {label}
        </label>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={baseClasses + (className || "")}
      />
      {error && (
        <p className={errorClasses}>
          {error}
        </p>
      )}
    </div>
  );
};