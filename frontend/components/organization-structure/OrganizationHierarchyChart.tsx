'use client';

import React, { useState } from 'react';
import { Department, Position } from '../../lib/api/organization-structure/org-structure-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/Card';

interface OrganizationHierarchyChartProps {
  departments: Department[];
  positions: Position[];
}

const OrganizationHierarchyChart: React.FC<OrganizationHierarchyChartProps> = ({ departments, positions }) => {
  const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set());
  const [expandedPositions, setExpandedPositions] = useState<Set<string>>(new Set());

  const toggleDepartment = (id: string) => {
    setExpandedDepartments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const togglePosition = (id: string) => {
    setExpandedPositions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const renderPosition = (position: Position) => {
    const isExpanded = expandedPositions.has(position._id);
    const subordinates = positions.filter(sub => sub.reportsToPositionId === position._id);

    return (
      <div key={position._id} className="relative ml-8 pl-4 border-l-2 border-gray-300">
        <div className="absolute -left-2 top-0 h-4 w-4 border-b-2 border-l-2 border-gray-300 rounded-bl-lg"></div>
        <div onClick={() => togglePosition(position._id)} className="bg-gray-50 cursor-pointer">
          <Card className="my-2">
            <CardHeader>
              <CardTitle>{position.title} ({position.code})</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Department: {departments.find(dept => dept._id === position.departmentId)?.name}</p>
              {position.reportsToPositionId && (
                <p className="text-sm text-gray-600">Reports To: {positions.find(p => p._id === position.reportsToPositionId)?.title}</p>
              )}
              {subordinates.length > 0 && (
                <span className="text-blue-500 text-sm">[{isExpanded ? 'Collapse' : 'Expand'} subordinates]</span>
              )}
            </CardContent>
          </Card>
        </div>
        {isExpanded && subordinates.length > 0 && (
          <div className="ml-4">
            {subordinates.map(sub => renderPosition(sub))}
          </div>
        )}
      </div>
    );
  };

  const renderDepartment = (dept: Department) => {
    const isExpanded = expandedDepartments.has(dept._id);
    const positionsInDepartment = positions.filter(pos => pos.departmentId === dept._id && !pos.reportsToPositionId);
    const hasChildren = positionsInDepartment.length > 0 || departments.some(childDept => {
      // This is a simplified check for sub-departments or linked structures
      // A more robust hierarchy model would be beneficial for exact parent-child dept relationships
      return positions.some(pos => pos.departmentId === childDept._id && pos.reportsToPositionId === dept.headPositionId);
    });

    return (
      <div key={dept._id} className="relative ml-4 pl-4 border-l-2 border-gray-300">
        <div className="absolute -left-2 top-0 h-4 w-4 border-b-2 border-l-2 border-gray-300 rounded-bl-lg"></div>
        <div onClick={() => toggleDepartment(dept._id)} className="cursor-pointer">
          <Card className="my-2">
            <CardHeader>
              <CardTitle>{dept.name} ({dept.code})</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Head: {positions.find(pos => pos._id === dept.headPositionId)?.title || 'N/A'}</p>
              {hasChildren && (
                <span className="text-blue-500 text-sm">[{isExpanded ? 'Collapse' : 'Expand'}]</span>
              )}
            </CardContent>
          </Card>
        </div>
        {isExpanded && hasChildren && (
          <div className="ml-4">
            {positionsInDepartment.map(pos => renderPosition(pos))}
            {/* Future: Render sub-departments or other linked structures here if the hierarchy model supports it */}
          </div>
        )}
      </div>
    );
  };

  const topLevelDepartments = departments.filter(dept => {
    // A department is top-level if no position in it reports to an external position
    // or it's not a sub-department (this might need refining based on actual backend hierarchy logic)
    return !positions.some(pos => pos.departmentId === dept._id && pos.reportsToPositionId);
  });

  return (
    <div className="organization-hierarchy-chart p-4">
      <h2 className="text-xl font-bold mb-4">Overall Organization Structure</h2>
      <div className="relative">
        {topLevelDepartments.length > 0 ? (
          topLevelDepartments.map(dept => renderDepartment(dept))
        ) : (
          <p>No organizational structure to display.</p>
        )}
      </div>
    </div>
  );
};

export default OrganizationHierarchyChart;
