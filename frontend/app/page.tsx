import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
      <div className="max-w-6xl mx-auto px-6 py-24">
        <h1 className="text-5xl font-bold mb-6">HR Management Platform</h1>

        <p className="text-lg text-white/80 max-w-2xl mb-10">
          Manage employees, payroll, performance, recruitment, and more — all in
          one unified platform.
        </p>

        <div className="flex gap-4">
          <Link
            href="/auth/login"
            className="bg-white text-indigo-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-100"
          >
            Login
          </Link>

          <Link
            href="/auth/register"
            className="border border-white px-6 py-3 rounded-lg hover:bg-white hover:text-indigo-700"
          >
            Get Started
          </Link>

          <Link
            href="/auth/candidate-login"
            className="border border-white px-6 py-3 rounded-lg hover:bg-white hover:text-indigo-700"
          >
            Candidate Login
          </Link>
        </div>
      </div>
    </main>
  );
}
