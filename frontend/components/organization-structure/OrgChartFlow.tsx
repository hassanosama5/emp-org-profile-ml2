"use client";

import React, { useCallback, useMemo, useEffect } from "react";
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  Panel,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  PositionResponseDto,
} from "@/types/organization-structure";

interface OrgChartFlowProps {
  positions: PositionResponseDto[];
  positionAssignments: Record<string, any[]>;
}

// Custom Position Node with Employee
const PositionNode = ({ data }: { data: any }) => {
  const employeeNames = data.employeeNames || [];
  const isVacant = employeeNames.length === 0;
  
  return (
    <div
      className={`rounded-lg shadow-lg border-2 px-5 py-4 min-w-[200px] ${
        isVacant
          ? "bg-gray-100 border-gray-300 text-gray-600"
          : "bg-white border-blue-300 text-gray-900"
      }`}
    >
      {isVacant ? (
        <div className="font-bold text-base text-center">Vacant</div>
      ) : (
        <div className="text-center">
          {employeeNames.map((name: string, idx: number) => (
            <div key={idx} className="font-bold text-base">
              {name}
            </div>
          ))}
        </div>
      )}
      <div className="font-semibold text-sm text-center mt-1 text-gray-700">{data.title}</div>
      {data.code && (
        <div className="text-xs text-gray-500 font-mono text-center mt-1">{data.code}</div>
      )}
    </div>
  );
};

const nodeTypes = {
  position: PositionNode,
};

