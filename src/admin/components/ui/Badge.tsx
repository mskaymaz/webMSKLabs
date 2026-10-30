import React from 'react';

interface BadgeProps {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'primary',
  children,
  className = '',
  style
}) => {
  return (
    <span className={`badge badge-${variant} ${className}`} style={style}>
      {children}
    </span>
  );
};
