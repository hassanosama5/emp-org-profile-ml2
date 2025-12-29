"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/shared/ui/Card";
import {
  FileText,
  DollarSign,
  Briefcase,
  Gift,
  Users,
  Shield,
  FileCheck,
  AlertCircle,
  BarChart3,
  TrendingUp,
  Calculator,
  Calendar,
  Eye,
  Send,
  Flag,
  Lock,
  Settings,
  Database,
  CheckCircle,
  Edit,
  RefreshCw,
  Receipt,
  Zap,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function PayrollSpecialistDashboardPage() {
  const { user } = useAuth();
  useRequireAuth(SystemRole.PAYROLL_SPECIALIST);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 relative overflow-hidden">
      {/* Enhanced Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Primary gradient orbs */}
        <div className="absolute top-0 -right-40 w-[600px] h-[600px] bg-gradient-to-br from-blue-500/30 via-indigo-500/20 to-purple-500/30 rounded-full mix-blend-screen filter blur-3xl animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-gradient-to-br from-purple-500/30 via-pink-500/20 to-rose-500/30 rounded-full mix-blend-screen filter blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-br from-cyan-500/25 via-blue-500/15 to-indigo-500/25 rounded-full mix-blend-screen filter blur-3xl animate-blob animation-delay-4000"></div>
        
        {/* Secondary accent orbs */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] opacity-40"></div>
      </div>

      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Enhanced Header Section */}
        <div className="text-center mb-16 space-y-8">
          {/* Badge with enhanced styling */}
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 backdrop-blur-xl border border-indigo-400/30 shadow-2xl shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all duration-300 transform hover:scale-105">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200 bg-clip-text text-transparent">Payroll Configuration</span>
          </div>

          {/* Main Title with Enhanced Gradient */}
          <div className="space-y-6">
            <div className="relative inline-block">
              <h1 className="text-6xl md:text-7xl lg:text-8xl font-extrabold mb-2 relative z-10">
                <span className="block bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200 bg-clip-text text-transparent drop-shadow-2xl">
                Payroll Specialist
              </span>
                <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mt-2">
                Dashboard
              </span>
            </h1>
              {/* Text glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 blur-2xl opacity-20 -z-0"></div>
            </div>
          </div>

          {/* Welcome Message with enhanced styling */}
          <div className="space-y-4 pt-6">
            <div className="inline-block px-6 py-3 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
              <p className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200 bg-clip-text text-transparent">
              {mounted ? `Welcome back, ${user?.fullName || "Specialist"}!` : 'Welcome back!'}
            </p>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Create and manage payroll configurations (all in draft status requiring manager approval). Process payroll, review disputes and claims, and generate reports.
            </p>
            <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Create and manage payroll configurations with comprehensive tools and intuitive workflows.
            </p>
          </div>
          </div>

          {/* Enhanced Gradient Line Separator */}
          <div className="flex items-center justify-center gap-4 pt-8">
            <div className="h-1 w-32 md:w-48 bg-gradient-to-r from-transparent via-indigo-500 to-purple-500 rounded-full shadow-lg shadow-indigo-500/50"></div>
            <div className="p-2 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-purple-500/50">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="h-1 w-32 md:w-48 bg-gradient-to-l from-transparent via-pink-500 to-purple-500 rounded-full shadow-lg shadow-pink-500/50"></div>
          </div>
        </div>

        {/* ========== PAYROLL CONFIGURATION SECTION ========== */}
        <div className="mb-20">
          {/* Enhanced Section Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-4 mb-6 px-6 py-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
              <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500 via-cyan-500 to-indigo-600 shadow-xl shadow-blue-500/50 transform hover:scale-110 transition-transform duration-300">
                <Settings className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-blue-200 via-cyan-200 to-indigo-200 bg-clip-text text-transparent">
                Configuration Management
              </h2>
            </div>
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="h-1.5 w-32 md:w-48 bg-gradient-to-r from-transparent via-blue-500 to-cyan-500 rounded-full shadow-lg shadow-blue-500/50"></div>
              <div className="p-2 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 shadow-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="h-1.5 w-32 md:w-48 bg-gradient-to-l from-transparent via-purple-500 to-pink-500 rounded-full shadow-lg shadow-purple-500/50"></div>
            </div>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Configure company-level payroll policies, pay grades, allowances, tax rules, and benefits. All configurations are created in draft status and require Payroll Manager approval before publishing. Editing is only allowed for draft status configurations.
            </p>
            <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Configure company-level payroll policies, pay grades, allowances, tax rules, and benefits with powerful management tools
            </p>
          </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* REQ-PY-1: Payroll Policies */}
          <div className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition duration-500"></div>
            <Card className="relative h-full bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl hover:shadow-blue-700/20 transition-all duration-500 transform hover:-translate-y-3 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-700/10 via-indigo-700/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-600/30 to-indigo-600/20 rounded-full -mr-20 -mt-20 blur-2xl"></div>
              <CardHeader className="text-center pb-4 pt-8 relative z-10">
                <div className="flex justify-center mb-6">
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-700 via-indigo-700 to-blue-800 shadow-2xl shadow-blue-700/50 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                    <FileText className="w-10 h-10 text-white" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold text-white mb-3 drop-shadow-lg">Payroll Policies</CardTitle>
                <CardDescription className="text-white/90 text-base leading-relaxed font-medium">
                  Configure company-level payroll policies and rules
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 pb-6 relative z-10">
                <Link
                  href="/dashboard/payroll-configuration/policies"
                  className="block w-full text-center bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 hover:from-blue-600 hover:via-indigo-600 hover:to-blue-700 text-white py-4 px-6 rounded-xl font-bold text-base transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl hover:shadow-blue-700/50 flex items-center justify-center gap-2 border border-white/20"
                >
                  Manage Policies
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* REQ-PY-2: Pay Grades */}
          <div className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-800 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition duration-500"></div>
            <Card className="relative h-full bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl hover:shadow-indigo-700/20 transition-all duration-500 transform hover:-translate-y-3 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-700/10 via-purple-700/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-indigo-600/30 to-purple-600/20 rounded-full -mr-20 -mt-20 blur-2xl"></div>
              <CardHeader className="text-center pb-4 pt-8 relative z-10">
                <div className="flex justify-center mb-6">
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-700 via-purple-700 to-indigo-800 shadow-2xl shadow-indigo-700/50 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                    <DollarSign className="w-10 h-10 text-white" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold text-white mb-3 drop-shadow-lg">Pay Grades</CardTitle>
                <CardDescription className="text-white/90 text-base leading-relaxed font-medium">
                  Define pay grades, salary, and compensation limits
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 pb-6 relative z-10">
                <Link
                  href="/dashboard/payroll-configuration/pay-grades"
                  className="block w-full text-center bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-800 hover:from-indigo-600 hover:via-purple-600 hover:to-indigo-700 text-white py-4 px-6 rounded-xl font-bold text-base transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl hover:shadow-indigo-700/50 flex items-center justify-center gap-2 border border-white/20"
                >
                  Manage Pay Grades
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* REQ-PY-5: Pay Types */}
          <div className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-700 via-cyan-700 to-blue-800 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition duration-500"></div>
            <Card className="relative h-full bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl hover:shadow-blue-700/20 transition-all duration-500 transform hover:-translate-y-3 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-700/10 via-cyan-700/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-600/30 to-cyan-600/20 rounded-full -mr-20 -mt-20 blur-2xl"></div>
              <CardHeader className="text-center pb-4 pt-8 relative z-10">
                <div className="flex justify-center mb-6">
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-700 via-cyan-700 to-blue-800 shadow-2xl shadow-blue-700/50 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                    <Briefcase className="w-10 h-10 text-white" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold text-white mb-3 drop-shadow-lg">Pay Types</CardTitle>
                <CardDescription className="text-white/90 text-base leading-relaxed font-medium">
                  Define employee pay types (hourly, daily, weekly, monthly)
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 pb-6 relative z-10">
                <Link
                  href="/dashboard/payroll-configuration/pay-types"
                  className="block w-full text-center bg-gradient-to-r from-blue-700 via-cyan-700 to-blue-800 hover:from-blue-600 hover:via-cyan-600 hover:to-blue-700 text-white py-4 px-6 rounded-xl font-bold text-base transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl hover:shadow-blue-700/50 flex items-center justify-center gap-2 border border-white/20"
                >
                  Manage Pay Types
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* REQ-PY-7: Allowances */}
          <div className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-teal-700 via-cyan-700 to-teal-800 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition duration-500"></div>
            <Card className="relative h-full bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl hover:shadow-teal-700/20 transition-all duration-500 transform hover:-translate-y-3 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-teal-700/10 via-cyan-700/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-teal-600/30 to-cyan-600/20 rounded-full -mr-20 -mt-20 blur-2xl"></div>
              <CardHeader className="text-center pb-4 pt-8 relative z-10">
                <div className="flex justify-center mb-6">
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-teal-700 via-cyan-700 to-teal-800 shadow-2xl shadow-teal-700/50 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                    <Gift className="w-10 h-10 text-white" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold text-white mb-3 drop-shadow-lg">Allowances</CardTitle>
                <CardDescription className="text-white/90 text-base leading-relaxed font-medium">
                  Set allowances (transportation, housing, etc.)
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 pb-6 relative z-10">
                <Link
                  href="/dashboard/payroll-configuration/allowances"
                  className="block w-full text-center bg-gradient-to-r from-teal-700 via-cyan-700 to-teal-800 hover:from-teal-600 hover:via-cyan-600 hover:to-teal-700 text-white py-4 px-6 rounded-xl font-bold text-base transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl hover:shadow-teal-700/50 flex items-center justify-center gap-2 border border-white/20"
                >
                  Manage Allowances
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* REQ-PY-10: Tax Rules */}
          <div className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-slate-700 via-gray-700 to-slate-800 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition duration-500"></div>
            <Card className="relative h-full bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl hover:shadow-slate-700/20 transition-all duration-500 transform hover:-translate-y-3 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-700/10 via-gray-700/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-slate-600/30 to-gray-600/20 rounded-full -mr-20 -mt-20 blur-2xl"></div>
              <CardHeader className="text-center pb-4 pt-8 relative z-10">
                <div className="flex justify-center mb-6">
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-700 via-gray-700 to-slate-800 shadow-2xl shadow-slate-700/50 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                    <Shield className="w-10 h-10 text-white" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold text-white mb-3 drop-shadow-lg">Tax Rules</CardTitle>
                <CardDescription className="text-white/90 text-base leading-relaxed font-medium">
                  Define tax rules and laws (progressive rates, exemptions)
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 pb-6 relative z-10">
                <Link
                  href="/dashboard/payroll-configuration/tax-rules"
                  className="block w-full text-center bg-gradient-to-r from-slate-700 via-gray-700 to-slate-800 hover:from-slate-600 hover:via-gray-600 hover:to-slate-700 text-white py-4 px-6 rounded-xl font-bold text-base transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl hover:shadow-slate-700/50 flex items-center justify-center gap-2 border border-white/20"
                >
                  Manage Tax Rules
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* REQ-PY-19: Signing Bonuses */}
          <div className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-amber-700 via-yellow-700 to-amber-800 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition duration-500"></div>
            <Card className="relative h-full bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl hover:shadow-amber-700/20 transition-all duration-500 transform hover:-translate-y-3 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-700/10 via-yellow-700/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-amber-600/30 to-yellow-600/20 rounded-full -mr-20 -mt-20 blur-2xl"></div>
              <CardHeader className="text-center pb-4 pt-8 relative z-10">
                <div className="flex justify-center mb-6">
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-700 via-yellow-700 to-amber-800 shadow-2xl shadow-amber-700/50 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                    <Users className="w-10 h-10 text-white" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold text-white mb-3 drop-shadow-lg">Signing Bonuses</CardTitle>
                <CardDescription className="text-white/90 text-base leading-relaxed font-medium">
                  Configure policies for signing bonuses
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 pb-6 relative z-10">
                <Link
                  href="/dashboard/payroll-configuration/signing-bonuses"
                  className="block w-full text-center bg-gradient-to-r from-amber-700 via-yellow-700 to-amber-800 hover:from-amber-600 hover:via-yellow-600 hover:to-amber-700 text-white py-4 px-6 rounded-xl font-bold text-base transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl hover:shadow-amber-700/50 flex items-center justify-center gap-2 border border-white/20"
                >
                  Manage Signing Bonuses
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* REQ-PY-20: Termination Benefits */}
          <div className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-slate-700 via-gray-700 to-slate-800 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition duration-500"></div>
            <Card className="relative h-full bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl hover:shadow-slate-700/20 transition-all duration-500 transform hover:-translate-y-3 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-700/10 via-gray-700/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-slate-600/30 to-gray-600/20 rounded-full -mr-20 -mt-20 blur-2xl"></div>
              <CardHeader className="text-center pb-4 pt-8 relative z-10">
                <div className="flex justify-center mb-6">
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-700 via-gray-700 to-slate-800 shadow-2xl shadow-slate-700/50 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                    <Shield className="w-10 h-10 text-white" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold text-white mb-3 drop-shadow-lg">Termination Benefits</CardTitle>
                <CardDescription className="text-white/90 text-base leading-relaxed font-medium">
                  Configure resignation and termination benefits
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 pb-6 relative z-10">
                <Link
                  href="/dashboard/payroll-configuration/termination-benefits"
                  className="block w-full text-center bg-gradient-to-r from-slate-700 via-gray-700 to-slate-800 hover:from-slate-600 hover:via-gray-600 hover:to-slate-700 text-white py-4 px-6 rounded-xl font-bold text-base transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl hover:shadow-slate-700/50 flex items-center justify-center gap-2 border border-white/20"
                >
                  Manage Termination Benefits
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* REQ-PY-21: Insurance Brackets */}
          <div className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-700 via-blue-700 to-cyan-800 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition duration-500"></div>
            <Card className="relative h-full bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl hover:shadow-cyan-700/20 transition-all duration-500 transform hover:-translate-y-3 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-700/10 via-blue-700/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-cyan-600/30 to-blue-600/20 rounded-full -mr-20 -mt-20 blur-2xl"></div>
              <CardHeader className="text-center pb-4 pt-8 relative z-10">
                <div className="flex justify-center mb-6">
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-cyan-700 via-blue-700 to-cyan-800 shadow-2xl shadow-cyan-700/50 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                    <Shield className="w-10 h-10 text-white" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold text-white mb-3 drop-shadow-lg">Insurance Brackets</CardTitle>
                <CardDescription className="text-white/90 text-base leading-relaxed font-medium">
                  Configure insurance brackets with salary ranges
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 pb-6 relative z-10">
                <Link
                  href="/dashboard/payroll-configuration/insurance-brackets"
                  className="block w-full text-center bg-gradient-to-r from-cyan-700 via-blue-700 to-cyan-800 hover:from-cyan-600 hover:via-blue-600 hover:to-cyan-700 text-white py-4 px-6 rounded-xl font-bold text-base transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl hover:shadow-cyan-700/50 flex items-center justify-center gap-2 border border-white/20"
                >
                  Manage Insurance Brackets
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* ========== PAYROLL PROCESSING & EXECUTION SECTION ========== */}
      <div className="mb-20">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-4 mb-6 px-6 py-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
            <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-rose-600 shadow-xl shadow-purple-500/50 transform hover:scale-110 transition-transform duration-300">
              <Calculator className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-purple-200 via-pink-200 to-rose-200 bg-clip-text text-transparent">
              Payroll Processing & Execution
            </h2>
          </div>
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="h-1.5 w-32 md:w-48 bg-gradient-to-r from-transparent via-purple-500 to-pink-500 rounded-full shadow-lg shadow-purple-500/50"></div>
            <div className="p-2 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="h-1.5 w-32 md:w-48 bg-gradient-to-l from-transparent via-pink-500 to-purple-500 rounded-full shadow-lg shadow-pink-500/50"></div>
          </div>
          <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Process payroll, calculate salaries, generate drafts, review, and send for approval with powerful automation tools
          </p>
        </div>

        {/* Pre-Initiation Phase */}
        <div className="mb-10">
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-8 flex items-center gap-3 px-4">
            <div className="w-2 h-8 bg-gradient-to-b from-blue-500 via-cyan-500 to-purple-500 rounded-full shadow-lg shadow-blue-500/50"></div>
            <span className="bg-gradient-to-r from-blue-200 via-cyan-200 to-purple-200 bg-clip-text text-transparent">Pre-Initiation</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="group relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-600 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition duration-500"></div>
              <Card className="relative h-full bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl hover:shadow-blue-500/20 transition-all duration-500 transform hover:-translate-y-3 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-400/30 to-cyan-400/20 rounded-full -mr-20 -mt-20 blur-2xl"></div>
                <CardHeader className="text-center pb-4 pt-8 relative z-10">
                  <div className="flex justify-center mb-6">
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-500 via-cyan-500 to-indigo-600 shadow-2xl shadow-blue-500/50 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                      <Calendar className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-bold text-white mb-3 drop-shadow-lg">Pre-Initiation Dashboard</CardTitle>
                <CardDescription className="text-white/90 text-base leading-relaxed font-medium">
                  Review signing bonuses, termination benefits, and payroll period
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 pb-6 relative z-10">
                <Link
                  href="/dashboard/payroll-execution/pre-initiation"
                  className="block w-full text-center bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 hover:from-blue-600 hover:via-indigo-600 hover:to-blue-700 text-white py-4 px-6 rounded-xl font-bold text-base transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl hover:shadow-blue-700/50 flex items-center justify-center gap-2 border border-white/20"
                >
                  Open Dashboard
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </Link>
              </CardContent>
            </Card>
          </div>

            <div className="group relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-amber-700 via-yellow-700 to-amber-800 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition duration-500"></div>
              <Card className="relative h-full bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl hover:shadow-amber-700/20 transition-all duration-500 transform hover:-translate-y-3 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-700/10 via-yellow-700/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-amber-600/30 to-yellow-600/20 rounded-full -mr-20 -mt-20 blur-2xl"></div>
                <CardHeader className="text-center pb-4 pt-8 relative z-10">
                  <div className="flex justify-center mb-6">
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-700 via-yellow-700 to-amber-800 shadow-2xl shadow-amber-700/50 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                      <Sparkles className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-bold text-white mb-3 drop-shadow-lg">Process Signing Bonuses</CardTitle>
                  <CardDescription className="text-white/90 text-base leading-relaxed font-medium">
                    Automatically process signing bonuses
                  </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 pb-6 relative z-10">
                <Link
                  href="/dashboard/payroll-execution/process-signing-bonuses"
                  className="block w-full text-center bg-gradient-to-r from-amber-700 via-yellow-700 to-amber-800 hover:from-amber-600 hover:via-yellow-600 hover:to-amber-700 text-white py-4 px-6 rounded-xl font-bold text-base transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl hover:shadow-amber-700/50 flex items-center justify-center gap-2 border border-white/20"
                >
                  Process Bonuses
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </Link>
              </CardContent>
            </Card>
          </div>

            <div className="group relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 via-red-500 to-rose-600 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition duration-500"></div>
              <Card className="relative h-full bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl hover:shadow-orange-500/20 transition-all duration-500 transform hover:-translate-y-3 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-orange-400/30 to-red-400/20 rounded-full -mr-20 -mt-20 blur-2xl"></div>
                <CardHeader className="text-center pb-4 pt-8 relative z-10">
                  <div className="flex justify-center mb-6">
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-500 via-red-500 to-rose-600 shadow-2xl shadow-orange-500/50 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                      <Users className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-bold text-white mb-3 drop-shadow-lg">Process Termination Benefits</CardTitle>
                  <CardDescription className="text-white/90 text-base leading-relaxed font-medium">
                    Automatically process benefits upon resignation/termination
                  </CardDescription>
              </CardHeader>
                <CardContent className="pt-0 pb-6 relative z-10">
                <Link
                  href="/dashboard/payroll-execution/process-termination-benefits"
                    className="block w-full text-center bg-gradient-to-r from-orange-600 via-red-600 to-rose-600 hover:from-orange-500 hover:via-red-500 hover:to-rose-500 text-white py-4 px-6 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl hover:shadow-orange-500/50 flex items-center justify-center gap-2 border border-white/20"
                >
                    Process Benefits
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </Link>
              </CardContent>
            </Card>
            </div>

            <div className="group relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 via-pink-500 to-rose-600 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition duration-500"></div>
              <Card className="relative h-full bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl hover:shadow-purple-500/20 transition-all duration-500 transform hover:-translate-y-3 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-purple-400/30 to-pink-400/20 rounded-full -mr-20 -mt-20 blur-2xl"></div>
                <CardHeader className="text-center pb-4 pt-8 relative z-10">
                  <div className="flex justify-center mb-6">
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-rose-600 shadow-2xl shadow-purple-500/50 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                      <Eye className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-bold text-white mb-3 drop-shadow-lg">Review Signing Bonuses</CardTitle>
                  <CardDescription className="text-white/90 text-base leading-relaxed font-medium">
                    Review and approve processed signing bonuses
                  </CardDescription>
              </CardHeader>
                <CardContent className="pt-0 pb-6 relative z-10">
                <Link
                  href="/dashboard/payroll-execution/pre-initiation/signing-bonuses"
                    className="block w-full text-center bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:from-purple-500 hover:via-pink-500 hover:to-rose-500 text-white py-4 px-6 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl hover:shadow-purple-500/50 flex items-center justify-center gap-2 border border-white/20"
                >
                    Review Bonuses
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </Link>
              </CardContent>
            </Card>
            </div>

            <div className="group relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-red-500 via-rose-500 to-pink-600 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition duration-500"></div>
              <Card className="relative h-full bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl hover:shadow-red-500/20 transition-all duration-500 transform hover:-translate-y-3 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-red-400/30 to-rose-400/20 rounded-full -mr-20 -mt-20 blur-2xl"></div>
                <CardHeader className="text-center pb-4 pt-8 relative z-10">
                  <div className="flex justify-center mb-6">
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-red-500 via-rose-500 to-pink-600 shadow-2xl shadow-red-500/50 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                      <FileCheck className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-bold text-white mb-3 drop-shadow-lg">Review Termination Benefits</CardTitle>
                  <CardDescription className="text-white/90 text-base leading-relaxed font-medium">
                    Review and approve processed benefits upon resignation
                  </CardDescription>
              </CardHeader>
                <CardContent className="pt-0 pb-6 relative z-10">
                <Link
                  href="/dashboard/payroll-execution/pre-initiation/termination-benefits"
                    className="block w-full text-center bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 hover:from-red-500 hover:via-rose-500 hover:to-pink-500 text-white py-4 px-6 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl hover:shadow-red-500/50 flex items-center justify-center gap-2 border border-white/20"
                >
                    Review Benefits
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </Link>
              </CardContent>
            </Card>
            </div>

            <div className="group relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-600 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition duration-500"></div>
              <Card className="relative h-full bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl hover:shadow-yellow-500/20 transition-all duration-500 transform hover:-translate-y-3 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-yellow-400/30 to-amber-400/20 rounded-full -mr-20 -mt-20 blur-2xl"></div>
                <CardHeader className="text-center pb-4 pt-8 relative z-10">
                  <div className="flex justify-center mb-6">
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-yellow-500 via-amber-500 to-orange-600 shadow-2xl shadow-yellow-500/50 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                      <Edit className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-bold text-white mb-3 drop-shadow-lg">Edit Signing Bonuses</CardTitle>
                  <CardDescription className="text-white/90 text-base leading-relaxed font-medium">
                    Manually edit signing bonuses when needed
                  </CardDescription>
              </CardHeader>
                <CardContent className="pt-0 pb-6 relative z-10">
                <Link
                  href="/dashboard/payroll-execution/pre-initiation/signing-bonuses"
                    className="block w-full text-center bg-gradient-to-r from-yellow-600 via-amber-600 to-orange-600 hover:from-yellow-500 hover:via-amber-500 hover:to-orange-500 text-white py-4 px-6 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl hover:shadow-yellow-500/50 flex items-center justify-center gap-2 border border-white/20"
                >
                    Edit Bonuses
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </Link>
              </CardContent>
            </Card>
            </div>

            <div className="group relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 via-rose-500 to-red-600 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition duration-500"></div>
              <Card className="relative h-full bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl hover:shadow-pink-500/20 transition-all duration-500 transform hover:-translate-y-3 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 via-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-pink-400/30 to-rose-400/20 rounded-full -mr-20 -mt-20 blur-2xl"></div>
                <CardHeader className="text-center pb-4 pt-8 relative z-10">
                  <div className="flex justify-center mb-6">
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-pink-500 via-rose-500 to-red-600 shadow-2xl shadow-pink-500/50 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                      <Edit className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-bold text-white mb-3 drop-shadow-lg">Edit Termination Benefits</CardTitle>
                  <CardDescription className="text-white/90 text-base leading-relaxed font-medium">
                    Manually edit benefits upon resignation when needed
                  </CardDescription>
              </CardHeader>
                <CardContent className="pt-0 pb-6 relative z-10">
                <Link
                  href="/dashboard/payroll-execution/pre-initiation/termination-benefits"
                    className="block w-full text-center bg-gradient-to-r from-pink-600 via-rose-600 to-red-600 hover:from-pink-500 hover:via-rose-500 hover:to-red-500 text-white py-4 px-6 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl hover:shadow-pink-500/50 flex items-center justify-center gap-2 border border-white/20"
                >
                    Edit Benefits
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </Link>
              </CardContent>
            </Card>
            </div>
          </div>
        </div>

        {/* Initiation Phase */}
        <div className="mb-10">
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-8 flex items-center gap-3 px-4">
            <div className="w-2 h-8 bg-gradient-to-b from-green-500 via-emerald-500 to-teal-500 rounded-full shadow-lg shadow-green-500/50"></div>
            <span className="bg-gradient-to-r from-green-200 via-emerald-200 to-teal-200 bg-clip-text text-transparent">Payroll Initiation</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="group relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-600 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition duration-500"></div>
              <Card className="relative h-full bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl hover:shadow-green-500/20 transition-all duration-500 transform hover:-translate-y-3 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-green-400/30 to-emerald-400/20 rounded-full -mr-20 -mt-20 blur-2xl"></div>
                <CardHeader className="text-center pb-4 pt-8 relative z-10">
                  <div className="flex justify-center mb-6">
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 shadow-2xl shadow-green-500/50 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                      <Zap className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-bold text-white mb-3 drop-shadow-lg">Process Initiation</CardTitle>
                  <CardDescription className="text-white/90 text-base leading-relaxed font-medium">
                    Automatically process payroll initiation
                  </CardDescription>
              </CardHeader>
                <CardContent className="pt-0 pb-6 relative z-10">
                <Link
                  href="/dashboard/payroll-execution/process-initiation"
                    className="block w-full text-center bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 hover:from-green-500 hover:via-emerald-500 hover:to-teal-500 text-white py-4 px-6 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl hover:shadow-green-500/50 flex items-center justify-center gap-2 border border-white/20"
                >
                    Process Initiation
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </Link>
              </CardContent>
            </Card>
            </div>

            <div className="group relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-600 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition duration-500"></div>
              <Card className="relative h-full bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl hover:shadow-blue-500/20 transition-all duration-500 transform hover:-translate-y-3 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-400/30 to-cyan-400/20 rounded-full -mr-20 -mt-20 blur-2xl"></div>
                <CardHeader className="text-center pb-4 pt-8 relative z-10">
                  <div className="flex justify-center mb-6">
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-500 via-cyan-500 to-indigo-600 shadow-2xl shadow-blue-500/50 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                      <Eye className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-bold text-white mb-3 drop-shadow-lg">Review Initiation</CardTitle>
                  <CardDescription className="text-white/90 text-base leading-relaxed font-medium">
                    Review and approve processed payroll initiation
                  </CardDescription>
              </CardHeader>
                <CardContent className="pt-0 pb-6 relative z-10">
                <Link
                  href="/dashboard/payroll-execution/review-initiation"
                    className="block w-full text-center bg-gradient-to-r from-blue-600 via-cyan-600 to-indigo-600 hover:from-blue-500 hover:via-cyan-500 hover:to-indigo-500 text-white py-4 px-6 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl hover:shadow-blue-500/50 flex items-center justify-center gap-2 border border-white/20"
                >
                    Review Initiation
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </Link>
              </CardContent>
            </Card>
            </div>

            <div className="group relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-600 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition duration-500"></div>
              <Card className="relative h-full bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl hover:shadow-yellow-500/20 transition-all duration-500 transform hover:-translate-y-3 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-yellow-400/30 to-amber-400/20 rounded-full -mr-20 -mt-20 blur-2xl"></div>
                <CardHeader className="text-center pb-4 pt-8 relative z-10">
                  <div className="flex justify-center mb-6">
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-yellow-500 via-amber-500 to-orange-600 shadow-2xl shadow-yellow-500/50 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                      <Edit className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-bold text-white mb-3 drop-shadow-lg">Edit Initiation</CardTitle>
                  <CardDescription className="text-white/90 text-base leading-relaxed font-medium">
                    Manually edit payroll initiation when needed
                  </CardDescription>
              </CardHeader>
                <CardContent className="pt-0 pb-6 relative z-10">
                <Link
                  href="/dashboard/payroll-execution/review-initiation"
                    className="block w-full text-center bg-gradient-to-r from-yellow-600 via-amber-600 to-orange-600 hover:from-yellow-500 hover:via-amber-500 hover:to-orange-500 text-white py-4 px-6 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl hover:shadow-yellow-500/50 flex items-center justify-center gap-2 border border-white/20"
                >
                    Edit Initiation
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </Link>
              </CardContent>
            </Card>
            </div>
          </div>
        </div>

        {/* Calculation & Draft Generation */}
        <div className="mb-10">
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-8 flex items-center gap-3 px-4">
            <div className="w-2 h-8 bg-gradient-to-b from-indigo-500 via-purple-500 to-pink-500 rounded-full shadow-lg shadow-indigo-500/50"></div>
            <span className="bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200 bg-clip-text text-transparent">Calculation & Draft Generation</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="group relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-600 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition duration-500"></div>
              <Card className="relative h-full bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl hover:shadow-green-500/20 transition-all duration-500 transform hover:-translate-y-3 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-green-400/30 to-emerald-400/20 rounded-full -mr-20 -mt-20 blur-2xl"></div>
                <CardHeader className="text-center pb-4 pt-8 relative z-10">
                  <div className="flex justify-center mb-6">
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 shadow-2xl shadow-green-500/50 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                      <Calculator className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-bold text-white mb-3 drop-shadow-lg">Calculate Payroll</CardTitle>
                  <CardDescription className="text-white/90 text-base leading-relaxed font-medium">
                    Automatically calculate salaries, allowances, deductions, and contributions
                  </CardDescription>
              </CardHeader>
                <CardContent className="pt-0 pb-6 relative z-10">
                <Link
                  href="/dashboard/payroll-execution/calculate-payroll"
                    className="block w-full text-center bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 hover:from-green-500 hover:via-emerald-500 hover:to-teal-500 text-white py-4 px-6 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl hover:shadow-green-500/50 flex items-center justify-center gap-2 border border-white/20"
                >
                    Calculate
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </Link>
              </CardContent>
            </Card>
            </div>

            <div className="group relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 via-pink-500 to-rose-600 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition duration-500"></div>
              <Card className="relative h-full bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl hover:shadow-purple-500/20 transition-all duration-500 transform hover:-translate-y-3 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-purple-400/30 to-pink-400/20 rounded-full -mr-20 -mt-20 blur-2xl"></div>
                <CardHeader className="text-center pb-4 pt-8 relative z-10">
                  <div className="flex justify-center mb-6">
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-rose-600 shadow-2xl shadow-purple-500/50 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                      <DollarSign className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-bold text-white mb-3 drop-shadow-lg">Prorated Salary</CardTitle>
                  <CardDescription className="text-white/90 text-base leading-relaxed font-medium">
                    Calculate prorated salaries for mid-month hires/terminations
                  </CardDescription>
              </CardHeader>
                <CardContent className="pt-0 pb-6 relative z-10">
                <Link
                  href="/dashboard/payroll-execution/prorated-salary"
                    className="block w-full text-center bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:from-purple-500 hover:via-pink-500 hover:to-rose-500 text-white py-4 px-6 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl hover:shadow-purple-500/50 flex items-center justify-center gap-2 border border-white/20"
                >
                    Calculate Prorated
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </Link>
              </CardContent>
            </Card>
            </div>

            <div className="group relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-blue-500 to-purple-600 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition duration-500"></div>
              <Card className="relative h-full bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl hover:shadow-indigo-500/20 transition-all duration-500 transform hover:-translate-y-3 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-indigo-400/30 to-blue-400/20 rounded-full -mr-20 -mt-20 blur-2xl"></div>
                <CardHeader className="text-center pb-4 pt-8 relative z-10">
                  <div className="flex justify-center mb-6">
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-500 via-blue-500 to-purple-600 shadow-2xl shadow-indigo-500/50 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                      <Shield className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-bold text-white mb-3 drop-shadow-lg">Apply Statutory Rules</CardTitle>
                  <CardDescription className="text-white/90 text-base leading-relaxed font-medium">
                    Auto-apply tax, pension, insurance, and labor law deductions
                  </CardDescription>
              </CardHeader>
                <CardContent className="pt-0 pb-6 relative z-10">
                <Link
                  href="/dashboard/payroll-execution/apply-statutory-rules"
                    className="block w-full text-center bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 hover:from-indigo-500 hover:via-blue-500 hover:to-purple-500 text-white py-4 px-6 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl hover:shadow-indigo-500/50 flex items-center justify-center gap-2 border border-white/20"
                >
                    Apply Rules
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </Link>
              </CardContent>
            </Card>
            </div>

            <div className="group relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-600 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition duration-500"></div>
              <Card className="relative h-full bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl hover:shadow-orange-500/20 transition-all duration-500 transform hover:-translate-y-3 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-orange-400/30 to-amber-400/20 rounded-full -mr-20 -mt-20 blur-2xl"></div>
                <CardHeader className="text-center pb-4 pt-8 relative z-10">
                  <div className="flex justify-center mb-6">
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-600 shadow-2xl shadow-orange-500/50 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                      <FileText className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-bold text-white mb-3 drop-shadow-lg">Generate Draft</CardTitle>
                  <CardDescription className="text-white/90 text-base leading-relaxed font-medium">
                    Automatically generate draft payroll runs at end of each cycle
                  </CardDescription>
              </CardHeader>
                <CardContent className="pt-0 pb-6 relative z-10">
                <Link
                  href="/dashboard/payroll-execution/generate-draft"
                    className="block w-full text-center bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 hover:from-orange-500 hover:via-amber-500 hover:to-yellow-500 text-white py-4 px-6 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl hover:shadow-orange-500/50 flex items-center justify-center gap-2 border border-white/20"
                >
                    Generate Draft
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </Link>
              </CardContent>
            </Card>
            </div>
          </div>
        </div>

        {/* Review & Approval */}
        <div className="mb-10">
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-8 flex items-center gap-3 px-4">
            <div className="w-2 h-8 bg-gradient-to-b from-purple-500 via-pink-500 to-rose-500 rounded-full shadow-lg shadow-purple-500/50"></div>
            <span className="bg-gradient-to-r from-purple-200 via-pink-200 to-rose-200 bg-clip-text text-transparent">Review & Approval</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="group relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 via-pink-500 to-rose-600 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition duration-500"></div>
              <Card className="relative h-full bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl hover:shadow-purple-500/20 transition-all duration-500 transform hover:-translate-y-3 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-purple-400/30 to-pink-400/20 rounded-full -mr-20 -mt-20 blur-2xl"></div>
                <CardHeader className="text-center pb-4 pt-8 relative z-10">
                  <div className="flex justify-center mb-6">
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-rose-600 shadow-2xl shadow-purple-500/50 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                      <Eye className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-bold text-white mb-3 drop-shadow-lg">Preview Dashboard</CardTitle>
                  <CardDescription className="text-white/90 text-base leading-relaxed font-medium">
                    Review system-generated payroll results in preview dashboard
                  </CardDescription>
              </CardHeader>
                <CardContent className="pt-0 pb-6 relative z-10">
                <Link
                  href="/dashboard/payroll-execution/preview"
                    className="block w-full text-center bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:from-purple-500 hover:via-pink-500 hover:to-rose-500 text-white py-4 px-6 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl hover:shadow-purple-500/50 flex items-center justify-center gap-2 border border-white/20"
                >
                    View Preview
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </Link>
              </CardContent>
            </Card>
            </div>

            <div className="group relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-red-500 via-rose-500 to-pink-600 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition duration-500"></div>
              <Card className="relative h-full bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl hover:shadow-red-500/20 transition-all duration-500 transform hover:-translate-y-3 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-red-400/30 to-rose-400/20 rounded-full -mr-20 -mt-20 blur-2xl"></div>
                <CardHeader className="text-center pb-4 pt-8 relative z-10">
                  <div className="flex justify-center mb-6">
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-red-500 via-rose-500 to-pink-600 shadow-2xl shadow-red-500/50 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                      <Flag className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-bold text-white mb-3 drop-shadow-lg">Flag Irregularities</CardTitle>
                  <CardDescription className="text-white/90 text-base leading-relaxed font-medium">
                    Flag irregularities (salary spikes, missing bank accounts, negative net pay)
                  </CardDescription>
              </CardHeader>
                <CardContent className="pt-0 pb-6 relative z-10">
                <Link
                  href="/dashboard/payroll-execution/flag-irregularities"
                    className="block w-full text-center bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 hover:from-red-500 hover:via-rose-500 hover:to-pink-500 text-white py-4 px-6 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl hover:shadow-red-500/50 flex items-center justify-center gap-2 border border-white/20"
                >
                    Flag Irregularities
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </Link>
              </CardContent>
            </Card>
            </div>

            <div className="group relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition duration-500"></div>
              <Card className="relative h-full bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl hover:shadow-cyan-500/20 transition-all duration-500 transform hover:-translate-y-3 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-cyan-400/30 to-blue-400/20 rounded-full -mr-20 -mt-20 blur-2xl"></div>
                <CardHeader className="text-center pb-4 pt-8 relative z-10">
                  <div className="flex justify-center mb-6">
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-600 shadow-2xl shadow-cyan-500/50 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                      <Send className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-bold text-white mb-3 drop-shadow-lg">Send for Approval</CardTitle>
                  <CardDescription className="text-white/90 text-base leading-relaxed font-medium">
                    Send payroll run for Manager and Finance approval before finalization
                  </CardDescription>
              </CardHeader>
                <CardContent className="pt-0 pb-6 relative z-10">
                <Link
                  href="/dashboard/payroll-execution/send-for-approval"
                    className="block w-full text-center bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:via-blue-500 hover:to-indigo-500 text-white py-4 px-6 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl hover:shadow-cyan-500/50 flex items-center justify-center gap-2 border border-white/20"
                >
                    Send for Approval
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </Link>
              </CardContent>
            </Card>
            </div>
          </div>
        </div>

        {/* Payslip Generation */}
        <div className="mb-10">
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-8 flex items-center gap-3 px-4">
            <div className="w-2 h-8 bg-gradient-to-b from-indigo-500 via-blue-500 to-cyan-500 rounded-full shadow-lg shadow-indigo-500/50"></div>
            <span className="bg-gradient-to-r from-indigo-200 via-blue-200 to-cyan-200 bg-clip-text text-transparent">Payslip Generation</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="group relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-600 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition duration-500"></div>
              <Card className="relative h-full bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl hover:shadow-indigo-500/20 transition-all duration-500 transform hover:-translate-y-3 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-indigo-400/30 to-blue-400/20 rounded-full -mr-20 -mt-20 blur-2xl"></div>
                <CardHeader className="text-center pb-4 pt-8 relative z-10">
                  <div className="flex justify-center mb-6">
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-600 shadow-2xl shadow-indigo-500/50 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                      <Receipt className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-bold text-white mb-3 drop-shadow-lg">Generate Payslips</CardTitle>
                  <CardDescription className="text-white/90 text-base leading-relaxed font-medium">
                    Automatically generate and distribute payslips (PDF, email, portal)
                  </CardDescription>
              </CardHeader>
                <CardContent className="pt-0 pb-6 relative z-10">
                <Link
                  href="/dashboard/payroll-execution/payslips/generate"
                    className="block w-full text-center bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 hover:from-indigo-500 hover:via-blue-500 hover:to-cyan-500 text-white py-4 px-6 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl hover:shadow-indigo-500/50 flex items-center justify-center gap-2 border border-white/20"
                >
                    Generate Payslips
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </Link>
              </CardContent>
            </Card>
            </div>

            <div className="group relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-600 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition duration-500"></div>
              <Card className="relative h-full bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl hover:shadow-teal-500/20 transition-all duration-500 transform hover:-translate-y-3 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 via-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-teal-400/30 to-cyan-400/20 rounded-full -mr-20 -mt-20 blur-2xl"></div>
                <CardHeader className="text-center pb-4 pt-8 relative z-10">
                  <div className="flex justify-center mb-6">
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-600 shadow-2xl shadow-teal-500/50 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                      <Eye className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-bold text-white mb-3 drop-shadow-lg">View Payslips</CardTitle>
                  <CardDescription className="text-white/90 text-base leading-relaxed font-medium">
                    View and manage all generated employee payslips
                  </CardDescription>
              </CardHeader>
                <CardContent className="pt-0 pb-6 relative z-10">
                <Link
                  href="/dashboard/payroll-execution/payslips"
                    className="block w-full text-center bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 hover:from-teal-500 hover:via-cyan-500 hover:to-blue-500 text-white py-4 px-6 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl hover:shadow-teal-500/50 flex items-center justify-center gap-2 border border-white/20"
                >
                    View Payslips
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </Link>
              </CardContent>
            </Card>
            </div>
          </div>
        </div>
      </div>

      {/* ========== PAYROLL TRACKING SECTION ========== */}
      <div className="mb-20">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-4 mb-6 px-6 py-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
            <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-600 shadow-xl shadow-indigo-500/50 transform hover:scale-110 transition-transform duration-300">
              <BarChart3 className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200 bg-clip-text text-transparent">
              Payroll Tracking
            </h2>
          </div>
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="h-1.5 w-32 md:w-48 bg-gradient-to-r from-transparent via-indigo-500 to-purple-500 rounded-full shadow-lg shadow-indigo-500/50"></div>
            <div className="p-2 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="h-1.5 w-32 md:w-48 bg-gradient-to-l from-transparent via-purple-500 to-pink-500 rounded-full shadow-lg shadow-purple-500/50"></div>
          </div>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Approve/reject disputes and expense claims (approved items escalate to Payroll Manager for confirmation). Generate department reports and track status of claims, disputes, and refunds.
          </p>
          <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Review and approve employee disputes and claims, generate reports, and track payroll status with comprehensive analytics
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-slate-600 via-gray-600 to-slate-700 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition duration-500"></div>
            <Card className="relative h-full bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl hover:shadow-slate-500/20 transition-all duration-500 transform hover:-translate-y-3 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-600/10 via-gray-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-slate-500/30 to-gray-500/20 rounded-full -mr-20 -mt-20 blur-2xl"></div>
              <CardHeader className="text-center pb-4 pt-8 relative z-10">
                <div className="flex justify-center mb-6">
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-600 via-gray-600 to-slate-700 shadow-2xl shadow-slate-600/50 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                    <AlertCircle className="w-8 h-8 text-white" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold text-white mb-3 drop-shadow-lg">Pending Disputes</CardTitle>
                <CardDescription className="text-white/90 text-base leading-relaxed font-medium">
                  Approve/reject disputes (escalate to manager if approved)
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 pb-6 relative z-10">
                <Link
                  href="/dashboard/payroll-tracking/pending-disputes"
                  className="block w-full text-center bg-gradient-to-r from-slate-700 via-gray-700 to-slate-800 hover:from-slate-600 hover:via-gray-600 hover:to-slate-700 text-white py-4 px-6 rounded-xl font-bold text-base transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl hover:shadow-slate-600/50 flex items-center justify-center gap-2 border border-white/20"
                >
                  Review Disputes
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </Link>
              </CardContent>
            </Card>
          </div>

          <div className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition duration-500"></div>
            <Card className="relative h-full bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl hover:shadow-blue-700/20 transition-all duration-500 transform hover:-translate-y-3 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-700/10 via-indigo-700/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-600/30 to-indigo-600/20 rounded-full -mr-20 -mt-20 blur-2xl"></div>
              <CardHeader className="text-center pb-4 pt-8 relative z-10">
                <div className="flex justify-center mb-6">
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-700 via-indigo-700 to-blue-800 shadow-2xl shadow-blue-700/50 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                    <FileCheck className="w-8 h-8 text-white" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold text-white mb-3 drop-shadow-lg">Pending Claims</CardTitle>
                <CardDescription className="text-white/90 text-base leading-relaxed font-medium">
                  Approve/reject expense claims (escalate to manager if approved)
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 pb-6 relative z-10">
                <Link
                  href="/dashboard/payroll-tracking/pending-claims"
                  className="block w-full text-center bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 hover:from-blue-600 hover:via-indigo-600 hover:to-blue-700 text-white py-4 px-6 rounded-xl font-bold text-base transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl hover:shadow-blue-700/50 flex items-center justify-center gap-2 border border-white/20"
                >
                  Review Claims
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </Link>
              </CardContent>
            </Card>
          </div>

          <div className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-800 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition duration-500"></div>
            <Card className="relative h-full bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl hover:shadow-indigo-700/20 transition-all duration-500 transform hover:-translate-y-3 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-700/10 via-purple-700/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-indigo-600/30 to-purple-600/20 rounded-full -mr-20 -mt-20 blur-2xl"></div>
              <CardHeader className="text-center pb-4 pt-8 relative z-10">
                <div className="flex justify-center mb-6">
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-700 via-purple-700 to-indigo-800 shadow-2xl shadow-indigo-700/50 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                    <BarChart3 className="w-8 h-8 text-white" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold text-white mb-3 drop-shadow-lg">Department Reports</CardTitle>
                <CardDescription className="text-white/90 text-base leading-relaxed font-medium">
                  Generate payroll reports by department
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 pb-6 relative z-10">
                <Link
                  href="/dashboard/payroll-tracking/department-reports"
                  className="block w-full text-center bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-800 hover:from-indigo-600 hover:via-purple-600 hover:to-indigo-700 text-white py-4 px-6 rounded-xl font-bold text-base transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl hover:shadow-indigo-700/50 flex items-center justify-center gap-2 border border-white/20"
                >
                  View Reports
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </Link>
              </CardContent>
            </Card>
          </div>

          <div className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-teal-700 via-cyan-700 to-teal-800 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition duration-500"></div>
            <Card className="relative h-full bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl hover:shadow-teal-700/20 transition-all duration-500 transform hover:-translate-y-3 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-teal-700/10 via-cyan-700/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-teal-600/30 to-cyan-600/20 rounded-full -mr-20 -mt-20 blur-2xl"></div>
              <CardHeader className="text-center pb-4 pt-8 relative z-10">
                <div className="flex justify-center mb-6">
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-teal-700 via-cyan-700 to-teal-800 shadow-2xl shadow-teal-700/50 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                    <TrendingUp className="w-8 h-8 text-white" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold text-white mb-3 drop-shadow-lg">Track Status</CardTitle>
                <CardDescription className="text-white/90 text-base leading-relaxed font-medium">
                  Track claims, disputes, and refunds status
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 pb-6 relative z-10">
                <Link
                  href="/dashboard/payroll-tracking/tracking"
                  className="block w-full text-center bg-gradient-to-r from-teal-700 via-cyan-700 to-teal-800 hover:from-teal-600 hover:via-cyan-600 hover:to-teal-700 text-white py-4 px-6 rounded-xl font-bold text-base transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl hover:shadow-teal-700/50 flex items-center justify-center gap-2 border border-white/20"
                >
                  Track Status
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      </div>

      {/* Add custom animations */}
      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}