// Inner component that uses React Flow hooks
function OrgChartFlowInner({
  positions,
  positionAssignments,
}: OrgChartFlowProps) {
  const { fitView } = useReactFlow();

  // Helper to normalize IDs
  const normalizeId = (id: any): string => {
    if (!id) return "";
    if (typeof id === "string") return id;
    if (id._id) return typeof id._id === "string" ? id._id : id._id.toString();
    if (id.toString) return id.toString();
    return String(id);
  };

  // Get employee names from assignments - get ALL active employees for a position
  const getEmployeeNames = useCallback((posId: string): string[] => {
    const assignments = positionAssignments[posId] || [];
    
    // Get all active assignments (no endDate or endDate in future)
    const activeAssignments = assignments.filter((a: any) => {
      if (!a.endDate) return true;
      const endDate = new Date(a.endDate);
      return endDate > new Date();
    });
    
    if (activeAssignments.length === 0) return [];
    
    const names: string[] = [];
    
    activeAssignments.forEach((assignment: any) => {
      const emp = assignment.employeeProfileId;
      if (!emp) return;
      
      // Handle populated employee object
      if (typeof emp === "object" && emp !== null) {
        let name: string | null = null;
        
        // Try fullName first
        if (emp.fullName) {
          name = emp.fullName;
        }
        // Try firstName + lastName
        else if (emp.firstName && emp.lastName) {
          name = `${emp.firstName} ${emp.lastName}`;
        }
        // Try just firstName
        else if (emp.firstName) {
          name = emp.firstName;
        }
        // Try employeeNumber as fallback
        else if (emp.employeeNumber) {
          name = emp.employeeNumber;
        }
        
        if (name && !names.includes(name)) {
          names.push(name);
        }
      }
    });
    
    return names;
  }, [positionAssignments]);

  // Find CEO position (position with no reportsToPositionId or title contains "CEO")
  const findCEOPosition = useMemo(() => {
    // First try to find by title
    let ceo = positions.find(
      (pos) => pos.title?.toLowerCase().includes("ceo") || 
               pos.title?.toLowerCase().includes("chief executive")
    );
    
    // If not found, find top-level position (no reportsTo)
    if (!ceo) {
      ceo = positions.find((pos) => !pos.reportsToPositionId);
    }
    
    return ceo;
  }, [positions]);

  // Build hierarchical tree structure based on reportsToPositionId
  const buildPositionTree = useCallback((parentId: string | null): any[] => {
    return positions
      .filter((pos) => {
        const reportsToId = normalizeId(pos.reportsToPositionId);
        const parentIdStr = parentId ? normalizeId(parentId) : null;
        return reportsToId === parentIdStr;
      })
      .map((pos) => ({
        position: pos,
        children: buildPositionTree(pos._id),
      }));
  }, [positions]);

  // Simple layout calculation - cleaner tree with proper connections
  const calculateLayout = useCallback((tree: any[], startX: number, startY: number, level: number = 0): { nodes: Node[], edges: Edge[], nextX: number, width: number } => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    let currentX = startX;
    const verticalSpacing = 220;
    const horizontalSpacing = 280;
    const y = startY + (level * verticalSpacing);
    const nodeWidth = 220;

    for (const item of tree) {
      const pos = item.position;
      const posId = normalizeId(pos._id);
      const employeeNames = getEmployeeNames(posId);

      // Calculate children layout first
      const childrenLayout = item.children.length > 0
        ? calculateLayout(item.children, currentX, y + verticalSpacing, level + 1)
        : { nodes: [], edges: [], nextX: currentX, width: 0 };

      // Center parent above children
      let parentX = currentX;
      if (item.children.length > 0 && childrenLayout.width > 0) {
        parentX = currentX + (childrenLayout.width / 2) - (nodeWidth / 2);
      }

      // Create parent node
      nodes.push({
        id: `pos-${posId}`,
        type: "position",
        position: { x: parentX, y },
        data: {
          title: pos.title,
          code: pos.code,
          employeeNames,
        },
      });

      // Create edges connecting parent to children
      item.children.forEach((child: any) => {
        const childPosId = normalizeId(child.position._id);
        edges.push({
          id: `edge-${posId}-${childPosId}`,
          source: `pos-${posId}`,
          target: `pos-${childPosId}`,
          type: "smoothstep",
          style: { stroke: "#64748b", strokeWidth: 2.5 },
        });
      });

      // Add children nodes and edges
      nodes.push(...childrenLayout.nodes);
      edges.push(...childrenLayout.edges);

      // Calculate subtree width
      const subtreeWidth = Math.max(
        childrenLayout.width || 0,
        nodeWidth,
        item.children.length > 0 ? (item.children.length - 1) * horizontalSpacing + nodeWidth : nodeWidth
      );

      // Move to next sibling
      currentX += subtreeWidth + horizontalSpacing;
    }

    const totalWidth = currentX - startX - horizontalSpacing;
    return { nodes, edges, nextX: currentX, width: totalWidth };
  }, [getEmployeeNames]);

  // Build nodes and edges
  const { nodes, edges } = useMemo((): { nodes: Node[], edges: Edge[] } => {
    if (positions.length === 0) {
      return { nodes: [], edges: [] };
    }

    // Start from CEO or top-level position
    const rootPosition = findCEOPosition || positions.find((pos) => !pos.reportsToPositionId);
    
    if (!rootPosition) {
      // If no root found, just show all positions without hierarchy
      return {
        nodes: positions.map((pos, idx) => {
          const posId = normalizeId(pos._id);
          return {
            id: `pos-${posId}`,
            type: "position",
            position: { x: 100 + (idx * 250), y: 50 },
            data: {
              title: pos.title,
              code: pos.code,
              employeeNames: getEmployeeNames(posId),
            },
          };
        }),
        edges: [],
      };
    }

    // Build tree starting from root
    const tree = [{
      position: rootPosition,
      children: buildPositionTree(rootPosition._id),
    }];

    // Calculate layout
    const layout = calculateLayout(tree, 100, 50, 0);

    return { nodes: layout.nodes, edges: layout.edges };
  }, [positions, positionAssignments, findCEOPosition, buildPositionTree, calculateLayout, getEmployeeNames]);

  // Fit view on mount
  useEffect(() => {
    if (nodes.length > 0) {
      setTimeout(() => {
        fitView({ padding: 0.2, duration: 800 });
      }, 200);
    }
  }, [fitView, nodes.length]);

  // Export to PDF
  const exportToPDF = useCallback(async () => {
    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDFModule = await import("jspdf");
      const jsPDF = (jsPDFModule as any).jsPDF || (jsPDFModule as any).default || jsPDFModule;

      // Get the React Flow container - try multiple selectors
      const flowContainer = document.querySelector(".react-flow") as HTMLElement;
      if (!flowContainer) {
        alert("Chart element not found. Please try again.");
        return;
      }

      // Hide controls and minimap for export
      const controls = flowContainer.querySelector(".react-flow__controls");
      const minimap = flowContainer.querySelector(".react-flow__minimap");
      const panel = flowContainer.querySelector(".react-flow__panel");
      
      if (controls) (controls as HTMLElement).style.display = "none";
      if (minimap) (minimap as HTMLElement).style.display = "none";
      if (panel) (panel as HTMLElement).style.display = "none";

      // Wait a bit for UI to update
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(flowContainer, {
        background: "#ffffff",
        logging: false,
        useCORS: true,
        allowTaint: true,
        width: flowContainer.scrollWidth,
        height: flowContainer.scrollHeight,
      } as any);

      // Restore controls
      if (controls) (controls as HTMLElement).style.display = "";
      if (minimap) (minimap as HTMLElement).style.display = "";
      if (panel) (panel as HTMLElement).style.display = "";

      const imgData = canvas.toDataURL("image/png", 0.95);
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let yPosition = 10;
      let heightLeft = imgHeight;

      pdf.addImage(imgData, "PNG", 10, yPosition, imgWidth, imgHeight);

      // Handle multi-page
      while (heightLeft > pdfHeight - 20) {
        yPosition = heightLeft - pdfHeight + 20;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 10, -yPosition, imgWidth, imgHeight);
        heightLeft -= pdfHeight - 20;
      }

      pdf.save(`org-chart-${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (error) {
      console.error("Error exporting to PDF:", error);
      alert("Failed to export to PDF: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  }, []);

  // Print
  const handlePrint = useCallback(async () => {
    try {
      const flowContainer = document.querySelector(".react-flow") as HTMLElement;
      if (!flowContainer) {
        alert("Chart element not found");
        return;
      }

      // Hide controls and minimap for print
      const controls = flowContainer.querySelector(".react-flow__controls");
      const minimap = flowContainer.querySelector(".react-flow__minimap");
      const panel = flowContainer.querySelector(".react-flow__panel");
      
      const originalControlsDisplay = controls ? (controls as HTMLElement).style.display : "";
      const originalMinimapDisplay = minimap ? (minimap as HTMLElement).style.display : "";
      const originalPanelDisplay = panel ? (panel as HTMLElement).style.display : "";
      
      if (controls) (controls as HTMLElement).style.display = "none";
      if (minimap) (minimap as HTMLElement).style.display = "none";
      if (panel) (panel as HTMLElement).style.display = "none";

      // Use html2canvas to capture the chart as an image for print
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(flowContainer, {
        background: "#ffffff",
        logging: false,
        useCORS: true,
        allowTaint: true,
        width: flowContainer.scrollWidth,
        height: flowContainer.scrollHeight,
      } as any);

      // Restore controls
      if (controls) (controls as HTMLElement).style.display = originalControlsDisplay;
      if (minimap) (minimap as HTMLElement).style.display = originalMinimapDisplay;
      if (panel) (panel as HTMLElement).style.display = originalPanelDisplay;

      const imgData = canvas.toDataURL("image/png");

      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        alert("Please allow popups to print");
        return;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Organization Chart</title>
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              body {
                font-family: Arial, sans-serif;
                padding: 20px;
                background: white;
                display: flex;
                flex-direction: column;
                align-items: center;
              }
              h1 {
                text-align: center;
                margin-bottom: 20px;
                color: #111827;
              }
              img {
                max-width: 100%;
                height: auto;
              }
              @media print {
                @page {
                  size: landscape;
                  margin: 1cm;
                }
                body {
                  padding: 0;
                }
              }
            </style>
          </head>
          <body>
            <h1>Organizational Chart</h1>
            <img src="${imgData}" alt="Organization Chart" />
            <script>
              window.onload = function() {
                setTimeout(() => {
                  window.print();
                  window.onafterprint = function() {
                    window.close();
                  };
                }, 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (error) {
      console.error("Error printing:", error);
      alert("Failed to print: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  }, []);

  // Fit view
  const handleFitView = useCallback(() => {
    fitView({ padding: 0.2, duration: 800 });
  }, [fitView]);

  if (nodes.length === 0) {
    return (
      <div className="w-full h-[800px] border border-gray-200 rounded-lg bg-white flex items-center justify-center">
        <p className="text-gray-500">No organizational data available</p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          .org-chart-container {
            height: auto !important;
            min-height: 100vh;
          }
          .react-flow__controls,
          .react-flow__minimap,
          .react-flow__panel {
            display: none !important;
          }
          .react-flow__viewport {
            background: white !important;
          }
        }
      `}</style>
      <div className="w-full h-[800px] border border-gray-200 rounded-lg bg-white org-chart-container">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.1}
          maxZoom={2}
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        >
          <Background color="#f1f5f9" gap={16} />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              return "#3b82f6";
            }}
            maskColor="rgba(0, 0, 0, 0.1)"
          />
          <Panel position="top-right" className="flex gap-2 m-2">
            <button
              onClick={handleFitView}
              className="px-3 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
            >
              Fit View
            </button>
            <button
              onClick={exportToPDF}
              className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 shadow-sm"
            >
              Export PDF
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
            >
              Print
            </button>
          </Panel>
        </ReactFlow>
      </div>
    </>
  );
}

// Wrapper component with ReactFlowProvider
export default function OrgChartFlow(props: OrgChartFlowProps) {
  return (
    <ReactFlowProvider>
      <OrgChartFlowInner {...props} />
    </ReactFlowProvider>
  );
}
