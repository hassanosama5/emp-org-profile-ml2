// lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
// Format date
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Get status color
export function getStatusColor(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "bg-green-100 text-green-800";
    case "PROBATION":
      return "bg-yellow-100 text-yellow-800";
    case "INACTIVE":
      return "bg-gray-100 text-gray-800";
    case "TERMINATED":
      return "bg-red-100 text-red-800";
    case "SUSPENDED":
      return "bg-orange-100 text-orange-800";
    case "ON_LEAVE":
      return "bg-blue-100 text-blue-800";
    case "RETIRED":
      return "bg-purple-100 text-purple-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

// Get initials from name
export function getInitials(name: string): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
