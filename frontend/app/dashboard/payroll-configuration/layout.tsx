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

  // Only show navigation when NOT on the main dashboard page, approvals page, stats page, or company-settings page
  const isMainDashboard = pathname === '/dashboard/payroll-configuration';
  const isApprovalsPage = pathname === '/dashboard/payroll-configuration/approvals';
  const isStatsPage = pathname === '/dashboard/payroll-configuration/stats';
  const isCompanySettingsPage = pathname === '/dashboard/payroll-configuration/company-settings';

  const getColorClasses = (color: string, active: boolean) => {
    const colors: Record<string, { active: string; inactive: string; hover: string }> = {
      violet: {
        active: 'bg-gradient-to-r from-violet-500/30 to-indigo-500/30 text-white border-violet-400/50 shadow-lg shadow-violet-500/20',
        inactive: 'text-white/70 border-white/10 backdrop-blur-md bg-white/5',
        hover: 'hover:bg-white/10 hover:text-white hover:border-white/30 hover:shadow-md'
      },
      blue: {
        active: 'bg-gradient-to-r from-blue-500/30 to-cyan-500/30 text-white border-blue-400/50 shadow-lg shadow-blue-500/20',
        inactive: 'text-white/70 border-white/10 backdrop-blur-md bg-white/5',
        hover: 'hover:bg-white/10 hover:text-white hover:border-white/30 hover:shadow-md'
      },
      purple: {
        active: 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 text-white border-purple-400/50 shadow-lg shadow-purple-500/20',
        inactive: 'text-white/70 border-white/10 backdrop-blur-md bg-white/5',
        hover: 'hover:bg-white/10 hover:text-white hover:border-white/30 hover:shadow-md'
      },
      green: {
        active: 'bg-gradient-to-r from-emerald-500/30 to-teal-500/30 text-white border-emerald-400/50 shadow-lg shadow-emerald-500/20',
        inactive: 'text-white/70 border-white/10 backdrop-blur-md bg-white/5',
        hover: 'hover:bg-white/10 hover:text-white hover:border-white/30 hover:shadow-md'
      },
      yellow: {
        active: 'bg-gradient-to-r from-yellow-500/30 to-amber-500/30 text-white border-yellow-400/50 shadow-lg shadow-yellow-500/20',
        inactive: 'text-white/70 border-white/10 backdrop-blur-md bg-white/5',
        hover: 'hover:bg-white/10 hover:text-white hover:border-white/30 hover:shadow-md'
      },
      rose: {
        active: 'bg-gradient-to-r from-rose-500/30 to-pink-500/30 text-white border-rose-400/50 shadow-lg shadow-rose-500/20',
        inactive: 'text-white/70 border-white/10 backdrop-blur-md bg-white/5',
        hover: 'hover:bg-white/10 hover:text-white hover:border-white/30 hover:shadow-md'
      },
      cyan: {
        active: 'bg-gradient-to-r from-cyan-500/30 to-blue-500/30 text-white border-cyan-400/50 shadow-lg shadow-cyan-500/20',
        inactive: 'text-white/70 border-white/10 backdrop-blur-md bg-white/5',
        hover: 'hover:bg-white/10 hover:text-white hover:border-white/30 hover:shadow-md'
      },
      slate: {
        active: 'bg-gradient-to-r from-slate-500/30 to-gray-500/30 text-white border-slate-400/50 shadow-lg shadow-slate-500/20',
        inactive: 'text-white/70 border-white/10 backdrop-blur-md bg-white/5',
        hover: 'hover:bg-white/10 hover:text-white hover:border-white/30 hover:shadow-md'
      },
    };
    const colorClasses = colors[color] || colors.violet;
    return active 
      ? `${colorClasses.active}` 
      : `${colorClasses.inactive} ${colorClasses.hover}`;
  };

  return (
    <div className="min-h-screen">
      {!isMainDashboard && !isApprovalsPage && !isStatsPage && !isCompanySettingsPage && (
        <nav className="relative backdrop-blur-xl bg-gradient-to-br from-slate-900/95 via-indigo-950/95 to-slate-900/95 border-b border-white/10 shadow-2xl sticky top-0 z-50">
          {/* Animated gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 animate-pulse"></div>
          
          <div className="relative max-w-full mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header Row */}
            <div className="flex items-center justify-between h-16 border-b border-white/10">
              <div className="flex-shrink-0 flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-violet-500 via-indigo-600 to-purple-600 rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-300">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                </div>
                <h1 className="text-xl font-extrabold bg-gradient-to-r from-violet-300 via-indigo-300 to-purple-300 bg-clip-text text-transparent whitespace-nowrap drop-shadow-lg">
                  Payroll Configuration
                </h1>
              </div>
              {/* Mobile menu button */}
              <div className="lg:hidden">
                <button className="p-2 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors duration-200">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Navigation Row */}
            <div className="flex items-center h-16 overflow-x-auto scrollbar-hide py-2">
              <div className="flex items-center gap-2 min-w-max">
                {navItems.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`
                        ${getColorClasses(item.color, active)}
                        inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold
                        border-2 transition-all duration-300
                        ${active ? 'scale-105' : 'scale-100'}
                        whitespace-nowrap flex-shrink-0
                        transform hover:scale-105
                      `}
                    >
                      <span className="text-base filter drop-shadow-sm">{item.icon}</span>
                      <span className="drop-shadow-sm">{item.label}</span>
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
                        inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold
                        border-2 transition-all duration-300
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
      )}
      <main>{children}</main>
    </div>
  );
}