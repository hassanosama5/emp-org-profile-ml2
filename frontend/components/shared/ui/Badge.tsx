// components/shared/ui/Badge.tsx
import { cn } from "../../../lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?:
    | "default"
    | "primary"
    | "secondary"
    | "success"
    | "warning"
    | "danger"
    | "outline"
    | "gray"
    | "green"
    | "yellow"
    | "red"
    | "blue"
    | "purple";
}

export function Badge({
  children,
  className,
  variant = "default",
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        {
          // Map all variants to consistent styles
          "bg-blue-100 text-blue-800":
            variant === "default" ||
            variant === "primary" ||
            variant === "blue",
          "bg-gray-100 text-gray-800":
            variant === "secondary" || variant === "gray",
          "border border-gray-300 bg-transparent text-gray-700":
            variant === "outline",
          "bg-green-100 text-green-800":
            variant === "success" || variant === "green",
          "bg-yellow-100 text-yellow-800":
            variant === "warning" || variant === "yellow",
          "bg-red-100 text-red-800": variant === "danger" || variant === "red",
          "bg-purple-100 text-purple-800": variant === "purple",
        },
        className
      )}
    >
      {children}
    </span>
  );
}
