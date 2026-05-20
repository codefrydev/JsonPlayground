import React from 'react';

interface ClaimsTableProps {
  data: Record<string, unknown>;
  className?: string;
}

const ClaimsTable: React.FC<ClaimsTableProps> = ({ data, className = '' }) => {
  const entries = Object.entries(data);
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No claims</p>;
  }
  return (
    <table className={`w-full border-collapse text-sm ${className}`}>
      <thead>
        <tr>
          <th className="border border-border bg-muted/50 px-3 py-2 text-left font-medium text-foreground">
            Key
          </th>
          <th className="border border-border bg-muted/50 px-3 py-2 text-left font-medium text-foreground">
            Value
          </th>
        </tr>
      </thead>
      <tbody>
        {entries.map(([key, value]) => (
          <tr key={key}>
            <td className="border border-border px-3 py-1.5 font-medium text-foreground">{key}</td>
            <td className="border border-border px-3 py-1.5 text-muted-foreground">
              {typeof value === 'object' && value !== null
                ? JSON.stringify(value)
                : String(value ?? '')}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default ClaimsTable;
