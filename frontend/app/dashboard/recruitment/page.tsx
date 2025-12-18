"use client";

import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Toast, useToast } from "@/components/leaves/Toast";
import { SystemRole } from "@/types";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { isHRStaff } from "@/lib/utils/role-utils";

export default function RecruitmentPage() {
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();

  const isCandidate = user?.userType === "candidate" || user?.roles?.includes(SystemRole.JOB_CANDIDATE);
  const isEmployee = user?.userType === "employee";
  const isDepartmentHead = user?.roles?.includes(SystemRole.DEPARTMENT_HEAD);
  const isHR = isHRStaff(user);
  const isHRManager = user?.roles?.includes(SystemRole.HR_MANAGER);
  const isHREmployee = user?.roles?.includes(SystemRole.HR_EMPLOYEE);
  const isRecruiter = user?.roles?.includes(SystemRole.RECRUITER);
  // CHANGED - Added System Admin role check
  const isSystemAdmin = user?.roles?.includes(SystemRole.SYSTEM_ADMIN);
  // CHANGED - Added Finance role check for offboarding clearance
  const isFinanceStaff = user?.roles?.includes(SystemRole.FINANCE_STAFF) ||
                         user?.roles?.includes(SystemRole.PAYROLL_MANAGER) ||
                         user?.roles?.includes(SystemRole.PAYROLL_SPECIALIST);

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-6 py-8">
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={hideToast}
        />

        <div className="mb-8">
          <Link href="/dashboard" className="text-blue-600 hover:underline mb-4 inline-block">
            ← Back to Dashboard
          </Link>
          {isHRManager && !isHREmployee ? (
            <>
              <h1 className="text-3xl font-bold text-gray-900">HR Manager Functions</h1>
              <p className="text-gray-600 mt-1">
                Manage the complete recruitment lifecycle from job posting to employee onboarding
              </p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-gray-900">Recruitment Portal</h1>
              <p className="text-gray-600 mt-1">Welcome, {user?.fullName}</p>
            </>
          )}
        </div>

        {/* Candidate View */}
        {isCandidate && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle>My Applications</CardTitle>
                  <CardDescription>Track your application status</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/dashboard/recruitment/my-applications">
                    <Button className="w-full">View Applications</Button>
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Interviews</CardTitle>
                  <CardDescription>View scheduled interviews</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/dashboard/recruitment/interviews">
                    <Button className="w-full">View Interviews</Button>
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Job Offers</CardTitle>
                  <CardDescription>Respond to offers and upload documents</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/dashboard/recruitment/offers">
                    <Button className="w-full">View Offers</Button>
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Onboarding</CardTitle>
                  <CardDescription>Complete onboarding tasks</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/dashboard/recruitment/onboarding">
                    <Button className="w-full">View Onboarding</Button>
                  </Link>
                </CardContent>
              </Card>
            </div>

            <div className="mt-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Available Job Openings</CardTitle>
                  <CardDescription>
                    Browse and apply to available job positions
                  </CardDescription>
                </CardHeader>
                <CardContent className="py-8">
                  <div className="text-center">
                    <p className="text-gray-600 mb-6">
                      Explore all available job openings and find the perfect opportunity for you
                    </p>
                    <Link href="/dashboard/recruitment/jobs">
                      <Button size="lg" className="px-8">
                        View Job Openings
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Employee View - Exclude HR Managers (they have their own section) */}
        {isEmployee && !isCandidate && !isHRManager && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CHANGED - ONB-004: Onboarding Tracker for New Hires */}
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-blue-900">My Onboarding</CardTitle>
                <CardDescription className="text-blue-700">Track your onboarding progress</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/dashboard/recruitment/my-onboarding">
                  <Button className="w-full">View Onboarding Tracker</Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>My Referrals</CardTitle>
                <CardDescription>Track candidates you've referred</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/dashboard/recruitment/referrals">
                  <Button className="w-full">View Referrals</Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resignation</CardTitle>
                <CardDescription>Submit and track resignation requests</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/dashboard/recruitment/resignation">
                  <Button className="w-full">Manage Resignation</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Finance Staff View - OFF-010: FINANCE Clearance */}
        {isFinanceStaff && !isHR && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Finance Clearance Tasks</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-green-800">💰 Finance Clearance</CardTitle>
                  <CardDescription className="text-green-700">
                    Complete expense reports, credit card returns, and loan settlements (OFF-010)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/dashboard/recruitment/offboarding-checklists">
                    <Button className="w-full bg-green-600 hover:bg-green-700">
                      View Clearance Tasks
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Department Head View */}
        {isDepartmentHead && !isHR && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Department Interviews</CardTitle>
                <CardDescription>View and manage department interviews</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/dashboard/recruitment/department-interviews">
                  <Button className="w-full">View Interviews</Button>
                </Link>
              </CardContent>
            </Card>

            {/* OFF-010: Line Manager Clearance */}
            <Card className="border-purple-200 bg-purple-50">
              <CardHeader>
                <CardTitle className="text-purple-800">👔 Line Manager Clearance</CardTitle>
                <CardDescription className="text-purple-700">
                  Complete work handover & project transfer clearance (OFF-010)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/dashboard/recruitment/offboarding-checklists">
                  <Button className="w-full bg-purple-600 hover:bg-purple-700">
                    View Clearance Tasks
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        )}

        {/* HR Manager View - Dedicated Section */}
        {isHRManager && !isHREmployee && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
              {/* Job Templates */}
              <Card className="hover:shadow-lg transition-shadow border-2 border-blue-200">
                <CardHeader>
                  <CardTitle>Job Templates</CardTitle>
                  <CardDescription>
                    Define standardized job descriptions with title, department, qualifications, and skills
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/dashboard/recruitment/job-templates">
                    <Button className="w-full">Manage Job Templates</Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Job Requisitions */}
              <Card className="hover:shadow-lg transition-shadow border-2 border-blue-200">
                <CardHeader>
                  <CardTitle>Job Requisitions</CardTitle>
                  <CardDescription>
                    Create job postings by selecting templates and specifying openings, location, and details
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/dashboard/recruitment/job-requisitions">
                    <Button className="w-full">Create Job Requisitions</Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Recruitment Progress */}
              <Card className="hover:shadow-lg transition-shadow border-2 border-blue-200">
                <CardHeader>
                  <CardTitle>Recruitment Progress</CardTitle>
                  <CardDescription>
                    Monitor progress across all open positions with detailed statistics and metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/dashboard/recruitment/recruitment-progress">
                    <Button className="w-full">View Recruitment Progress</Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Recruitment Reports */}
              <Card className="hover:shadow-lg transition-shadow border-2 border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-green-800">📊 Recruitment Reports</CardTitle>
                  <CardDescription className="text-green-700">
                    Analytics including time-to-hire, source effectiveness, and pipeline conversion
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/dashboard/recruitment/reports">
                    <Button className="w-full bg-green-600 hover:bg-green-700">View Reports & Analytics</Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Job Offers & Approvals */}
              <Card className="hover:shadow-lg transition-shadow border-2 border-blue-200">
                <CardHeader>
                  <CardTitle>Job Offers & Approvals</CardTitle>
                  <CardDescription>
                    Review and approve/reject job offers for candidates with status "offer"
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/dashboard/recruitment/job-offers-approvals">
                    <Button className="w-full">Manage Offers & Approvals</Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Offer Letters */}
              <Card className="hover:shadow-lg transition-shadow border-2 border-blue-200">
                <CardHeader>
                  <CardTitle>Offer Letters</CardTitle>
                  <CardDescription>
                    Generate, send, and collect electronically signed offer letters from candidates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/dashboard/recruitment/offer-letters">
                    <Button className="w-full">Manage Offer Letters</Button>
                  </Link>
                </CardContent>
              </Card>

              {/* HR Onboarding - ONB-001, ONB-002, ONB-004 */}
              <Card className="hover:shadow-lg transition-shadow border-2 border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-green-800">🎯 HR Onboarding</CardTitle>
                  <CardDescription className="text-green-700">
                    Manage new hire onboarding, track task progress, and ensure compliance (ONB-001 to ONB-019)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/dashboard/recruitment/hr-onboarding">
                    <Button className="w-full bg-green-600 hover:bg-green-700">Manage Onboarding</Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Termination Management - OFF-001 */}
              <Card className="hover:shadow-lg transition-shadow border-2 border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="text-red-800">⚠️ Termination Management</CardTitle>
                  <CardDescription className="text-red-700">
                    Review performance, initiate terminations, and manage exit requests (OFF-001)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/dashboard/recruitment/terminations">
                    <Button className="w-full bg-red-600 hover:bg-red-700">Manage Terminations</Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Offboarding Checklists - OFF-006, OFF-010, OFF-013 */}
              <Card className="hover:shadow-lg transition-shadow border-2 border-orange-200 bg-orange-50">
                <CardHeader>
                  <CardTitle className="text-orange-800">📋 Offboarding Checklists</CardTitle>
                  <CardDescription className="text-orange-700">
                    Manage exit clearance, department sign-offs, and final settlements (OFF-006, OFF-010, OFF-013)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/dashboard/recruitment/offboarding-checklists">
                    <Button className="w-full bg-orange-600 hover:bg-orange-700">Manage Offboarding</Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Talent Pool - Browse all candidates with resumes */}
              <Card className="hover:shadow-lg transition-shadow border-2 border-indigo-200 bg-indigo-50">
                <CardHeader>
                  <CardTitle className="text-indigo-800">🎯 Talent Pool</CardTitle>
                  <CardDescription className="text-indigo-700">
                    Browse and search all candidates with resumes in the organization's talent pool
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/dashboard/recruitment/talent-pool">
                    <Button className="w-full bg-indigo-600 hover:bg-indigo-700">View Talent Pool</Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Referrals */}
              <Card className="hover:shadow-lg transition-shadow border-2 border-gray-200">
                <CardHeader>
                  <CardTitle>Referrals</CardTitle>
                  <CardDescription>
                    Track candidates you've referred and their application status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/dashboard/recruitment/referrals">
                    <Button className="w-full" variant="outline">View My Referrals</Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Resignation */}
              <Card className="hover:shadow-lg transition-shadow border-2 border-gray-200">
                <CardHeader>
                  <CardTitle>Resignation</CardTitle>
                  <CardDescription>
                    Submit and manage resignation requests
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/dashboard/recruitment/resignation">
                    <Button className="w-full" variant="outline">Manage Resignation</Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* HR Employee/Recruiter View */}
        {isHR && !isHRManager && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* CHANGED - REC-023: HR Employee can also preview and publish jobs */}
              {(isHREmployee || isSystemAdmin) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Job Requisitions</CardTitle>
                    <CardDescription>Preview and publish job postings</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link href="/dashboard/recruitment/job-requisitions">
                      <Button className="w-full">Manage Jobs</Button>
                    </Link>
                  </CardContent>
                </Card>
              )}

              {/* CHANGED - REC-008: HR Employee can track candidates (Recruiter excluded per user story) */}
              {!isRecruiter && (
                <Card>
                  <CardHeader>
                    <CardTitle>Candidate Tracking</CardTitle>
                    <CardDescription>Track candidates through each hiring stage</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link href="/dashboard/recruitment/applications">
                      <Button className="w-full">Track Candidates</Button>
                    </Link>
                  </CardContent>
                </Card>
              )}

              {/* Talent Pool - Browse all candidates with resumes */}
              <Card className="border-indigo-200 bg-indigo-50">
                <CardHeader>
                  <CardTitle className="text-indigo-800">🎯 Talent Pool</CardTitle>
                  <CardDescription className="text-indigo-700">
                    Browse and search all candidates with resumes in the organization's talent pool
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/dashboard/recruitment/talent-pool">
                    <Button className="w-full bg-indigo-600 hover:bg-indigo-700">View Talent Pool</Button>
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Interviews</CardTitle>
                  <CardDescription>Schedule and manage interviews</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/dashboard/recruitment/hr-interviews">
                    <Button className="w-full">Manage Interviews</Button>
                  </Link>
                </CardContent>
              </Card>

              {(isHRManager || isHREmployee) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Onboarding</CardTitle>
                    <CardDescription>Manage new hire onboarding</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link href="/dashboard/recruitment/hr-onboarding">
                      <Button className="w-full">Manage Onboarding</Button>
                    </Link>
                  </CardContent>
                </Card>
              )}

              {/* CHANGED - ONB-012: Equipment Management for HR Employee */}
              {isHREmployee && (
                <Card>
                  <CardHeader>
                    <CardTitle>Equipment Management</CardTitle>
                    <CardDescription>Reserve desk, equipment & access cards</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link href="/dashboard/recruitment/equipment-management">
                      <Button className="w-full">Manage Equipment</Button>
                    </Link>
                  </CardContent>
                </Card>
              )}

              {/* OFF-006, OFF-010: Offboarding Clearance for HR Employee */}
              {isHREmployee && (
                <Card className="border-orange-200 bg-orange-50">
                  <CardHeader>
                    <CardTitle className="text-orange-800">📋 Offboarding Clearance</CardTitle>
                    <CardDescription className="text-orange-700">
                      Complete FACILITIES & ADMIN clearance items (OFF-010)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link href="/dashboard/recruitment/offboarding-checklists">
                      <Button className="w-full bg-orange-600 hover:bg-orange-700">
                        View Clearance Tasks
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}

              {/* CHANGED - Added Pre-boarding button for HR Employee user story */}
              {(isHRManager || isHREmployee) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Pre-boarding</CardTitle>
                    <CardDescription>Trigger pre-boarding tasks after offer acceptance</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link href="/dashboard/recruitment/preboarding">
                      <Button className="w-full">Manage Pre-boarding</Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        )}

        {/* CHANGED - System Admin View (ONB-009, ONB-013, OFF-007) */}
        {isSystemAdmin && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">System Administration</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Access Management</CardTitle>
                  <CardDescription>
                    Provision or revoke system access for employees (ONB-009, OFF-007)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/dashboard/recruitment/access-management">
                    <Button className="w-full">Manage Access</Button>
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Onboarding</CardTitle>
                  <CardDescription>
                    View and manage new hire onboarding tasks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/dashboard/recruitment/hr-onboarding">
                    <Button className="w-full">View Onboarding</Button>
                  </Link>
                </CardContent>
              </Card>

              {/* OFF-006, OFF-007, OFF-010: Offboarding & IT Clearance */}
              <Card className="border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="text-red-800">💻 IT Clearance Tasks</CardTitle>
                  <CardDescription className="text-red-700">
                    View offboarding checklists and complete IT clearance items (OFF-007)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/dashboard/recruitment/offboarding-checklists">
                    <Button className="w-full bg-red-600 hover:bg-red-700">
                      View IT Clearance
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

