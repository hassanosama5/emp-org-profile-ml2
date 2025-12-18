"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { SystemRole } from "@/types";
import { Button } from "@/components/shared/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/shared/ui/Card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/shared/ui/Tabs";
import { Input } from "@/components/shared/ui/Input";
import { useOrganizationStructure } from "@/lib/hooks/use-organization-structure";
import { useAuth } from "@/lib/hooks/use-auth";
import { DepartmentResponseDto, PositionResponseDto } from "@/types/organization-structure";
import { employeeProfileApi } from "@/lib/api/employee-profile/profile";

// Helper function to get top-level positions (positions that don't report to anyone)
const getTopLevelPositions = (positions: PositionResponseDto[]) => {
  return positions.filter(pos => !pos.reportsToPositionId);
};

// Helper function to get positions that report to a specific position
const getSubordinatePositions = (positions: PositionResponseDto[], parentPositionId: string) => {
  return positions.filter(pos => {
    const reportsToId = typeof pos.reportsToPositionId === 'string' 
      ? pos.reportsToPositionId 
      : (pos.reportsToPositionId as any)?._id?.toString() || '';
    return reportsToId === parentPositionId;
  });
};

export default function HierarchyDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { getDepartments, getPositions, getPositionAssignments, loading, error } = useOrganizationStructure();
  
  const [viewType, setViewType] = useState<"chart" | "list" | "tree">("chart");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [departments, setDepartments] = useState<DepartmentResponseDto[]>([]);
  const [positions, setPositions] = useState<PositionResponseDto[]>([]);
  const [allDepartments, setAllDepartments] = useState<DepartmentResponseDto[]>([]);
  const [allPositions, setAllPositions] = useState<PositionResponseDto[]>([]);
  const [positionAssignments, setPositionAssignments] = useState<Record<string, any[]>>({});
  const [userProfile, setUserProfile] = useState<any>(null);
  const exportContainerRef = useRef<HTMLDivElement>(null);
  
  // Determine user role and permissions
  const hasRole = (role: SystemRole | string): boolean => {
    if (!user?.roles) return false;
    return user.roles.some((userRole) => {
      if (typeof userRole === "string" && typeof role === "string") {
        return userRole.toLowerCase() === role.toLowerCase();
      }
      return userRole === role;
    });
  };
  
  const isSystemAdmin = hasRole(SystemRole.SYSTEM_ADMIN);
  const isHRAdmin = hasRole(SystemRole.HR_ADMIN);
  const isHRManager = hasRole(SystemRole.HR_MANAGER);
  const isDepartmentHead = hasRole(SystemRole.DEPARTMENT_HEAD);
  const isEmployee = hasRole(SystemRole.DEPARTMENT_EMPLOYEE);
  
  // BR 41: Role-based access - determine what data user can see
  const canSeeFullStructure = isSystemAdmin || isHRAdmin;
  const canSeeTeamStructure = isHRManager || isDepartmentHead;
  const canSeeLimitedView = isEmployee;

  useEffect(() => {
    fetchUserProfile();
    fetchHierarchyData();
    fetchPositions();
    fetchAllDataForStats();
  }, [user]);
  
  const fetchUserProfile = async () => {
    if (!user?.userId && !user?.id) return;
    try {
      const profile = await employeeProfileApi.getMyProfile();
      setUserProfile(profile);
    } catch (err) {
      console.error("Failed to fetch user profile:", err);
    }
  };

  const fetchHierarchyData = async () => {
    try {
      const data = await getDepartments({ isActive: true });
      setDepartments(data || []);
    } catch (err) {
      console.error("Failed to fetch departments:", err);
      setDepartments([]);
    }
  };

  const fetchAllDataForStats = async () => {
    try {
      // Fetch all departments (active and inactive) for accurate statistics
      const allDepts = await getDepartments();
      setAllDepartments(allDepts || []);
      
      // Fetch all positions (active and inactive) for accurate statistics
      const allPos = await getPositions();
      setAllPositions(allPos || []);
    } catch (err) {
      console.error("Failed to fetch all data for statistics:", err);
      // Fallback to active data if fetching all fails
      setAllDepartments(departments);
      setAllPositions(positions);
    }
  };

  const fetchPositions = async () => {
    try {
      const data = await getPositions({ isActive: true });
      setPositions(data || []);
      
      // Fetch assignments for all positions
      const assignmentsMap: Record<string, any[]> = {};
      for (const pos of data || []) {
        const posId = typeof pos._id === 'string' ? pos._id : (pos._id as any)?.toString() || '';
        try {
          const assignments = await getPositionAssignments(posId);
          const activeAssignments = assignments.filter((a: any) => !a.endDate || new Date(a.endDate) > new Date());
          if (activeAssignments.length > 0) {
            assignmentsMap[posId] = activeAssignments;
          }
        } catch (err) {
          console.error(`Failed to fetch assignments for position ${posId}:`, err);
        }
      }
      setPositionAssignments(assignmentsMap);
    } catch (err) {
      console.error("Failed to fetch positions:", err);
      setPositions([]);
    }
  };

  // Helper function to get positions for a department (using role-filtered positions)
  const getPositionsForDepartment = (departmentId: string) => {
    return roleFilteredPositions.filter(pos => {
      const deptId = typeof pos.departmentId === 'string' 
        ? pos.departmentId 
        : (pos.departmentId as any)?._id || (pos.departmentId as any)?.id;
      return deptId === departmentId;
    });
  };

  // Helper function to get department ID
  const getDepartmentId = (dept: DepartmentResponseDto): string => {
    return typeof dept._id === 'string' ? dept._id : (dept._id as any)?.toString() || '';
  };

  // BR 41: Role-based filtering - filter departments based on user role
  const roleFilteredDepartments = useMemo(() => {
    if (canSeeFullStructure) {
      // System Admin and HR Admin see all departments
      return departments;
    }
    
    if (canSeeTeamStructure && userProfile?.primaryDepartmentId) {
      // Managers and Department Heads see their department and team structure
      const userDeptId = typeof userProfile.primaryDepartmentId === 'string' 
        ? userProfile.primaryDepartmentId 
        : (userProfile.primaryDepartmentId as any)?._id?.toString() || 
          (userProfile.primaryDepartmentId as any)?.toString() || '';
      
      // Get user's position to find team structure
      const userPositionId = typeof userProfile?.primaryPositionId === 'string'
        ? userProfile.primaryPositionId
        : (userProfile?.primaryPositionId as any)?._id?.toString() ||
          (userProfile?.primaryPositionId as any)?.toString() || '';
      
      // Find positions that report to user's position (team members)
      const teamPositionIds = new Set<string>();
      if (userPositionId) {
        positions.forEach(pos => {
          const posId = typeof pos._id === 'string' ? pos._id : (pos._id as any)?.toString() || '';
          const reportsToId = typeof pos.reportsToPositionId === 'string'
            ? pos.reportsToPositionId
            : (pos.reportsToPositionId as any)?._id?.toString() || '';
          
          if (reportsToId === userPositionId) {
            teamPositionIds.add(posId);
          }
        });
      }
      
      // Include departments that contain user's position or team positions
      return departments.filter(dept => {
        const deptId = getDepartmentId(dept);
        
        // Include user's own department
        if (deptId === userDeptId) {
          return true;
        }
        
        // Include departments that have positions reporting to user
        // Use raw positions array to avoid circular dependency
        const deptPositions = positions.filter(pos => {
          const posDeptId = typeof pos.departmentId === 'string' 
            ? pos.departmentId 
            : (pos.departmentId as any)?._id?.toString() || 
              (pos.departmentId as any)?.id || '';
          return posDeptId === deptId;
        });
        
        return deptPositions.some(pos => {
          const posId = typeof pos._id === 'string' ? pos._id : (pos._id as any)?.toString() || '';
          return teamPositionIds.has(posId);
        });
      });
    }
    
    if (canSeeLimitedView && userProfile?.primaryDepartmentId) {
      // Employees see only their own department
      const userDeptId = typeof userProfile.primaryDepartmentId === 'string' 
        ? userProfile.primaryDepartmentId 
        : (userProfile.primaryDepartmentId as any)?._id?.toString() || 
          (userProfile.primaryDepartmentId as any)?.toString() || '';
      
      return departments.filter(dept => {
        const deptId = getDepartmentId(dept);
        return deptId === userDeptId;
      });
    }
    
    // Default: return empty array if no access
    return [];
  }, [departments, positions, canSeeFullStructure, canSeeTeamStructure, canSeeLimitedView, userProfile]);
  
  // BR 41: Role-based filtering - filter positions based on user role
  const roleFilteredPositions = useMemo(() => {
    if (canSeeFullStructure) {
      // System Admin and HR Admin see all positions
      return positions;
    }
    
    if (canSeeTeamStructure && userProfile?.primaryDepartmentId) {
      // Managers and Department Heads see positions in their department and team structure
      const userDeptId = typeof userProfile.primaryDepartmentId === 'string' 
        ? userProfile.primaryDepartmentId 
        : (userProfile.primaryDepartmentId as any)?._id?.toString() || 
          (userProfile.primaryDepartmentId as any)?.toString() || '';
      
      // Get user's position to find team structure
      const userPositionId = typeof userProfile?.primaryPositionId === 'string'
        ? userProfile.primaryPositionId
        : (userProfile?.primaryPositionId as any)?._id?.toString() ||
          (userProfile?.primaryPositionId as any)?.toString() || '';
      
      return positions.filter(pos => {
        const deptId = typeof pos.departmentId === 'string' 
          ? pos.departmentId 
          : (pos.departmentId as any)?._id?.toString() || 
            (pos.departmentId as any)?.id || '';
        
        // Include positions in user's department
        if (deptId === userDeptId) {
          return true;
        }
        
        // Include positions that report to user's position (team members)
        if (userPositionId) {
          const posId = typeof pos._id === 'string' ? pos._id : (pos._id as any)?.toString() || '';
          const reportsToId = typeof pos.reportsToPositionId === 'string'
            ? pos.reportsToPositionId
            : (pos.reportsToPositionId as any)?._id?.toString() || '';
          
          // Include if position reports to user's position
          if (reportsToId === userPositionId) {
            return true;
          }
          
          // Include if position is user's own position
          if (posId === userPositionId) {
            return true;
          }
        }
        
        return false;
      });
    }
    
    if (canSeeLimitedView && userProfile?.primaryDepartmentId) {
      // Employees see positions in their department only
      const userDeptId = typeof userProfile.primaryDepartmentId === 'string' 
        ? userProfile.primaryDepartmentId 
        : (userProfile.primaryDepartmentId as any)?._id?.toString() || 
          (userProfile.primaryDepartmentId as any)?.toString() || '';
      
      return positions.filter(pos => {
        const deptId = typeof pos.departmentId === 'string' 
          ? pos.departmentId 
          : (pos.departmentId as any)?._id?.toString() || 
            (pos.departmentId as any)?.id || '';
        return deptId === userDeptId;
      });
    }
    
    // Default: return empty array if no access
    return [];
  }, [positions, canSeeFullStructure, canSeeTeamStructure, canSeeLimitedView, userProfile]);
  
  const filteredDepartments = roleFilteredDepartments.filter((dept) => {
    const name = dept.name?.toLowerCase() || '';
    const code = dept.code?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return name.includes(query) || code.includes(query);
  });

  // Helper function to convert oklch colors to RGB by removing stylesheets and injecting safe CSS
  const injectColorFixCSS = (doc: Document) => {
    // Remove all existing stylesheets that might contain oklch
    const stylesheets = Array.from(doc.styleSheets);
    stylesheets.forEach((sheet: any) => {
      try {
        if (sheet.ownerNode) {
          sheet.ownerNode.remove();
        }
      } catch (e) {
        // Ignore errors removing stylesheets
      }
    });
    
    // Remove all link stylesheets
    const linkSheets = doc.querySelectorAll('link[rel="stylesheet"]');
    linkSheets.forEach(link => link.remove());
    
    // Inject safe RGB-only CSS
    const style = doc.createElement('style');
    style.textContent = `
      /* Safe RGB-only styles - no oklch */
      * {
        box-sizing: border-box;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        margin: 0;
        padding: 20px;
        background: rgb(255, 255, 255);
        color: rgb(17, 24, 39);
      }
      /* Common utility classes with RGB colors */
      .bg-gray-50 { background-color: rgb(249, 250, 251) !important; }
      .bg-gray-100 { background-color: rgb(243, 244, 246) !important; }
      .bg-gray-200 { background-color: rgb(229, 231, 235) !important; }
      .bg-blue-50 { background-color: rgb(239, 246, 255) !important; }
      .bg-blue-100 { background-color: rgb(219, 234, 254) !important; }
      .bg-blue-600 { background-color: rgb(37, 99, 235) !important; }
      .bg-green-50 { background-color: rgb(240, 253, 244) !important; }
      .bg-green-100 { background-color: rgb(220, 252, 231) !important; }
      .bg-green-600 { background-color: rgb(22, 163, 74) !important; }
      .bg-purple-50 { background-color: rgb(250, 245, 255) !important; }
      .bg-purple-100 { background-color: rgb(243, 232, 255) !important; }
      .bg-purple-300 { background-color: rgb(196, 181, 253) !important; }
      .bg-amber-50 { background-color: rgb(255, 251, 235) !important; }
      .bg-amber-100 { background-color: rgb(254, 243, 199) !important; }
      .bg-amber-200 { background-color: rgb(253, 230, 138) !important; }
      .bg-red-50 { background-color: rgb(254, 242, 242) !important; }
      .bg-red-100 { background-color: rgb(254, 226, 226) !important; }
      .text-gray-500 { color: rgb(107, 114, 128) !important; }
      .text-gray-600 { color: rgb(75, 85, 99) !important; }
      .text-gray-700 { color: rgb(55, 65, 81) !important; }
      .text-gray-900 { color: rgb(17, 24, 39) !important; }
      .text-blue-600 { color: rgb(37, 99, 235) !important; }
      .text-green-600 { color: rgb(22, 163, 74) !important; }
      .text-purple-600 { color: rgb(147, 51, 234) !important; }
      .text-amber-600 { color: rgb(217, 119, 6) !important; }
      .border-gray-200 { border-color: rgb(229, 231, 235) !important; }
      .border-gray-300 { border-color: rgb(209, 213, 219) !important; }
      .border-blue-200 { border-color: rgb(191, 219, 254) !important; }
      .border-purple-300 { border-color: rgb(196, 181, 253) !important; }
      /* Layout utilities */
      .container { max-width: 100%; margin: 0 auto; }
      .grid { display: grid; }
      .flex { display: flex; }
      .hidden { display: none !important; }
      button { display: none !important; }
    `;
    doc.head.appendChild(style);
  };

  // Build visual organizational chart for export (uses role-filtered data)
  const buildTreeStructure = () => {
    const lines: string[] = [];
    
    // CSS Styles
    lines.push(`
      <style>
        .org-chart-container {
          font-family: Arial, sans-serif;
          padding: 40px;
          background: #ffffff;
        }
        .org-level {
          display: flex;
          justify-content: center;
          align-items: flex-start;
          margin-bottom: 60px;
          position: relative;
        }
        .org-box {
          background: #e5e7eb;
          border: 3px solid #000000;
          border-radius: 4px;
          padding: 20px 30px;
          text-align: center;
          font-weight: bold;
          color: #000000;
          min-width: 180px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .org-box.ceo {
          background: #d1d5db;
          font-size: 24px;
          padding: 30px 40px;
          min-width: 250px;
        }
        .org-box.department {
          background: #e5e7eb;
          font-size: 18px;
          padding: 20px 30px;
        }
        .org-box.position {
          background: #f3f4f6;
          font-size: 16px;
          padding: 15px 25px;
          min-width: 150px;
        }
        .org-connector {
          position: absolute;
          background: #000000;
        }
        .org-connector.vertical {
          width: 3px;
          height: 40px;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
        }
        .org-connector.horizontal {
          height: 3px;
          width: 100%;
          top: 50%;
          transform: translateY(-50%);
        }
        .org-level-wrapper {
          position: relative;
          display: flex;
          gap: 40px;
          align-items: flex-start;
        }
        .org-box-wrapper {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .org-box-wrapper.has-children::after {
          content: '';
          position: absolute;
          width: 3px;
          height: 40px;
          background: #000000;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
        }
        .org-box-wrapper.has-children::before {
          content: '';
          position: absolute;
          width: 100%;
          height: 3px;
          background: #000000;
          top: calc(100% + 40px);
          left: 0;
        }
        .org-box-wrapper:first-child::before {
          left: 50%;
          width: 50%;
        }
        .org-box-wrapper:last-child::before {
          width: 50%;
        }
        .org-box-wrapper:only-child::before {
          display: none;
        }
        .org-box-wrapper:only-child::after {
          display: none;
        }
        .employee-name {
          font-size: 14px;
          font-weight: normal;
          color: #4b5563;
          margin-top: 8px;
          font-style: italic;
        }
        .vacant {
          color: #9ca3af;
        }
      </style>
    `);
    
    lines.push('<div class="org-chart-container">');
    lines.push('<h1 style="text-align: center; font-size: 32px; margin-bottom: 50px; color: #111827;">Organizational Structure</h1>');
    
    // Get top-level positions (CEO or top managers) - use role-filtered positions
    const topLevelPositions = getTopLevelPositions(roleFilteredPositions);
    
    if (topLevelPositions.length === 0 || roleFilteredDepartments.length === 0) {
      lines.push('<p style="text-align: center; color: #6b7280;">No organizational structure data available.</p>');
      lines.push('</div>');
      return lines.join('');
    }
    
    // Use the first top-level position as CEO (or create a virtual CEO if needed)
    const ceoPosition = topLevelPositions[0];
    const ceoPosId = typeof ceoPosition._id === 'string' ? ceoPosition._id : (ceoPosition._id as any)?.toString() || '';
    const ceoAssignments = positionAssignments[ceoPosId] || [];
    const ceoEmployeeName = ceoAssignments.length > 0 
      ? (ceoAssignments[0].employeeProfileId as any)?.fullName || 
        (ceoAssignments[0].employeeProfileId as any)?.firstName + ' ' + 
        (ceoAssignments[0].employeeProfileId as any)?.lastName || 
        null
      : null;
    
    // 1st Level: CEO (centered at top)
    lines.push(`
      <div style="display: flex; justify-content: center; margin-bottom: 60px; position: relative;">
        <div style="position: relative;">
          <div class="org-box ceo" style="background: #d1d5db; border: 3px solid #000000; padding: 30px 50px; text-align: center; font-weight: bold; font-size: 24px; min-width: 200px;">
            ${ceoPosition.title || 'CEO'}
            ${ceoEmployeeName ? `<div style="font-size: 16px; font-weight: normal; color: #4b5563; margin-top: 8px;">${ceoEmployeeName}</div>` : ''}
          </div>
          <div style="position: absolute; left: 50%; top: 100%; transform: translateX(-50%); width: 3px; height: 50px; background: #000000;"></div>
        </div>
      </div>
    `);
    
    // 2nd Level: Departments - use role-filtered departments
    const departmentsWithPositions = roleFilteredDepartments.filter(dept => {
      const deptId = getDepartmentId(dept);
      const deptPositions = getPositionsForDepartment(deptId);
      return deptPositions.length > 0;
    });
    
    if (departmentsWithPositions.length > 0) {
      // Horizontal connector line
      const deptCount = departmentsWithPositions.length;
      const connectorWidth = deptCount > 1 ? `${(deptCount - 1) * 220}px` : '0px';
      
      lines.push(`
        <div style="display: flex; justify-content: center; margin-bottom: 60px; position: relative;">
          <div style="position: relative; display: flex; gap: 40px; align-items: flex-start;">
            ${departmentsWithPositions.map((dept, deptIndex) => {
              const deptId = getDepartmentId(dept);
              const deptPositions = getPositionsForDepartment(deptId);
              const isLast = deptIndex === departmentsWithPositions.length - 1;
              
              return `
                <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
                  ${deptIndex === 0 ? `
                    <div style="position: absolute; left: 50%; top: -50px; transform: translateX(-50%); width: 3px; height: 50px; background: #000000;"></div>
                    <div style="position: absolute; left: 50%; top: -50px; width: ${deptCount > 1 ? '50%' : '0'}; height: 3px; background: #000000;"></div>
                  ` : ''}
                  ${!isLast && deptCount > 1 ? `
                    <div style="position: absolute; left: 50%; top: -50px; width: 50%; height: 3px; background: #000000;"></div>
                  ` : ''}
                  ${deptIndex > 0 && deptIndex < deptCount - 1 ? `
                    <div style="position: absolute; left: 50%; top: -50px; transform: translateX(-50%); width: 3px; height: 50px; background: #000000;"></div>
                  ` : ''}
                  ${isLast && deptCount > 1 ? `
                    <div style="position: absolute; right: 50%; top: -50px; width: 50%; height: 3px; background: #000000;"></div>
                    <div style="position: absolute; left: 50%; top: -50px; transform: translateX(-50%); width: 3px; height: 50px; background: #000000;"></div>
                  ` : ''}
                  
                  <div class="org-box department" style="background: #e5e7eb; border: 3px solid #000000; padding: 20px 30px; text-align: center; font-weight: bold; font-size: 18px; min-width: 180px;">
                    ${dept.name}
                    ${dept.code ? `<div style="font-size: 14px; font-weight: normal; color: #6b7280; margin-top: 5px;">${dept.code}</div>` : ''}
                  </div>
                  
                  ${deptPositions.length > 0 ? `
                    <div style="position: absolute; left: 50%; top: 100%; transform: translateX(-50%); width: 3px; height: 50px; background: #000000;"></div>
                    ${deptPositions.length > 1 ? `
                      <div style="position: absolute; left: 50%; top: calc(100% + 50px); width: ${(deptPositions.length - 1) * 180}px; height: 3px; background: #000000; transform: translateX(-50%);"></div>
                    ` : ''}
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `);
      
      // 3rd Level: Positions/Jobs under each department
      lines.push(`
        <div style="display: flex; justify-content: center; position: relative;">
          <div style="position: relative; display: flex; gap: 40px; align-items: flex-start;">
            ${departmentsWithPositions.map((dept, deptIndex) => {
              const deptId = getDepartmentId(dept);
              const deptPositions = getPositionsForDepartment(deptId);
              
              return `
                <div style="position: relative; display: flex; flex-direction: column; align-items: center; gap: 20px;">
                  ${deptPositions.map((pos, posIndex) => {
                    const posId = typeof pos._id === 'string' ? pos._id : (pos._id as any)?.toString() || '';
                    const assignments = positionAssignments[posId] || [];
                    const employeeName = assignments.length > 0 
                      ? (assignments[0].employeeProfileId as any)?.fullName || 
                        (assignments[0].employeeProfileId as any)?.firstName + ' ' + 
                        (assignments[0].employeeProfileId as any)?.lastName || 
                        null
                      : null;
                    
                    return `
                      <div style="position: relative;">
                        ${posIndex === 0 ? `
                          <div style="position: absolute; left: 50%; top: -50px; transform: translateX(-50%); width: 3px; height: 50px; background: #000000;"></div>
                        ` : ''}
                        <div class="org-box position" style="background: #f3f4f6; border: 3px solid #000000; padding: 15px 25px; text-align: center; font-weight: bold; font-size: 16px; min-width: 150px;">
                          ${pos.title}
                          ${pos.code ? `<div style="font-size: 12px; font-weight: normal; color: #6b7280; margin-top: 4px;">${pos.code}</div>` : ''}
                          ${employeeName ? `<div style="font-size: 14px; font-weight: normal; color: #4b5563; margin-top: 8px; font-style: italic;">${employeeName}</div>` : '<div style="font-size: 14px; font-weight: normal; color: #9ca3af; margin-top: 8px; font-style: italic;">Vacant</div>'}
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `);
    }
    
    lines.push('</div>');
    
    return lines.join('');
  };

  // Export functions
  const exportAsPDF = async () => {
    try {
      // Create a dedicated export container with all necessary content
      const exportDiv = document.createElement('div');
      exportDiv.style.position = 'absolute';
      exportDiv.style.left = '-9999px';
      exportDiv.style.top = '0';
      exportDiv.style.width = '1200px';
      exportDiv.style.backgroundColor = '#ffffff';
      exportDiv.style.padding = '40px';
      exportDiv.className = 'export-container';
      
      // Add header
      const header = document.createElement('div');
      header.innerHTML = `
        <h1 style="font-size: 32px; font-weight: bold; color: #111827; margin-bottom: 10px;">Organization Chart</h1>
        <p style="color: #6b7280; font-size: 14px; margin-bottom: 5px;">Generated on: ${new Date().toLocaleString()}</p>
      `;
      exportDiv.appendChild(header);
      
      // Add tree structure
      const treeContent = document.createElement('div');
      treeContent.innerHTML = buildTreeStructure();
      exportDiv.appendChild(treeContent);
      
      document.body.appendChild(exportDiv);
      
      // Wait a moment for rendering
      await new Promise(resolve => setTimeout(resolve, 100));

      // Dynamically import html2canvas and jsPDF
      const html2canvasModule: any = await import('html2canvas');
      const html2canvas = html2canvasModule.default || html2canvasModule;
      const jsPDFModule: any = await import('jspdf');
      // Handle both default and named exports
      const jsPDFClass = jsPDFModule.default?.jsPDF || jsPDFModule.jsPDF || jsPDFModule.default || jsPDFModule;
      
      // Capture the export container with options that handle oklch colors better
      const canvas = await html2canvas(exportDiv, {
        background: '#ffffff',
        scale: 1.5,
        logging: false,
        useCORS: true,
        allowTaint: true,
        foreignObjectRendering: false,
        onclone: (clonedDoc: Document, element: HTMLElement) => {
          // Inject CSS to override oklch colors
          injectColorFixCSS(clonedDoc);
          
          // Remove any problematic elements in the clone
          const clonedBody = clonedDoc.body;
          const buttons = clonedBody.querySelectorAll('button');
          buttons.forEach(btn => {
            const clonedBtn = btn as HTMLElement;
            clonedBtn.style.display = 'none';
          });
          
          // Force convert all computed styles to inline styles
          const allElements = clonedBody.querySelectorAll('*');
          allElements.forEach((el) => {
            const htmlEl = el as HTMLElement;
            try {
              const computedStyle = window.getComputedStyle(htmlEl);
              
              // Convert all color properties
              ['backgroundColor', 'color', 'borderColor', 'borderTopColor', 
               'borderRightColor', 'borderBottomColor', 'borderLeftColor'].forEach(prop => {
                try {
                  const value = computedStyle.getPropertyValue(prop);
                  if (value && !value.includes('oklch') && value !== 'rgba(0, 0, 0, 0)' && value !== 'transparent') {
                    htmlEl.style.setProperty(prop, value, 'important');
                  }
                } catch (e) {
                  // Ignore individual property errors
                }
              });
            } catch (e) {
              // Ignore element conversion errors
            }
          });
        },
      } as any);

      const imgData = canvas.toDataURL('image/png', 0.95);
      // Create PDF instance
      const pdf = new jsPDFClass({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      
      // Add image to first page
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      
      // Add additional pages if content is taller than one page
      let heightLeft = imgHeight;
      let position = 0;
      
      while (heightLeft > pdfHeight) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, -position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`organization-chart-${new Date().toISOString().split('T')[0]}.pdf`);
      
      // Clean up
      document.body.removeChild(exportDiv);
    } catch (error: any) {
      console.error('Error exporting as PDF:', error);
      alert(`Failed to export as PDF: ${error?.message || 'Unknown error'}`);
      // Clean up on error
      const exportDiv = document.querySelector('.export-container');
      if (exportDiv) document.body.removeChild(exportDiv);
    }
  };

  const exportAsImage = async () => {
    try {
      // Create a dedicated export container with all necessary content
      const exportDiv = document.createElement('div');
      exportDiv.style.position = 'absolute';
      exportDiv.style.left = '-9999px';
      exportDiv.style.top = '0';
      exportDiv.style.width = '1200px';
      exportDiv.style.backgroundColor = '#ffffff';
      exportDiv.style.padding = '40px';
      exportDiv.className = 'export-container';
      
      // Add header
      const header = document.createElement('div');
      header.innerHTML = `
        <h1 style="font-size: 32px; font-weight: bold; color: #111827; margin-bottom: 10px;">Organization Chart</h1>
        <p style="color: #6b7280; font-size: 14px; margin-bottom: 5px;">Generated on: ${new Date().toLocaleString()}</p>
      `;
      exportDiv.appendChild(header);
      
      // Add tree structure
      const treeContent = document.createElement('div');
      treeContent.innerHTML = buildTreeStructure();
      exportDiv.appendChild(treeContent);
      
      document.body.appendChild(exportDiv);
      
      // Wait a moment for rendering
      await new Promise(resolve => setTimeout(resolve, 100));

      // Dynamically import html2canvas
      const html2canvas = (await import('html2canvas')).default;
      
      // Use options that work better with modern CSS
      const canvas = await html2canvas(exportDiv, {
        background: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        foreignObjectRendering: false,
        removeContainer: false,
        onclone: (clonedDoc: Document, element: HTMLElement) => {
          // Inject CSS to override oklch colors
          injectColorFixCSS(clonedDoc);
          
          // Hide buttons and other UI elements in the clone
          const clonedBody = clonedDoc.body;
          const buttons = clonedBody.querySelectorAll('button');
          buttons.forEach(btn => {
            const clonedBtn = btn as HTMLElement;
            clonedBtn.style.display = 'none';
          });
          
          // Force convert all computed styles to inline styles to avoid oklch issues
          const allElements = clonedBody.querySelectorAll('*');
          allElements.forEach((el) => {
            const htmlEl = el as HTMLElement;
            try {
              const computedStyle = window.getComputedStyle(htmlEl);
              
              // Convert all color properties
              ['backgroundColor', 'color', 'borderColor', 'borderTopColor', 
               'borderRightColor', 'borderBottomColor', 'borderLeftColor'].forEach(prop => {
                try {
                  const value = computedStyle.getPropertyValue(prop);
                  if (value && !value.includes('oklch') && value !== 'rgba(0, 0, 0, 0)' && value !== 'transparent') {
                    htmlEl.style.setProperty(prop, value, 'important');
                  }
                } catch (e) {
                  // Ignore individual property errors
                }
              });
            } catch (e) {
              // Ignore element conversion errors
            }
          });
        },
      } as any);

      const link = document.createElement('a');
      link.download = `organization-chart-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png', 0.95);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      document.body.removeChild(exportDiv);
    } catch (error: any) {
      console.error('Error exporting as image:', error);
      alert(`Failed to export as image: ${error?.message || 'Unknown error'}. Check console for details.`);
      // Clean up on error
      const exportDiv = document.querySelector('.export-container');
      if (exportDiv) document.body.removeChild(exportDiv);
    }
  };

  const printChart = () => {
    const printContent = document.querySelector('.container')?.innerHTML || '';
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Organization Chart</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            @media print {
              @page { size: landscape; margin: 1cm; }
            }
          </style>
        </head>
        <body>
          ${printContent}
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const generateReport = () => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalDepartments: departments.length,
        activeDepartments: departments.filter(d => d.isActive).length,
        totalPositions: positions.length,
        activePositions: positions.filter(p => p.isActive).length,
      },
      departments: roleFilteredDepartments.map(dept => {
        const deptId = getDepartmentId(dept);
        const deptPositions = getPositionsForDepartment(deptId);
        return {
          name: dept.name,
          code: dept.code,
          isActive: dept.isActive,
          positionCount: deptPositions.length,
          positions: deptPositions.map(pos => ({
            title: pos.title,
            code: pos.code,
            isActive: pos.isActive,
          })),
        };
      }),
      positions: roleFilteredPositions.map(pos => {
        const posId = typeof pos._id === 'string' ? pos._id : (pos._id as any)?.toString() || '';
        const reportsToId = typeof pos.reportsToPositionId === 'string' 
          ? pos.reportsToPositionId 
          : (pos.reportsToPositionId as any)?._id?.toString() || '';
        const reportsTo = reportsToId 
          ? roleFilteredPositions.find(p => {
              const pId = typeof p._id === 'string' ? p._id : (p._id as any)?.toString() || '';
              return pId === reportsToId;
            })?.title || 'N/A'
          : 'Top Level';
        
        return {
          title: pos.title,
          code: pos.code,
          isActive: pos.isActive,
          reportsTo,
        };
      }),
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `organization-report-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ProtectedRoute
      allowedRoles={[
        SystemRole.SYSTEM_ADMIN,
        SystemRole.HR_ADMIN,
        SystemRole.HR_MANAGER,
        SystemRole.DEPARTMENT_HEAD,
        SystemRole.DEPARTMENT_EMPLOYEE,
      ]}
    >
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Organization Chart</h1>
              <p className="text-gray-600 mt-1">
                Visualize your organizational structure and reporting lines
              </p>
              {/* BR 41: Role-based view indicator */}
              {!canSeeFullStructure && (
                <div className="mt-2">
                  {canSeeTeamStructure && (
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      Viewing: Team Structure Only
                    </div>
                  )}
                  {canSeeLimitedView && (
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      Viewing: Limited View (Your Department Only)
                    </div>
                  )}
                </div>
              )}
              {canSeeFullStructure && (
                <div className="mt-2">
                  <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Viewing: Full Organizational Structure
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard/organization-structure/departments")}
              >
                Manage Departments
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard/organization-structure/positions")}
              >
                Manage Positions
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center text-sm text-gray-600 mb-6">
            <Link href="/dashboard" className="hover:text-blue-600">
              Dashboard
            </Link>
            <span className="mx-2">/</span>
            <Link href="/dashboard/organization-structure" className="hover:text-blue-600">
              Organization Structure
            </Link>
            <span className="mx-2">/</span>
            <span className="text-gray-900 font-medium">Organization Chart</span>
          </div>
        </div>

        {/* Controls */}
        <div className="mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Search */}
                <div className="flex-1 max-w-md">
                  <Input
                    type="text"
                    placeholder="Search departments or positions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                </div>

                {/* View Toggle */}
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-700">View:</span>
                  <Tabs defaultValue="chart" className="w-[400px]" onValueChange={(value) => setViewType(value as any)}>
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="chart">Chart View</TabsTrigger>
                      <TabsTrigger value="list">List View</TabsTrigger>
                      <TabsTrigger value="tree">Tree View</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Loading organization chart...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Chart View */}
            {viewType === "chart" && (
              <Card>
                <CardHeader>
                  <CardTitle>Organization Chart</CardTitle>
                  <CardDescription>
                    Interactive visualization of departments and positions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Department Levels */}
                  <div className="space-y-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Departments</h3>
                    {filteredDepartments.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        No departments found. {searchQuery && "Try adjusting your search."}
                      </div>
                    ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredDepartments.map((dept) => {
                          const deptId = getDepartmentId(dept);
                          const deptPositions = getPositionsForDepartment(deptId);
                          return (
                            <Card key={deptId} className="hover:shadow-lg transition-shadow">
                            <CardHeader>
                              <div className="flex items-center justify-between">
                                <div>
                                  <CardTitle>{dept.name}</CardTitle>
                                  <CardDescription className="font-mono">{dept.code}</CardDescription>
                                </div>
                                  {deptPositions.length > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedDepartment(
                                        selectedDepartment === deptId ? null : deptId
                                      )}
                                    >
                                      {selectedDepartment === deptId ? "Hide" : "Show"} Positions
                                    </Button>
                                  )}
                              </div>
                            </CardHeader>
                            <CardContent>
                                {selectedDepartment === deptId && deptPositions.length > 0 && (
                                <div className="space-y-3 mt-4">
                                    {deptPositions.map((pos) => {
                                      const posId = typeof pos._id === 'string' ? pos._id : (pos._id as any)?.toString() || '';
                                      return (
                                        <div key={posId} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                      <div className="font-medium text-gray-900">{pos.title}</div>
                                          {pos.code && (
                                            <div className="text-xs text-gray-500 font-mono mt-1">{pos.code}</div>
                                          )}
                                          {pos.reportsToPositionId && (
                                            <div className="text-xs text-gray-500 mt-1">
                                              Reports to: {positions.find(p => {
                                                const pId = typeof p._id === 'string' ? p._id : (p._id as any)?.toString() || '';
                                                const reportsToId = typeof pos.reportsToPositionId === 'string' 
                                                  ? pos.reportsToPositionId 
                                                  : (pos.reportsToPositionId as any)?._id?.toString() || '';
                                                return pId === reportsToId;
                                              })?.title || 'N/A'}
                                            </div>
                                          )}
                                    </div>
                                      );
                                    })}
                                </div>
                              )}
                              <div className="mt-4 pt-4 border-t border-gray-200">
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">
                                      {deptPositions.length} position{deptPositions.length !== 1 ? "s" : ""}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                      onClick={() => router.push(`/dashboard/organization-structure/departments/${deptId}`)}
                                  >
                                    View Details →
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                          );
                        })}
                    </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* List View */}
            {viewType === "list" && (
              <Card>
                <CardHeader>
                  <CardTitle>Department List</CardTitle>
                  <CardDescription>
                    Detailed list of all departments and their positions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Department
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Code
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Positions
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredDepartments.map((dept) => {
                          const deptId = getDepartmentId(dept);
                          const deptPositions = getPositionsForDepartment(deptId);
                          return (
                            <tr key={deptId} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="font-medium text-gray-900">{dept.name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <code className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                {dept.code}
                              </code>
                            </td>
                            <td className="px-6 py-4">
                              <div className="space-y-2">
                                  {deptPositions.length > 0 ? (
                                    deptPositions.map((pos) => {
                                      const posId = typeof pos._id === 'string' ? pos._id : (pos._id as any)?.toString() || '';
                                      return (
                                        <div key={posId} className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                    <span className="text-sm text-gray-700">{pos.title}</span>
                                          {pos.code && (
                                            <span className="text-xs text-gray-500 font-mono">({pos.code})</span>
                                          )}
                                  </div>
                                      );
                                    })
                                  ) : (
                                    <span className="text-sm text-gray-400">No positions</span>
                                  )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <Button
                                variant="ghost"
                                size="sm"
                                  onClick={() => router.push(`/dashboard/organization-structure/departments/${deptId}`)}
                              >
                                View
                              </Button>
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tree View */}
            {viewType === "tree" && (
              <Card>
                <CardHeader>
                  <CardTitle>Reporting Structure Tree</CardTitle>
                  <CardDescription>
                    Hierarchical view of reporting lines and management structure
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    {positions.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        No positions found. Create positions to see the reporting structure.
                      </div>
                    ) : (
                      <>
                        {/* Top Level Positions */}
                        {getTopLevelPositions(positions).length > 0 && (
                          <div className="flex flex-wrap justify-center gap-6 mb-12">
                            {getTopLevelPositions(positions).map((pos) => {
                              const posId = typeof pos._id === 'string' ? pos._id : (pos._id as any)?.toString() || '';
                              const dept = departments.find(d => {
                                const dId = getDepartmentId(d);
                                const deptId = typeof pos.departmentId === 'string' 
                                  ? pos.departmentId 
                                  : (pos.departmentId as any)?._id?.toString() || '';
                                return dId === deptId;
                              });
                              return (
                                <div key={posId} className="text-center">
                                  <div className="inline-block p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-300 rounded-xl shadow-lg">
                                    <div className="text-xl font-bold text-gray-900">{pos.title}</div>
                                    {pos.code && (
                                      <div className="text-xs text-purple-600 mt-1 font-mono">{pos.code}</div>
                                    )}
                                    {dept && (
                                      <div className="text-xs text-gray-600 mt-2">{dept.name}</div>
                                    )}
                              </div>
                            </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Department-based Tree */}
                        {roleFilteredDepartments.length > 0 && (
                          <div className="space-y-8">
                            {roleFilteredDepartments.map((dept) => {
                              const deptId = getDepartmentId(dept);
                              const deptPositions = getPositionsForDepartment(deptId);
                              const topLevelDeptPositions = deptPositions.filter(p => !p.reportsToPositionId);
                              
                              if (topLevelDeptPositions.length === 0) return null;

                              return (
                                <div key={deptId} className="bg-gray-50 rounded-lg p-6">
                                  <h4 className="font-semibold text-gray-900 mb-4 text-lg">
                                    {dept.name} {dept.code && <span className="text-sm font-mono text-gray-500">({dept.code})</span>}
                                  </h4>
                                  <div className="space-y-3">
                                    {topLevelDeptPositions.map((pos) => {
                                      const posId = typeof pos._id === 'string' ? pos._id : (pos._id as any)?.toString() || '';
                                      const subordinates = getSubordinatePositions(roleFilteredPositions, posId);
                                      return (
                                        <div key={posId} className="bg-white rounded-lg p-4 border border-gray-200">
                                          <div className="flex items-center gap-2 mb-2">
                                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                            <span className="font-medium text-gray-900">{pos.title}</span>
                                            {pos.code && (
                                              <span className="text-xs text-gray-500 font-mono">({pos.code})</span>
                                            )}
                                          </div>
                                          {subordinates.length > 0 && (
                                            <div className="ml-4 mt-2 space-y-2">
                                              {subordinates.map((sub) => {
                                                const subId = typeof sub._id === 'string' ? sub._id : (sub._id as any)?.toString() || '';
                                                return (
                                                  <div key={subId} className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-100">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                                    <span className="text-sm text-gray-700">{sub.title}</span>
                                                    {sub.code && (
                                                      <span className="text-xs text-gray-500 font-mono">({sub.code})</span>
                                                    )}
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}
                              </div>
                                      );
                                    })}
                              </div>
                              </div>
                              );
                            })}
                          </div>
                        )}

                        {getTopLevelPositions(roleFilteredPositions).length === 0 && roleFilteredDepartments.length === 0 && (
                          <div className="text-center py-12 text-gray-500">
                            {canSeeLimitedView || canSeeTeamStructure 
                              ? "No organizational structure data available for your role." 
                              : "No organizational structure data available."}
                        </div>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stats Summary */}
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {allDepartments.length > 0 ? allDepartments.length : departments.length}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Total Departments</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {allPositions.length > 0 ? allPositions.length : positions.length}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Total Positions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">
                      {allPositions.length > 0 
                        ? allPositions.filter(p => p.isActive !== false).length 
                        : positions.filter(p => p.isActive !== false).length}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Active Positions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-amber-600">
                      {allDepartments.length > 0 
                        ? allDepartments.filter(d => d.isActive !== false).length 
                        : departments.filter(d => d.isActive !== false).length}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Active Departments</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Export Options */}
            <Card>
              <CardHeader>
                <CardTitle>Export & Reports</CardTitle>
                <CardDescription>
                  Generate reports or export the organization chart
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <Button variant="outline" onClick={exportAsPDF} disabled={loading}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export as PDF
                  </Button>
                  <Button variant="outline" onClick={exportAsImage} disabled={loading}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export as Image
                  </Button>
                  <Button variant="outline" onClick={printChart} disabled={loading}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Print Chart
                  </Button>
                  <Button variant="outline" onClick={generateReport} disabled={loading}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Generate Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Footer Navigation */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <Link
              href="/dashboard/organization-structure"
              className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
            >
              ← Back to Organization Structure
            </Link>
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard/employee-profile/team")}
              >
                View My Team Structure
              </Button>
              <Button
                variant="primary"
                onClick={() => router.push("/dashboard/organization-structure/change-requests/new")}
              >
                Request Structure Change
              </Button>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}