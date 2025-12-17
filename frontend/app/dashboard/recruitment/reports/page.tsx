"use client";

// ============================================================================
// RECRUITMENT REPORTS PAGE
// ============================================================================
// Provides comprehensive analytics for HR Managers including:
// - Time-to-Hire metrics
// - Source Effectiveness (Referral vs Direct)
// - Pipeline Conversion Rates
// - Interview Analytics
// ============================================================================

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { recruitmentApi } from "@/lib/api/recruitment/recruitment";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Toast, useToast } from "@/components/leaves/Toast";

// Types for report data
interface TimeToHireReport {
  overall: {
    averageDays: number;
    totalHires: number;
    fastestHire?: number;
    slowestHire?: number;
  };
  byPosition: Array<{ position: string; averageDays: number; totalHires: number }>;
  byMonth: Array<{ month: string; averageDays: number; totalHires: number }>;
}

interface SourceEffectivenessReport {
  summary: {
    totalApplications: number;
    referralApplications: number;
    directApplications: number;
    referralPercentage: number;
  };
  referral: {
    total: number;
    hired: number;
    inProcess: number;
    rejected: number;
    hireRate: number;
  };
  direct: {
    total: number;
    hired: number;
    inProcess: number;
    rejected: number;
    hireRate: number;
  };
  comparison: {
    referralAdvantage: number;
    recommendation: string;
  };
  topReferrers: Array<{ employeeId: string; referrals: number; hires: number }>;
}

interface PipelineConversionReport {
  funnel: Array<{ stage: string; count: number; percentage: number }>;
  conversionRates: {
    applicationToScreening: number;
    screeningToOffer: number;
    offerToHire: number;
    overallConversion: number;
  };
  statusBreakdown: {
    submitted: number;
    inProcess: number;
    offer: number;
    hired: number;
    rejected: number;
  };
  dropOffAnalysis: {
    atScreening: number;
    atInterview: number;
    atOffer: number;
    rejectedPercentage: number;
  };
}

interface InterviewAnalyticsReport {
  summary: {
    totalInterviews: number;
    completedInterviews: number;
    scheduledInterviews: number;
    cancelledInterviews: number;
    completionRate: number;
  };
  scoring: {
    totalAssessments: number;
    averageScore: number;
    highScores: { count: number; percentage: number };
    mediumScores: { count: number; percentage: number };
    lowScores: { count: number; percentage: number };
    highestScore: number;
    lowestScore: number;
  };
  byMethod: Array<{ method: string; count: number; percentage: number }>;
  feedbackAnalysis: {
    interviewsWithFeedback: number;
    interviewsWithoutFeedback: number;
    feedbackRate: number;
  };
  topInterviewers: Array<{ interviewerId: string; interviewCount: number }>;
}

