"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface TabsContextValue {
  value: string;
  setValue: (v: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

interface TabsProps {
  defaultValue: string;
  className?: string;
  children: React.ReactNode;
  onValueChange?: (value: string) => void;
}

export function Tabs({ defaultValue, className = "", children, onValueChange }: TabsProps) {
  const [value, setValue] = useState(defaultValue);

  // Call onValueChange when the internal value changes
  useEffect(() => {
    onValueChange?.(value);
  }, [value, onValueChange]);

  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>{children}</div>
  );
}

export function TabsTrigger({
  value,
  children,
  className = "",
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = useContext(TabsContext);
  const isActive = ctx?.value === value;
  const base = "px-3 py-2 text-sm rounded-md transition-colors";
  const active = "bg-blue-600 text-white";
  const inactive = "bg-gray-100 text-gray-900 hover:bg-gray-200";
  return (
    <button
      type="button"
      className={`${base} ${isActive ? active : inactive} ${className}`}
      onClick={() => ctx?.setValue(value)}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  children,
  className = "",
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = useContext(TabsContext);
  if (ctx?.value !== value) return null;
  return <div className={className}>{children}</div>;
}

