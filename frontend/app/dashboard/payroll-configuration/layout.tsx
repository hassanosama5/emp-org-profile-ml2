'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function PayrollConfigurationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  const navItems = [
    { 
      href: '/dashboard/payroll-configuration/policies', 
      label: 'Policies',
      icon: '📋',
      color: 'violet'
    },
    { 
      href: '/dashboard/payroll-configuration/pay-grades', 
      label: 'Pay Grades',
      icon: '💼',
      color: 'blue'
    },
    { 
      href: '/dashboard/payroll-configuration/pay-types', 
      label: 'Pay Types',
      icon: '💰',
      color: 'purple'
    },
    { 
      href: '/dashboard/payroll-configuration/allowances', 
      label: 'Allowances',
      icon: '🎁',
      color: 'green'
    },
    { 
      href: '/dashboard/payroll-configuration/signing-bonuses', 
      label: 'Signing Bonuses',
      icon: '🎉',
      color: 'yellow'
    },
    { 
      href: '/dashboard/payroll-configuration/termination-benefits', 
      label: 'Termination Benefits',
      icon: '👋',
      color: 'rose'
    },
    { 
      href: '/dashboard/payroll-configuration/insurance-brackets', 
      label: 'Insurance Brackets',
      icon: '🛡️',
      color: 'cyan'
    },
    { 
      href: '/dashboard/payroll-configuration/tax-rules', 
      label: 'Tax Rules',
      icon: '📊',
      color: 'slate'
    },
  ];

  const isActive = (href: string) => {
    return pathname?.startsWith(href) || false;
  };

  const getColorClasses = (color: string, active: boolean) => {
    const colors: Record<string, { active: string; inactive: string; hover: string }> = {
      violet: {
        active: 'bg-violet-100 text-violet-700 border-violet-500',
        inactive: 'text-gray-600 border-transparent',
        hover: 'hover:bg-violet-50 hover:text-violet-600 hover:border-violet-300'
      },
      blue: {
        active: 'bg-blue-100 text-blue-700 border-blue-500',
        inactive: 'text-gray-600 border-transparent',
        hover: 'hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300'
      },
      purple: {
        active: 'bg-purple-100 text-purple-700 border-purple-500',
        inactive: 'text-gray-600 border-transparent',
        hover: 'hover:bg-purple-50 hover:text-purple-600 hover:border-purple-300'
      },
      green: {
        active: 'bg-green-100 text-green-700 border-green-500',
        inactive: 'text-gray-600 border-transparent',
        hover: 'hover:bg-green-50 hover:text-green-600 hover:border-green-300'
      },
      yellow: {
        active: 'bg-yellow-100 text-yellow-700 border-yellow-500',
        inactive: 'text-gray-600 border-transparent',
        hover: 'hover:bg-yellow-50 hover:text-yellow-600 hover:border-yellow-300'
      },
      rose: {
        active: 'bg-rose-100 text-rose-700 border-rose-500',
        inactive: 'text-gray-600 border-transparent',
        hover: 'hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300'
      },
      cyan: {
        active: 'bg-cyan-100 text-cyan-700 border-cyan-500',
        inactive: 'text-gray-600 border-transparent',
        hover: 'hover:bg-cyan-50 hover:text-cyan-600 hover:border-cyan-300'
      },
      slate: {
        active: 'bg-slate-100 text-slate-700 border-slate-500',
        inactive: 'text-gray-600 border-transparent',
        hover: 'hover:bg-slate-50 hover:text-slate-600 hover:border-slate-300'
      },
    };
    const colorClasses = colors[color] || colors.violet;
    return active 
      ? `${colorClasses.active} shadow-sm` 
      : `${colorClasses.inactive} ${colorClasses.hover}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <nav className="bg-white/80 backdrop-blur-sm shadow-lg border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Row */}
          <div className="flex items-center justify-between h-16 border-b border-gray-200">
            <div className="flex-shrink-0 flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent whitespace-nowrap">
                Payroll Configuration
              </h1>
            </div>
            {/* Mobile menu button */}
            <div className="lg:hidden">
              <button className="p-2 rounded-lg text-gray-600 hover:bg-gray-100">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                </svg>
              </button>
            </div>
          </div>
          
          {/* Navigation Row */}
          <div className="flex items-center h-14 overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-1.5 min-w-max">
              {navItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      ${getColorClasses(item.color, active)}
                      inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                      border-2 transition-all duration-200
                      ${active ? 'shadow-sm' : ''}
                      whitespace-nowrap flex-shrink-0
                    `}
                  >
                    <span className="text-sm">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
          
          {/* Mobile menu */}
          <div className="lg:hidden pb-4 pt-2">
            <div className="flex flex-wrap gap-2">
              {navItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      ${getColorClasses(item.color, active)}
                      inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold
                      border-2 transition-all duration-200
                    `}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}