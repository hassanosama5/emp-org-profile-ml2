// components/ui/loading-spinner.tsx
export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600" />
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export function SimpleSpinner() {
  return <LoadingSpinner />;
}
