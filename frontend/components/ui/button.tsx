import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  variant?: "default" | "outline";
}

export function Button({
  isLoading,
  variant = "default",
  children,
  disabled,
  className,
  ...rest
}: ButtonProps) {
  const baseStyle =
    "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60";
  const defaultStyle =
    "bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white";
  const outlineStyle =
    "bg-transparent border border-slate-700 text-slate-300 hover:bg-slate-800";
  const variantStyle = variant === "outline" ? outlineStyle : defaultStyle;

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseStyle} ${variantStyle} ${className ?? ""}`}
      {...rest}
    >
      {isLoading ? "Please wait…" : children}
    </button>
  );
}
