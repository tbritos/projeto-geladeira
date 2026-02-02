import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ children, className = "", title, subtitle, action }) => {
  return (
    <div className={`glass-card rounded-3xl p-6 relative overflow-hidden ${className}`}>
      {(title || action) && (
        <div className="flex justify-between items-start mb-6">
          <div>
            {title && <h3 className="text-lg font-semibold text-white tracking-tight">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-400 font-medium mt-1">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;