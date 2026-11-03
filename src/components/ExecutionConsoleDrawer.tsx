import React, { useState } from 'react';
import { ExecutionLog } from '../types/orchestrator';
import { 
  Terminal, 
  Trash2, 
  X, 
  ChevronUp, 
  ChevronDown, 
  CheckCircle2, 
  AlertCircle, 
  Info,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface ExecutionConsoleDrawerProps {
  logs: ExecutionLog[];
  isOpen: boolean;
  onClose: () => void;
  onClearLogs: () => void;
}

export const ExecutionConsoleDrawer: React.FC<ExecutionConsoleDrawerProps> = ({
  logs,
  isOpen,
  onClose,
  onClearLogs,
}) => {
  const [filter, setFilter] = useState<string>('all');
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isOpen) return null;

  const filteredLogs = logs.filter((log) => {
    if (filter === 'all') return true;
    return log.level === filter;
  });

  const getLogBadge = (level: string) => {
    switch (level) {
      case 'success':
        return <CheckCircle2 className="w-3.5 h-3.5 text-[#AFD1C2] shrink-0 mt-0.5" />;
      case 'error':
        return <AlertCircle className="w-3.5 h-3.5 text-[#C61B31] shrink-0 mt-0.5" />;
      case 'warn':
        return <AlertCircle className="w-3.5 h-3.5 text-[#DF9C56] shrink-0 mt-0.5" />;
      default:
        return <Info className="w-3.5 h-3.5 text-[#709654] shrink-0 mt-0.5" />;
    }
  };

  return (
    <div
      className={`fixed bottom-0 right-0 z-40 bg-[#152717] text-[#F8EBE8] border-t border-[#3B5D37] shadow-2xl flex flex-col font-mono text-xs transition-all ${
        isExpanded ? 'h-96' : 'h-56'
      } left-0 md:left-72`}
    >
      {/* Console Header Bar */}
      <div className="h-9 px-4 bg-[#1F3E22] border-b border-[#3B5D37] flex items-center justify-between select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[#AFD1C2] font-semibold text-xs">
            <Terminal className="w-3.5 h-3.5 text-[#DF9C56]" />
            <span>Execution Orchestrator Logs</span>
          </div>
          <span className="text-[11px] text-[#AFD1C2]/60 tabular-nums">
            ({logs.length} entries)
          </span>

          {/* Level Filter */}
          <div className="flex items-center gap-1 ml-4 text-[10px]">
            {['all', 'info', 'success', 'warn', 'error'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setFilter(lvl)}
                className={`px-2 py-0.5 rounded capitalize transition-colors ${
                  filter === lvl
                    ? 'bg-[#3B5D37] text-[#F8EBE8] font-medium shadow-xs'
                    : 'text-[#AFD1C2]/70 hover:text-[#F8EBE8] hover:bg-[#3B5D37]/40'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onClearLogs}
            className="p-1 text-[#AFD1C2]/70 hover:text-[#F8EBE8] hover:bg-[#3B5D37] rounded transition-colors"
            title="Clear Console Output"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-[#AFD1C2]/70 hover:text-[#F8EBE8] hover:bg-[#3B5D37] rounded transition-colors"
            title={isExpanded ? 'Minimize' : 'Maximize'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="p-1 text-[#AFD1C2]/70 hover:text-[#F8EBE8] hover:bg-[#3B5D37] rounded transition-colors"
            title="Close Drawer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Console Output Log Stream */}
      <div className="flex-1 p-3 overflow-y-auto space-y-1.5 select-text bg-[#152717]">
        {filteredLogs.length === 0 ? (
          <div className="text-[#AFD1C2]/40 italic py-4 text-center">
            No execution events recorded. Click "Run" on any node to initiate execution.
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-2 text-[11px] leading-relaxed hover:bg-[#1F3E22]/60 px-1.5 py-0.5 rounded transition-colors"
            >
              <span className="text-[#AFD1C2]/50 text-[10px] tabular-nums shrink-0">
                [{log.timestamp}]
              </span>
              {getLogBadge(log.level)}
              <span className="text-[#DF9C56] font-semibold shrink-0">
                {log.nodeTitle}:
              </span>
              <span className="text-[#F8EBE8]/90 break-all">
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
