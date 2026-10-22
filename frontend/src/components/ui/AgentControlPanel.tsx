/**
 * AgentControlPanel Component.
 * Provides controls for triggering AI agents and displays their execution status.
 */

import { useAgentStore } from '@/store';
import { useAgentStream } from '@/hooks';
import { GlassPanel } from './GlassPanel';
import { cn } from '@/lib/utils';

export function AgentControlPanel() {
  const agentStatus = useAgentStore((state) => state.agentStatus);
  const currentAgent = useAgentStore((state) => state.currentAgent);
  const { triggerAgent } = useAgentStream({ userId: 'user-1' });

  const handleTriggerJobScraper = () => {
    triggerAgent('job_scraper', {
      query: 'Senior Software Engineer',
      location: 'Remote',
    });
  };

  const statusConfig = {
    idle: { color: 'text-slate-400', label: 'Idle' },
    running: { color: 'text-amber-400', label: 'Running...' },
    completed: { color: 'text-emerald-400', label: 'Completed' },
    failed: { color: 'text-red-400', label: 'Failed' },
  };

  const config = statusConfig[agentStatus];

  return (
    <GlassPanel padding="md" className="w-[300px] animate-slide-up">
      <h2 className="text-lg font-semibold text-slate-100 mb-4">Agent Control</h2>

      {/* Status Display */}
      <div className="mb-4 p-3 rounded-lg bg-slate-800/30 border border-slate-700/30">
        <div className="text-xs text-slate-400 mb-1">Status</div>
        <div className={cn('text-sm font-medium', config.color)}>
          {config.label}
          {currentAgent && ` (${currentAgent})`}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        <button
          onClick={handleTriggerJobScraper}
          disabled={agentStatus === 'running'}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          🤖 Run Job Scraper
        </button>

        <button
          onClick={() => triggerAgent('interview_prep', { job_id: 'sample-job-id' })}
          disabled={agentStatus === 'running'}
          className="w-full rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          📋 Interview Prep
        </button>
      </div>
    </GlassPanel>
  );
}