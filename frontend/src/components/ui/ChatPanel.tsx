/**
 * ChatPanel Component.
 * Main chat interface for AI agent interaction.
 * Displays message history and provides input for user messages.
 */

import { useState, useRef, useEffect } from 'react';
import { useAgentStore } from '@/store';
import { useAgentStream } from '@/hooks';
import { GlassPanel } from './GlassPanel';
import { cn } from '@/lib/utils';

export function ChatPanel() {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const messages = useAgentStore((state) => state.messages);
  const { sendMessage } = useAgentStream({ userId: 'user-1' });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim()) return;

    sendMessage({
      role: 'user',
      content: inputValue,
    });

    setInputValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <GlassPanel padding="lg" className="flex flex-col h-[600px] w-[400px] animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-100">AI Assistant</h2>
        <div className="text-xs text-slate-400">{messages.length} messages</div>
      </div>

      {/* Message History */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500 text-sm">
            Start a conversation...
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'rounded-lg p-3 text-sm animate-fade-in',
                  message.role === 'user'
                    ? 'bg-indigo-600/20 border border-indigo-500/30 ml-8'
                    : message.role === 'system'
                    ? 'bg-slate-700/30 border border-slate-600/30'
                    : 'bg-slate-800/50 border border-slate-700/30 mr-8'
                )}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <div className="text-xs text-slate-400 mb-1 capitalize">
                      {message.role}
                    </div>
                    <div className="text-slate-200 whitespace-pre-wrap">
                      {message.content}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          className="flex-1 rounded-lg bg-slate-800/50 border border-slate-700/50 px-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
        />
        <button
          onClick={handleSend}
          disabled={!inputValue.trim()}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Send
        </button>
      </div>
    </GlassPanel>
  );
}