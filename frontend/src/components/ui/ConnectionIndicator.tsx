/**
 * ConnectionIndicator Component.
 * Displays real-time WebSocket connection status with animated visual feedback.
 */

import { useAgentStore } from '@/store';
import { GlassPanel } from './GlassPanel';
import { cn } from '@/lib/utils';

export function ConnectionIndicator() {
  const connectionStatus = useAgentStore((state) => state.connectionStatus);

  const statusConfig = {
    connected: {
      color: 'bg-emerald-500',
      label: 'Connected',
      pulse: true,
    },
    connecting: {
      color: 'bg-amber-500',
      label: 'Connecting...',
      pulse: true,
    },
    disconnected: {
      color: 'bg-slate-500',
      label: 'Disconnected',
      pulse: false,
    },
    error: {
      color: 'bg-red-500',
      label: 'Connection Error',
      pulse: false,
    },
  };

  const config = statusConfig[connectionStatus];

  return (
    <GlassPanel padding="sm" className="flex items-center gap-2 animate-fade-in">
      <div className="relative">
        <div className={cn('h-2 w-2 rounded-full', config.color)} />
        {config.pulse && (
          <div
            className={cn(
              'absolute inset-0 h-2 w-2 rounded-full animate-ping',
              config.color,
              'opacity-75'
            )}
          />
        )}
      </div>
      <span className="text-xs font-medium text-slate-300">{config.label}</span>
    </GlassPanel>
  );
}