export default function RecruitmentReportsPage() {
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();

  // Report data states
  const [timeToHire, setTimeToHire] = useState<TimeToHireReport | null>(null);
  const [sourceEffectiveness, setSourceEffectiveness] = useState<SourceEffectivenessReport | null>(null);
  const [pipelineConversion, setPipelineConversion] = useState<PipelineConversionReport | null>(null);
  const [interviewAnalytics, setInterviewAnalytics] = useState<InterviewAnalyticsReport | null>(null);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "time" | "source" | "pipeline" | "interview">("overview");

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const reports = await recruitmentApi.getRecruitmentReports();
      
      setTimeToHire(reports.timeToHire);
      setSourceEffectiveness(reports.sourceEffectiveness);
      setPipelineConversion(reports.pipelineConversion);
      setInterviewAnalytics(reports.interviewAnalytics);
    } catch (error: any) {
      showToast(error.message || "Failed to load recruitment reports", "error");
    } finally {
      setLoading(false);
    }
  };

  // Helper to get color for percentage
  const getPercentageColor = (value: number, inverse = false) => {
    if (inverse) {
      if (value <= 30) return "text-green-600";
      if (value <= 60) return "text-yellow-600";
      return "text-red-600";
    }
    if (value >= 70) return "text-green-600";
    if (value >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  // Helper to render a stat card
  const StatCard = ({ title, value, subtitle, icon, color = "blue" }: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: string;
    color?: "blue" | "green" | "yellow" | "red" | "purple" | "gray";
  }) => {
    const colorClasses = {
      blue: "bg-blue-50 border-blue-200 text-blue-600",
      green: "bg-green-50 border-green-200 text-green-600",
      yellow: "bg-yellow-50 border-yellow-200 text-yellow-600",
      red: "bg-red-50 border-red-200 text-red-600",
      purple: "bg-purple-50 border-purple-200 text-purple-600",
      gray: "bg-gray-50 border-gray-200 text-gray-600",
    };

    return (
      <div className={`rounded-lg border-2 p-4 ${colorClasses[color]}`}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">{icon}</span>
          <span className="text-sm font-medium opacity-80">{title}</span>
        </div>
        <p className="text-3xl font-bold">{value}</p>
        {subtitle && <p className="text-xs mt-1 opacity-70">{subtitle}</p>}
      </div>
    );
  };

  // Render funnel visualization
  const FunnelChart = ({ data }: { data: Array<{ stage: string; count: number; percentage: number }> }) => {
    const maxCount = Math.max(...data.map(d => d.count), 1);
    
    return (
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={item.stage} className="relative">
            <div className="flex items-center gap-4">
              <div className="w-32 text-sm font-medium text-gray-700">{item.stage}</div>
              <div className="flex-1 relative">
                <div className="h-10 bg-gray-100 rounded-lg overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      index === data.length - 1
                        ? "bg-green-500"
                        : index === 0
                        ? "bg-blue-500"
                        : "bg-blue-400"
                    }`}
                    style={{ width: `${(item.count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
              <div className="w-20 text-right">
                <span className="font-bold text-gray-900">{item.count}</span>
                <span className="text-xs text-gray-500 ml-1">({item.percentage}%)</span>
              </div>
            </div>
            {index < data.length - 1 && (
              <div className="ml-16 pl-4 border-l-2 border-dashed border-gray-300 h-2" />
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <ProtectedRoute allowedRoles={[SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN]}>
      <div className="container mx-auto px-6 py-8">
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={hideToast}
        />

        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard/recruitment" className="text-blue-600 hover:underline mb-4 inline-block">
            ← Back to Recruitment
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Recruitment Reports</h1>
              <p className="text-gray-600 mt-1">Comprehensive analytics and insights</p>
            </div>
            <Button onClick={loadReports} disabled={loading}>
              {loading ? "Loading..." : "🔄 Refresh Reports"}
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b pb-4 overflow-x-auto">
          {[
            { id: "overview", label: "📊 Overview", icon: "📊" },
            { id: "time", label: "⏱️ Time-to-Hire", icon: "⏱️" },
            { id: "source", label: "📍 Source Effectiveness", icon: "📍" },
            { id: "pipeline", label: "🔄 Pipeline Conversion", icon: "🔄" },
            { id: "interview", label: "🎤 Interview Analytics", icon: "🎤" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mb-4"></div>
            <p className="text-gray-500">Loading recruitment reports...</p>
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="space-y-8">
                {/* Key Metrics */}
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Key Metrics</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                      icon="⏱️"
                      title="Avg. Time-to-Hire"
                      value={`${timeToHire?.overall.averageDays || 0} days`}
                      subtitle={`${timeToHire?.overall.totalHires || 0} total hires`}
                      color="blue"
                    />
                    <StatCard
                      icon="✅"
                      title="Overall Conversion"
                      value={`${pipelineConversion?.conversionRates.overallConversion || 0}%`}
                      subtitle="Applications to Hires"
                      color="green"
                    />
                    <StatCard
                      icon="👥"
                      title="Referral Hire Rate"
                      value={`${sourceEffectiveness?.referral.hireRate || 0}%`}
                      subtitle={`vs ${sourceEffectiveness?.direct.hireRate || 0}% direct`}
                      color="purple"
                    />
                    <StatCard
                      icon="📝"
                      title="Avg. Interview Score"
                      value={interviewAnalytics?.scoring.averageScore || 0}
                      subtitle={`${interviewAnalytics?.scoring.totalAssessments || 0} assessments`}
                      color="yellow"
                    />
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Pipeline Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Pipeline Summary</CardTitle>
                      <CardDescription>Current application status breakdown</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Object.entries(pipelineConversion?.statusBreakdown || {}).map(([status, count]) => (
                          <div key={status} className="flex items-center justify-between">
                            <span className="capitalize text-gray-700">{status.replace('_', ' ')}</span>
                            <span className="font-bold text-gray-900">{count as number}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Interview Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Interview Summary</CardTitle>
                      <CardDescription>Interview completion and scoring</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700">Total Interviews</span>
                          <span className="font-bold">{interviewAnalytics?.summary.totalInterviews || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700">Completed</span>
                          <span className="font-bold text-green-600">{interviewAnalytics?.summary.completedInterviews || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700">Completion Rate</span>
                          <span className={`font-bold ${getPercentageColor(interviewAnalytics?.summary.completionRate || 0)}`}>
                            {interviewAnalytics?.summary.completionRate || 0}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700">Feedback Rate</span>
                          <span className={`font-bold ${getPercentageColor(interviewAnalytics?.feedbackAnalysis.feedbackRate || 0)}`}>
                            {interviewAnalytics?.feedbackAnalysis.feedbackRate || 0}%
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Source Comparison */}
                <Card>
                  <CardHeader>
                    <CardTitle>Source Effectiveness Comparison</CardTitle>
                    <CardDescription>Referrals vs Direct Applications</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-8">
                      <div className="text-center">
                        <div className="text-4xl mb-2">👥</div>
                        <h3 className="font-bold text-lg text-purple-600">Referrals</h3>
                        <p className="text-3xl font-bold mt-2">{sourceEffectiveness?.referral.total || 0}</p>
                        <p className="text-sm text-gray-500">applications</p>
                        <div className="mt-4 inline-block px-4 py-2 rounded-full bg-purple-100 text-purple-700 font-bold">
                          {sourceEffectiveness?.referral.hireRate || 0}% Hire Rate
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-4xl mb-2">🌐</div>
                        <h3 className="font-bold text-lg text-blue-600">Direct</h3>
                        <p className="text-3xl font-bold mt-2">{sourceEffectiveness?.direct.total || 0}</p>
                        <p className="text-sm text-gray-500">applications</p>
                        <div className="mt-4 inline-block px-4 py-2 rounded-full bg-blue-100 text-blue-700 font-bold">
                          {sourceEffectiveness?.direct.hireRate || 0}% Hire Rate
                        </div>
                      </div>
                    </div>
                    {sourceEffectiveness?.comparison.recommendation && (
                      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">
                          💡 <strong>Insight:</strong> {sourceEffectiveness.comparison.recommendation}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Time-to-Hire Tab */}
            {activeTab === "time" && timeToHire && (
              <div className="space-y-6">
                {/* Overall Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <StatCard
                    icon="📊"
                    title="Average Time"
                    value={`${timeToHire.overall.averageDays} days`}
                    color="blue"
                  />
                  <StatCard
                    icon="🏆"
                    title="Fastest Hire"
                    value={`${timeToHire.overall.fastestHire || 0} days`}
                    color="green"
                  />
                  <StatCard
                    icon="🐢"
                    title="Slowest Hire"
                    value={`${timeToHire.overall.slowestHire || 0} days`}
                    color="red"
                  />
                  <StatCard
                    icon="✅"
                    title="Total Hires"
                    value={timeToHire.overall.totalHires}
                    color="purple"
                  />
                </div>

                {/* By Position */}
                <Card>
                  <CardHeader>
                    <CardTitle>Time-to-Hire by Position</CardTitle>
                    <CardDescription>Average hiring time for each role</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {timeToHire.byPosition.length > 0 ? (
                      <div className="space-y-4">
                        {timeToHire.byPosition.map((pos) => (
                          <div key={pos.position} className="flex items-center gap-4">
                            <div className="w-48 font-medium text-gray-700 truncate">{pos.position}</div>
                            <div className="flex-1">
                              <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    pos.averageDays <= 30 ? "bg-green-500" :
                                    pos.averageDays <= 60 ? "bg-yellow-500" : "bg-red-500"
                                  }`}
                                  style={{ width: `${Math.min((pos.averageDays / 90) * 100, 100)}%` }}
                                />
                              </div>
                            </div>
                            <div className="w-24 text-right">
                              <span className="font-bold">{pos.averageDays} days</span>
                            </div>
                            <div className="w-16 text-right text-sm text-gray-500">
                              ({pos.totalHires} hires)
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">No position data available</p>
                    )}
                  </CardContent>
                </Card>

                {/* By Month */}
                <Card>
                  <CardHeader>
                    <CardTitle>Hiring Trends by Month</CardTitle>
                    <CardDescription>Monthly hiring performance</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {timeToHire.byMonth.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-3 px-4">Month</th>
                              <th className="text-right py-3 px-4">Avg. Days</th>
                              <th className="text-right py-3 px-4">Total Hires</th>
                            </tr>
                          </thead>
                          <tbody>
                            {timeToHire.byMonth.map((month) => (
                              <tr key={month.month} className="border-b hover:bg-gray-50">
                                <td className="py-3 px-4 font-medium">{month.month}</td>
                                <td className={`py-3 px-4 text-right font-bold ${
                                  month.averageDays <= 30 ? "text-green-600" :
                                  month.averageDays <= 60 ? "text-yellow-600" : "text-red-600"
                                }`}>
                                  {month.averageDays} days
                                </td>
                                <td className="py-3 px-4 text-right">{month.totalHires}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">No monthly data available</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Source Effectiveness Tab */}
            {activeTab === "source" && sourceEffectiveness && (
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <StatCard
                    icon="📝"
                    title="Total Applications"
                    value={sourceEffectiveness.summary.totalApplications}
                    color="blue"
                  />
                  <StatCard
                    icon="👥"
                    title="Referral %"
                    value={`${sourceEffectiveness.summary.referralPercentage}%`}
                    subtitle={`${sourceEffectiveness.summary.referralApplications} referrals`}
                    color="purple"
                  />
                  <StatCard
                    icon="📈"
                    title="Referral Advantage"
                    value={`${sourceEffectiveness.comparison.referralAdvantage > 0 ? '+' : ''}${sourceEffectiveness.comparison.referralAdvantage}%`}
                    subtitle="vs direct hire rate"
                    color={sourceEffectiveness.comparison.referralAdvantage > 0 ? "green" : "gray"}
                  />
                  <StatCard
                    icon="🏆"
                    title="Top Source"
                    value={sourceEffectiveness.referral.hireRate > sourceEffectiveness.direct.hireRate ? "Referrals" : "Direct"}
                    color="yellow"
                  />
                </div>

                {/* Comparison Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>Source Comparison</CardTitle>
                    <CardDescription>Detailed breakdown of referral vs direct applications</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-4">Metric</th>
                            <th className="text-center py-3 px-4 bg-purple-50">👥 Referrals</th>
                            <th className="text-center py-3 px-4 bg-blue-50">🌐 Direct</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b">
                            <td className="py-3 px-4 font-medium">Total Applications</td>
                            <td className="py-3 px-4 text-center font-bold">{sourceEffectiveness.referral.total}</td>
                            <td className="py-3 px-4 text-center font-bold">{sourceEffectiveness.direct.total}</td>
                          </tr>
                          <tr className="border-b bg-green-50">
                            <td className="py-3 px-4 font-medium">Hired</td>
                            <td className="py-3 px-4 text-center font-bold text-green-600">{sourceEffectiveness.referral.hired}</td>
                            <td className="py-3 px-4 text-center font-bold text-green-600">{sourceEffectiveness.direct.hired}</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-3 px-4 font-medium">In Process</td>
                            <td className="py-3 px-4 text-center">{sourceEffectiveness.referral.inProcess}</td>
                            <td className="py-3 px-4 text-center">{sourceEffectiveness.direct.inProcess}</td>
                          </tr>
                          <tr className="border-b bg-red-50">
                            <td className="py-3 px-4 font-medium">Rejected</td>
                            <td className="py-3 px-4 text-center text-red-600">{sourceEffectiveness.referral.rejected}</td>
                            <td className="py-3 px-4 text-center text-red-600">{sourceEffectiveness.direct.rejected}</td>
                          </tr>
                          <tr className="bg-gray-100">
                            <td className="py-3 px-4 font-bold">Hire Rate</td>
                            <td className={`py-3 px-4 text-center font-bold text-lg ${
                              sourceEffectiveness.referral.hireRate >= sourceEffectiveness.direct.hireRate
                                ? "text-green-600" : "text-gray-600"
                            }`}>
                              {sourceEffectiveness.referral.hireRate}%
                            </td>
                            <td className={`py-3 px-4 text-center font-bold text-lg ${
                              sourceEffectiveness.direct.hireRate > sourceEffectiveness.referral.hireRate
                                ? "text-green-600" : "text-gray-600"
                            }`}>
                              {sourceEffectiveness.direct.hireRate}%
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Top Referrers */}
                {sourceEffectiveness.topReferrers.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Top Referrers</CardTitle>
                      <CardDescription>Employees with most successful referrals</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {sourceEffectiveness.topReferrers.map((referrer, index) => (
                          <div key={referrer.employeeId} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                              index === 0 ? "bg-yellow-400 text-yellow-900" :
                              index === 1 ? "bg-gray-300 text-gray-700" :
                              index === 2 ? "bg-orange-300 text-orange-800" :
                              "bg-gray-100 text-gray-600"
                            }`}>
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <span className="font-medium">Employee #{referrer.employeeId.slice(-6)}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-purple-600">{referrer.referrals} referrals</span>
                              <span className="text-gray-500 mx-2">•</span>
                              <span className="font-bold text-green-600">{referrer.hires} hired</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recommendation */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="font-bold text-lg text-gray-900 mb-2">💡 Recommendation</h3>
                  <p className="text-gray-700">{sourceEffectiveness.comparison.recommendation}</p>
                </div>
              </div>
            )}

            {/* Pipeline Conversion Tab */}
            {activeTab === "pipeline" && pipelineConversion && (
              <div className="space-y-6">
                {/* Conversion Rates */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <StatCard
                    icon="1️⃣"
                    title="App → Screening"
                    value={`${pipelineConversion.conversionRates.applicationToScreening}%`}
                    color="blue"
                  />
                  <StatCard
                    icon="2️⃣"
                    title="Screening → Offer"
                    value={`${pipelineConversion.conversionRates.screeningToOffer}%`}
                    color="yellow"
                  />
                  <StatCard
                    icon="3️⃣"
                    title="Offer → Hire"
                    value={`${pipelineConversion.conversionRates.offerToHire}%`}
                    color="green"
                  />
                  <StatCard
                    icon="🎯"
                    title="Overall Conversion"
                    value={`${pipelineConversion.conversionRates.overallConversion}%`}
                    color="purple"
                  />
                </div>

                {/* Funnel Visualization */}
                <Card>
                  <CardHeader>
                    <CardTitle>Hiring Funnel</CardTitle>
                    <CardDescription>Candidate flow through each stage</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FunnelChart data={pipelineConversion.funnel} />
                  </CardContent>
                </Card>

                {/* Drop-off Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle>Drop-off Analysis</CardTitle>
                    <CardDescription>Where candidates leave the pipeline</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium text-gray-700 mb-4">Current Status</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <span>Still in Screening</span>
                            <span className="font-bold">{pipelineConversion.statusBreakdown.submitted}</span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                            <span>In Interview Process</span>
                            <span className="font-bold text-blue-600">{pipelineConversion.statusBreakdown.inProcess}</span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                            <span>Offer Pending</span>
                            <span className="font-bold text-yellow-600">{pipelineConversion.statusBreakdown.offer}</span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                            <span>Hired</span>
                            <span className="font-bold text-green-600">{pipelineConversion.statusBreakdown.hired}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-700 mb-4">Rejection Analysis</h4>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                          <p className="text-5xl font-bold text-red-600 mb-2">
                            {pipelineConversion.dropOffAnalysis.rejectedPercentage}%
                          </p>
                          <p className="text-gray-600">Rejection Rate</p>
                          <p className="text-sm text-gray-500 mt-2">
                            {pipelineConversion.statusBreakdown.rejected} candidates rejected
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Interview Analytics Tab */}
            {activeTab === "interview" && interviewAnalytics && (
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <StatCard
                    icon="📅"
                    title="Total Interviews"
                    value={interviewAnalytics.summary.totalInterviews}
                    color="blue"
                  />
                  <StatCard
                    icon="✅"
                    title="Completed"
                    value={interviewAnalytics.summary.completedInterviews}
                    color="green"
                  />
                  <StatCard
                    icon="📆"
                    title="Scheduled"
                    value={interviewAnalytics.summary.scheduledInterviews}
                    color="yellow"
                  />
                  <StatCard
                    icon="❌"
                    title="Cancelled"
                    value={interviewAnalytics.summary.cancelledInterviews}
                    color="red"
                  />
                  <StatCard
                    icon="📊"
                    title="Completion Rate"
                    value={`${interviewAnalytics.summary.completionRate}%`}
                    color="purple"
                  />
                </div>

                {/* Scoring Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle>Scoring Analysis</CardTitle>
                    <CardDescription>Distribution of interview scores</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <div className="text-center mb-6">
                          <p className="text-6xl font-bold text-blue-600">{interviewAnalytics.scoring.averageScore}</p>
                          <p className="text-gray-500">Average Score</p>
                        </div>
                        <div className="flex justify-center gap-8">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-green-600">{interviewAnalytics.scoring.highestScore}</p>
                            <p className="text-xs text-gray-500">Highest</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-red-600">{interviewAnalytics.scoring.lowestScore}</p>
                            <p className="text-xs text-gray-500">Lowest</p>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-700 mb-4">Score Distribution</h4>
                        <div className="space-y-3">
                          <div className="flex items-center gap-4">
                            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                            <span className="flex-1">Excellent (70-100)</span>
                            <span className="font-bold text-green-600">{interviewAnalytics.scoring.highScores.count}</span>
                            <span className="text-gray-500 w-12 text-right">{interviewAnalytics.scoring.highScores.percentage}%</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                            <span className="flex-1">Satisfactory (50-69)</span>
                            <span className="font-bold text-yellow-600">{interviewAnalytics.scoring.mediumScores.count}</span>
                            <span className="text-gray-500 w-12 text-right">{interviewAnalytics.scoring.mediumScores.percentage}%</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                            <span className="flex-1">Needs Improvement (0-49)</span>
                            <span className="font-bold text-red-600">{interviewAnalytics.scoring.lowScores.count}</span>
                            <span className="text-gray-500 w-12 text-right">{interviewAnalytics.scoring.lowScores.percentage}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Interview Methods */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Interview Methods</CardTitle>
                      <CardDescription>Breakdown by interview type</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {interviewAnalytics.byMethod.length > 0 ? (
                        <div className="space-y-3">
                          {interviewAnalytics.byMethod.map((method) => (
                            <div key={method.method} className="flex items-center gap-4">
                              <span className="text-2xl">
                                {method.method.includes('VIDEO') ? '📹' :
                                 method.method.includes('PHONE') ? '📞' :
                                 method.method.includes('ONSITE') ? '🏢' : '💻'}
                              </span>
                              <span className="flex-1 font-medium">{method.method}</span>
                              <span className="font-bold">{method.count}</span>
                              <span className="text-gray-500 w-12 text-right">{method.percentage}%</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-4">No interview data</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Feedback Completion</CardTitle>
                      <CardDescription>Panel feedback submission rate</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center">
                        <div className="relative inline-block">
                          <svg className="w-32 h-32" viewBox="0 0 36 36">
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="#e5e7eb"
                              strokeWidth="3"
                            />
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke={interviewAnalytics.feedbackAnalysis.feedbackRate >= 70 ? "#22c55e" : 
                                      interviewAnalytics.feedbackAnalysis.feedbackRate >= 40 ? "#eab308" : "#ef4444"}
                              strokeWidth="3"
                              strokeDasharray={`${interviewAnalytics.feedbackAnalysis.feedbackRate}, 100`}
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-2xl font-bold">
                              {interviewAnalytics.feedbackAnalysis.feedbackRate}%
                            </span>
                          </div>
                        </div>
                        <div className="mt-4 space-y-2">
                          <p className="text-sm">
                            <span className="text-green-600 font-bold">{interviewAnalytics.feedbackAnalysis.interviewsWithFeedback}</span>
                            {" "}with feedback
                          </p>
                          <p className="text-sm">
                            <span className="text-red-600 font-bold">{interviewAnalytics.feedbackAnalysis.interviewsWithoutFeedback}</span>
                            {" "}without feedback
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Top Interviewers */}
                {interviewAnalytics.topInterviewers.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Most Active Interviewers</CardTitle>
                      <CardDescription>Panel members with most interviews</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        {interviewAnalytics.topInterviewers.slice(0, 5).map((interviewer, index) => (
                          <div key={interviewer.interviewerId} className="text-center p-4 bg-gray-50 rounded-lg">
                            <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center font-bold text-lg mb-2 ${
                              index === 0 ? "bg-yellow-400 text-yellow-900" :
                              index === 1 ? "bg-gray-300 text-gray-700" :
                              index === 2 ? "bg-orange-300 text-orange-800" :
                              "bg-gray-200 text-gray-600"
                            }`}>
                              #{index + 1}
                            </div>
                            <p className="font-medium text-sm truncate">ID: ...{interviewer.interviewerId.slice(-6)}</p>
                            <p className="text-2xl font-bold text-blue-600 mt-1">{interviewer.interviewCount}</p>
                            <p className="text-xs text-gray-500">interviews</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}

