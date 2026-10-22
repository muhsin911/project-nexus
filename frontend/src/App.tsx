/**
 * Main Application Component.
 * Integrates the 3D WebGL scene with glassmorphic UI overlays.
 */

import { useEffect } from 'react';
import { Scene } from '@/components/3d';
import { ConnectionIndicator, ChatPanel, AgentControlPanel } from '@/components/ui';
import { useAgentStore } from '@/store';
import { useAgentStream } from '@/hooks';
import { NodeData } from '@/types/3d';

// Sample data for demonstration
const sampleNodes: NodeData[] = [
  {
    id: '1',
    type: 'skill',
    label: 'React',
    position: [0, 0, 0],
    color: '#61dafb',
  },
  {
    id: '2',
    type: 'skill',
    label: 'TypeScript',
    position: [3, 1, -2],
    color: '#3178c6',
  },
  {
    id: '3',
    type: 'project',
    label: 'Project NEXUS',
    position: [-4, -1, 3],
    color: '#a855f7',
  },
  {
    id: '4',
    type: 'experience',
    label: 'Senior Engineer',
    position: [2, -2, 4],
    color: '#10b981',
  },
];

function App() {
  const setNodes = useAgentStore((state) => state.setNodes);
  const setSelectedNode = useAgentStore((state) => state.setSelectedNode);
  const setHoveredNode = useAgentStore((state) => state.setHoveredNode);
  const { sendMessage, triggerAgent } = useAgentStream({ userId: 'user-1' });

  // Set initial nodes
  useEffect(() => {
    setNodes(sampleNodes);
  }, [setNodes]);

  const handleNodeClick = (id: string) => {
    setSelectedNode(id);
    console.log('Node clicked:', id);
  };

  const handleNodeHover = (id: string | null) => {
    setHoveredNode(id);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* 3D Scene (Background) */}
      <Scene
        nodes={sampleNodes}
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
      />

      {/* UI Overlays (Foreground) */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top-Left: Connection Status */}
        <div className="absolute top-4 left-4 pointer-events-auto">
          <ConnectionIndicator />
        </div>

        {/* Top-Right: Agent Control */}
        <div className="absolute top-4 right-4 pointer-events-auto">
          <AgentControlPanel onTriggerAgent={triggerAgent} />
        </div>

        {/* Bottom-Right: Chat Panel */}
        <div className="absolute bottom-4 right-4 pointer-events-auto">
          <ChatPanel onSendMessage={sendMessage} />
        </div>
      </div>
    </div>
  );
}

export default App;