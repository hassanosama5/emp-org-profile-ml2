"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { SystemRole } from "@/types";
import { Button } from "@/components/shared/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/shared/ui/Card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/shared/ui/Tabs";
import { Input } from "@/components/shared/ui/Input";
import { useOrganizationStructure } from "@/lib/hooks/use-organization-structure";
import { DepartmentResponseDto, PositionResponseDto } from "@/types/organization-structure";

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
  const { getDepartments, getPositions, loading, error } = useOrganizationStructure();
  
  const [viewType, setViewType] = useState<"chart" | "list" | "tree">("chart");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [departments, setDepartments] = useState<DepartmentResponseDto[]>([]);
  const [positions, setPositions] = useState<PositionResponseDto[]>([]);
  const exportContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchHierarchyData();
    fetchPositions();
  }, []);

  const fetchHierarchyData = async () => {
    try {
      const data = await getDepartments({ isActive: true });
      setDepartments(data || []);
    } catch (err) {
      console.error("Failed to fetch departments:", err);
      setDepartments([]);
    }
  };

  const fetchPositions = async () => {
    try {
      const data = await getPositions({ isActive: true });
      setPositions(data || []);
    } catch (err) {
      console.error("Failed to fetch positions:", err);
      setPositions([]);
    }
  };

  // Helper function to get positions for a department
  const getPositionsForDepartment = (departmentId: string) => {
    return positions.filter(pos => {
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

  const filteredDepartments = departments.filter((dept) => {
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
        <p style="color: #9ca3af; font-size: 12px; margin-bottom: 30px;">View: ${viewType === 'chart' ? 'Chart View' : viewType === 'list' ? 'List View' : 'Tree View'}</p>
      `;
      exportDiv.appendChild(header);
      
      // Clone the current view content
      const contentArea = document.querySelector('.export-content') || document.querySelector('[class*="space-y-8"]');
      if (contentArea) {
        const clonedContent = contentArea.cloneNode(true) as HTMLElement;
        // Remove buttons and controls from clone
        clonedContent.querySelectorAll('button, input, select, .export-header').forEach(el => el.remove());
        exportDiv.appendChild(clonedContent);
      }
      
      // Add statistics summary
      const stats = document.createElement('div');
      stats.style.marginTop = '30px';
      stats.style.padding = '20px';
      stats.style.backgroundColor = '#f9fafb';
      stats.style.borderRadius = '8px';
      stats.innerHTML = `
        <h2 style="font-size: 20px; font-weight: bold; color: #111827; margin-bottom: 15px;">Summary Statistics</h2>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px;">
          <div style="text-align: center;">
            <div style="font-size: 28px; font-weight: bold; color: #2563eb; margin-bottom: 5px;">${departments.length}</div>
            <div style="font-size: 12px; color: #6b7280;">Total Departments</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 28px; font-weight: bold; color: #16a34a; margin-bottom: 5px;">${positions.length}</div>
            <div style="font-size: 12px; color: #6b7280;">Total Positions</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 28px; font-weight: bold; color: #9333ea; margin-bottom: 5px;">${positions.filter(p => p.isActive).length}</div>
            <div style="font-size: 12px; color: #6b7280;">Active Positions</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 28px; font-weight: bold; color: #d97706; margin-bottom: 5px;">${departments.filter(d => d.isActive).length}</div>
            <div style="font-size: 12px; color: #6b7280;">Active Departments</div>
          </div>
        </div>
      `;
      exportDiv.appendChild(stats);
      
      document.body.appendChild(exportDiv);
      
      // Wait a moment for rendering
      await new Promise(resolve => setTimeout(resolve, 100));

      // Dynamically import html2canvas and jsPDF
      const html2canvas = (await import('html2canvas')).default;
      const jsPDFModule: any = await import('jspdf');
      // Handle both default and named exports
      const jsPDFClass = jsPDFModule.default?.jsPDF || jsPDFModule.jsPDF || jsPDFModule.default || jsPDFModule;
      
      // Capture the export container with options that handle oklch colors better
      const canvas = await html2canvas(exportDiv, {
        backgroundColor: '#ffffff',
        scale: 1.5,
        logging: false,
        useCORS: true,
        allowTaint: true,
        foreignObjectRendering: false,
        onclone: (clonedDoc, element) => {
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
      });

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
        <p style="color: #9ca3af; font-size: 12px; margin-bottom: 30px;">View: ${viewType === 'chart' ? 'Chart View' : viewType === 'list' ? 'List View' : 'Tree View'}</p>
      `;
      exportDiv.appendChild(header);
      
      // Clone the current view content
      const contentArea = document.querySelector('.export-content') || document.querySelector('[class*="space-y-8"]');
      if (contentArea) {
        const clonedContent = contentArea.cloneNode(true) as HTMLElement;
        // Remove buttons and controls from clone
        clonedContent.querySelectorAll('button, input, select, .export-header').forEach(el => el.remove());
        exportDiv.appendChild(clonedContent);
      }
      
      // Add statistics summary
      const stats = document.createElement('div');
      stats.style.marginTop = '30px';
      stats.style.padding = '20px';
      stats.style.backgroundColor = '#f9fafb';
      stats.style.borderRadius = '8px';
      stats.innerHTML = `
        <h2 style="font-size: 20px; font-weight: bold; color: #111827; margin-bottom: 15px;">Summary Statistics</h2>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px;">
          <div style="text-align: center;">
            <div style="font-size: 28px; font-weight: bold; color: #2563eb; margin-bottom: 5px;">${departments.length}</div>
            <div style="font-size: 12px; color: #6b7280;">Total Departments</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 28px; font-weight: bold; color: #16a34a; margin-bottom: 5px;">${positions.length}</div>
            <div style="font-size: 12px; color: #6b7280;">Total Positions</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 28px; font-weight: bold; color: #9333ea; margin-bottom: 5px;">${positions.filter(p => p.isActive).length}</div>
            <div style="font-size: 12px; color: #6b7280;">Active Positions</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 28px; font-weight: bold; color: #d97706; margin-bottom: 5px;">${departments.filter(d => d.isActive).length}</div>
            <div style="font-size: 12px; color: #6b7280;">Active Departments</div>
          </div>
        </div>
      `;
      exportDiv.appendChild(stats);
      
      document.body.appendChild(exportDiv);
      
      // Wait a moment for rendering
      await new Promise(resolve => setTimeout(resolve, 100));

      // Dynamically import html2canvas
      const html2canvas = (await import('html2canvas')).default;
      
      // Use options that work better with modern CSS
      const canvas = await html2canvas(exportDiv, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        foreignObjectRendering: false,
        removeContainer: false,
        onclone: (clonedDoc, element) => {
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
      });

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
      departments: departments.map(dept => {
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
      positions: positions.map(pos => {
        const posId = typeof pos._id === 'string' ? pos._id : (pos._id as any)?.toString() || '';
        const reportsToId = typeof pos.reportsToPositionId === 'string' 
          ? pos.reportsToPositionId 
          : (pos.reportsToPositionId as any)?._id?.toString() || '';
        const reportsTo = reportsToId 
          ? positions.find(p => {
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
                        {departments.length > 0 && (
                          <div className="space-y-8">
                            {departments.map((dept) => {
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
                                      const subordinates = getSubordinatePositions(positions, posId);
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

                        {getTopLevelPositions(positions).length === 0 && departments.length === 0 && (
                          <div className="text-center py-12 text-gray-500">
                            No organizational structure data available.
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
                      {departments.length}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Total Departments</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {positions.length}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Total Positions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">
                      {positions.filter(p => p.isActive).length}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Active Positions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-amber-600">
                      {departments.filter(d => d.isActive).length}
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