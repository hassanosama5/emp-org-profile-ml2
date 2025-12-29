import React from 'react';

interface OrganizationChartProps {
  data: any;
}

export const OrganizationChart: React.FC<OrganizationChartProps> = ({ data }) => {
  // Intentionally introduce an error by trying to access a non-existent property
  const erroneousValue = data.nonExistentProperty.anotherProperty;

  return (
    <div className="organization-chart">
      <h2>Organization Chart</h2>
      <p>This component is intentionally broken.</p>
      <p>{erroneousValue}</p>
    </div>
  );
};
