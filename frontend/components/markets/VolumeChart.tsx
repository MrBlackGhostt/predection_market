'use client';

import { FC } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useMarketHistory } from '@/hooks/useMarketHistory';
import { PublicKey } from '@solana/web3.js';

interface VolumeChartProps {
  marketPubkey: PublicKey | undefined;
}

export const VolumeChart: FC<VolumeChartProps> = ({ marketPubkey }) => {
  const { data: history, isLoading } = useMarketHistory(marketPubkey);

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="animate-pulse flex space-x-2">
          <div className="h-2 w-2 bg-[var(--primary)] rounded-full"></div>
          <div className="h-2 w-2 bg-[var(--primary)] rounded-full animation-delay-200"></div>
          <div className="h-2 w-2 bg-[var(--primary)] rounded-full animation-delay-400"></div>
        </div>
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-[var(--text-secondary)]">
        <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" className="mb-2 opacity-50">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
        </svg>
        <p className="text-sm">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={history}>
          <defs>
            <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
          <XAxis 
            dataKey="formattedTime" 
            stroke="var(--text-secondary)" 
            fontSize={12} 
            tickLine={false}
            axisLine={false}
            minTickGap={30}
          />
          <YAxis 
            hide // Hide Y axis numbers for cleaner look
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'var(--bg-elevated)', 
              borderColor: 'var(--border)',
              borderRadius: '8px',
              color: 'var(--text)'
            }}
            itemStyle={{ color: 'var(--primary)' }}
            formatter={(value: number) => [`${value} txs`, 'Activity']}
            labelStyle={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}
          />
          <Area 
            type="monotone" 
            dataKey="count" 
            stroke="var(--primary)" 
            fillOpacity={1} 
            fill="url(#colorActivity)" 
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
