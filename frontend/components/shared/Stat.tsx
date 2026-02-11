'use client';

import { FC, ReactNode } from 'react';

interface StatProps {
  label: string;
  value: string | number;
  subText?: string;
  valueColor?: string;
  className?: string;
}

export const Stat: FC<StatProps> = ({ label, value, subText, valueColor, className = '' }) => {
  return (
    <div className={`stat ${className}`}>
      <div className="stat-label">{label}</div>
      <div className={`stat-value font-mono tabular-nums ${valueColor || ''}`}>{value}</div>
      {subText && <div className="text-xs text-[var(--text-secondary)] mt-1">{subText}</div>}
    </div>
  );
};
