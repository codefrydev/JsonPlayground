import React from 'react';

interface PanelHeaderProps {
  title: string;
  status?: 'valid' | 'invalid' | 'neutral';
  statusText?: string;
  actions?: React.ReactNode;
}

const PanelHeader: React.FC<PanelHeaderProps> = ({
  title,
  status = 'neutral',
  statusText,
  actions,
}) => {
  const statusColors = {
    valid: 'text-success',
    invalid: 'text-destructive',
    neutral: 'text-muted-foreground',
  };

  return (
    <div className="panel-header">
      <div className="flex items-center gap-3">
        <span className="panel-title">{title}</span>
        {statusText && (
          <span className={`text-xs font-medium ${statusColors[status]}`}>
            {statusText}
          </span>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
};

export default PanelHeader;
