export default function Footer() {
  return (
    <footer className="border-t bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center space-x-2">
            <div className="h-6 w-6 rounded-md bg-blue-600" />
            <span className="text-sm font-semibold text-gray-900">
              HR Management System
            </span>
          </div>
          <div className="text-center text-sm text-gray-600 md:text-left">
            <p>
              © {new Date().getFullYear()} HR Management System. All rights
              reserved.
            </p>
            <p className="mt-1">
              A comprehensive platform for managing employee lifecycle and HR
              operations.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
