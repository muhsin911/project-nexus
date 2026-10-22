/**
 * GlassPanel Component.
 * Reusable glassmorphic container with backdrop blur and transparency.
 * Provides a modern, sleek aesthetic for UI overlays.
 */

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GlassPanelProps {
  children: ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  hover?: boolean;
}

export function GlassPanel({ 
  children, 
  className, 
  padding = 'md',
  hover = false 
}: GlassPanelProps) {
  const paddingClasses = {
    sm: 'p-3',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={cn(
        'rounded-2xl border border-glass-border bg-glass-bg backdrop-blur-xl shadow-2xl',
        paddingClasses[padding],
        hover && 'transition-all duration-300 hover:bg-glass-hover hover:border-slate-500/30',
        className
      )}
    >
      {children}
    </div>
  );
}