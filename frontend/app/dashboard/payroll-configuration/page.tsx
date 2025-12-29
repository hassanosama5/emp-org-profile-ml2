"use client";

import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { 
  FileText, 
  DollarSign, 
  Briefcase, 
  Gift, 
  Users, 
  Shield,
  Building2,
  Sparkles,
  Star,
  Settings
} from "lucide-react";

export default function PayrollConfigurationPage() {
  const { user } = useAuth();
  
  // Protect route - ONLY Payroll Specialist can access this dashboard
  useRequireAuth([SystemRole.PAYROLL_SPECIALIST], '/dashboard');

  const userName = user?.firstName && user?.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user?.fullName || user?.workEmail?.split('@')[0] || user?.personalEmail?.split('@')[0] || 'User';

  const configurationCards = [
    {
      title: "Payroll Policies",
      description: "Configure company-level payroll policies and rules",
      href: "/dashboard/payroll-configuration/policies",
      icon: FileText,
      iconColor: "bg-blue-500",
      buttonGradient: "from-blue-500 to-cyan-500",
      hasButton: true,
    },
    {
      title: "Pay Grades",
      description: "Define pay grades, salary, and compensation limits",
      href: "/dashboard/payroll-configuration/pay-grades",
      icon: DollarSign,
      iconColor: "bg-purple-500",
      buttonGradient: "from-purple-500 to-pink-500",
      hasButton: true,
    },
    {
      title: "Pay Types",
      description: "Define employee pay types (hourly, daily, weekly, monthly)",
      href: "/dashboard/payroll-configuration/pay-types",
      icon: Briefcase,
      iconColor: "bg-blue-600",
      buttonGradient: "from-blue-500 to-purple-500",
      hasButton: true,
    },
    {
      title: "Allowances",
      description: "Set allowances (transportation, housing, etc.)",
      href: "/dashboard/payroll-configuration/allowances",
      icon: Gift,
      iconColor: "bg-green-500",
      buttonGradient: "from-emerald-500 to-teal-500",
      hasButton: false,
    },
    {
      title: "Tax Rules",
      description: "Define tax rules and laws (progressive rates, exemptions)",
      href: "/dashboard/payroll-configuration/tax-rules",
      icon: Shield,
      iconColor: "bg-red-500",
      buttonGradient: "from-red-500 to-rose-500",
      hasButton: false,
    },
    {
      title: "Signing Bonuses",
      description: "Configure policies for signing bonuses",
      href: "/dashboard/payroll-configuration/signing-bonuses",
      icon: Users,
      iconColor: "bg-orange-500",
      buttonGradient: "from-orange-500 to-amber-500",
      hasButton: false,
    },
    {
      title: "Termination Benefits",
      description: "Configure termination and resignation benefits",
      href: "/dashboard/payroll-configuration/termination-benefits",
      icon: Shield,
      iconColor: "bg-rose-500",
      buttonGradient: "from-rose-500 to-pink-500",
      hasButton: false,
    },
    {
      title: "Insurance Brackets",
      description: "Configure insurance contribution brackets",
      href: "/dashboard/payroll-configuration/insurance-brackets",
      icon: Building2,
      iconColor: "bg-indigo-500",
      buttonGradient: "from-indigo-500 to-blue-500",
      hasButton: false,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 relative overflow-hidden">
      {/* Subtle Background Shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-100/30 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-100/20 rounded-full blur-3xl"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        {/* Top Right Badge */}
        <div className="flex justify-end mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg border border-pink-200/50 shadow-sm">
            <Sparkles className="w-4 h-4 text-pink-500" />
            <span className="text-sm font-medium text-gray-700">Payroll Configuration</span>
          </div>
        </div>

        {/* Header Section */}
        <div className="mb-12 text-center">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold mb-6">
            <span className="text-gray-900">Payroll Specialist </span>
            <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              Dashboard
            </span>
          </h1>
          
          <div className="space-y-3 mb-8">
            <p className="text-2xl font-bold text-gray-800">
              Welcome back, <span className="text-gray-900">{userName}!</span>
            </p>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Create and manage payroll configurations with comprehensive tools and intuitive workflows.
            </p>
          </div>

          {/* Decorative Separator with Stars */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <Star className="w-5 h-5 text-blue-500 fill-blue-500" />
            <div className="h-px w-32 bg-gradient-to-r from-blue-500 to-pink-500"></div>
            <Star className="w-5 h-5 text-pink-500 fill-pink-500" />
          </div>
        </div>

        {/* Configuration Management Section */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-500 rounded-xl shadow-lg">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Configuration Management
            </h2>
          </div>
          <p className="text-gray-600 text-lg ml-16 mb-6">
            Configure company-level payroll policies, pay grades, allowances, tax rules, and benefits with powerful management tools.
          </p>
          
          {/* Decorative Separator with Stars */}
          <div className="flex items-center gap-3 ml-16 mb-8">
            <Star className="w-4 h-4 text-blue-500 fill-blue-500" />
            <div className="h-px w-24 bg-gradient-to-r from-blue-500 to-pink-500"></div>
            <Star className="w-4 h-4 text-pink-500 fill-pink-500" />
          </div>
        </div>

        {/* Configuration Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {configurationCards.map((card, index) => {
            const IconComponent = card.icon;
            return (
              <div
                key={card.href}
                className="group relative bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
              >
                {/* Subtle Background Shape */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-gray-50 to-transparent rounded-bl-full opacity-50"></div>
                
                <div className="relative p-6">
                  {/* Icon */}
                  <div className="mb-4">
                    <div className={`w-14 h-14 ${card.iconColor} rounded-xl flex items-center justify-center shadow-lg transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                      <IconComponent className="w-7 h-7 text-white" />
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {card.title}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-600 text-sm mb-6 leading-relaxed">
                    {card.description}
                  </p>

                  {/* Button */}
                  {card.hasButton && (
                    <Link
                      href={card.href}
                      className={`group/btn inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r ${card.buttonGradient} text-white text-sm font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105`}
                    >
                      <span>Manage {card.title.split(' ')[0]}</span>
                      <span className="transform group-hover/btn:translate-x-1 transition-transform duration-300">→</span>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

