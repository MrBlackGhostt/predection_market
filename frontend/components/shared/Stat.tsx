'use client';

import { FC, ReactNode } from 'react';

interface StatProps {
  label: string;
  value: string | number;
  className?: string;
}

export const Stat: FC<StatProps> = ({ label, value, className = '' }) => {
  return (
    <div className={`stat ${className}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value font-mono tabular-nums">{value}</div>
    </div>
  );
};
