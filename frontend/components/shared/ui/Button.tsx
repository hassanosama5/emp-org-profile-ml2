import React from "react";
import Link from "next/link";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      className = "",
      asChild = false,
      ...props
    },
    ref
  ) => {
    const baseStyles =

      "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-600 disabled:border-gray-300 disabled:cursor-not-allowed disabled:opacity-100";

    const variants = {
      primary:
        "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-700",
      secondary:
        "bg-gray-100 text-gray-900 hover:bg-gray-200 disabled:bg-gray-200 disabled:text-gray-600",
      outline:
        "border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-600 disabled:border-gray-300",
      ghost:
        "bg-transparent text-gray-900 hover:bg-gray-100 disabled:bg-gray-100 disabled:text-gray-600",

      danger: "bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-300 disabled:text-gray-700",

    };

    const sizes = {
      sm: "h-9 px-3 text-sm",
      md: "h-10 px-4 text-sm",
      lg: "h-11 px-6 text-base",
    };

    const buttonClasses = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;

    if (asChild && props.onClick === undefined) {
      return React.cloneElement(
        children as React.ReactElement,
        {
          className: `${
            (children as React.ReactElement<any>).props?.className || ""
          } ${buttonClasses}`,
          ref,
        } as any
      );
    }

    // Normalize disabled to always be a boolean to prevent hydration mismatches
    const isDisabled = !!(disabled || isLoading);

    return (
      <button
        ref={ref}
        className={buttonClasses}
        disabled={isDisabled}
        {...props}
      >
        {isLoading && (
          <svg
            className="mr-2 h-4 w-4 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";