"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "icon";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border border-[rgba(212,175,55,0.3)] bg-[linear-gradient(180deg,rgba(26,31,40,0.92),rgba(15,19,28,0.9))] text-white shadow-[0_18px_32px_rgba(0,0,0,0.34)] backdrop-blur-[12px] hover:border-[rgba(212,175,55,0.55)]",
  secondary:
    "border border-white/12 bg-white/6 text-white hover:bg-white/10 disabled:text-white/40",
  ghost: "text-white/76 hover:bg-white/10  disabled:text-white/40",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "rounded-2xl px-4 py-2 text-sm",
  md: "rounded-2xl px-5 py-3 text-sm font-medium",
  icon: "grid h-16 w-16 place-items-center rounded-[16px] text-xl",
};

export function Button({
  children,
  className,
  size = "sm",
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={joinClasses(
        "cursor-pointer transition disabled:cursor-not-allowed",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
