import React, { useState } from 'react';
import { CanvasBoard } from '../types/orchestrator';
import { 
  X, 
  Layers, 
  Network, 
  Kanban, 
  GitBranch, 
  FolderPlus,
  Sparkles
} from 'lucide-react';

interface BoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateBoard: (board: CanvasBoard) => void;
  existingBoards?: CanvasBoard[];
}

export const BoardModal: React.FC<BoardModalProps> = ({
  isOpen,
  onClose,
  onCreateBoard,
  existingBoards = [],
}) => {
  const [name, setName] = useState('( NEW )');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('Network');
  const [template, setTemplate] = useState<'blank' | 'microservices' | 'sprint' | 'pipeline'>('blank');

  React.useEffect(() => {
    if (isOpen) {
      let defaultName = '( NEW )';
      const nameExists = (n: string) =>
        existingBoards.some((b) => b.name.trim().toLowerCase() === n.trim().toLowerCase());
      if (nameExists(defaultName)) {
        let count = 2;
        while (nameExists(`( NEW ) ${count}`)) {
          count++;
        }
        defaultName = `( NEW ) ${count}`;
      }
      setName(defaultName);
      setDescription('');
      setIcon('Network');
      setTemplate('blank');
    }
  }, [isOpen, existingBoards]);

  if (!isOpen) return null;

  const trimmedName = name.trim();
  const isDuplicate = existingBoards.some(
    (b) => b.name.trim().toLowerCase() === trimmedName.toLowerCase()
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isDuplicate) return;
    const finalName = trimmedName || '( NEW )';

    let initialNodes: CanvasBoard['nodes'] = [];
    let initialConnectors: CanvasBoard['connectors'] = [];

    if (template === 'microservices') {
      initialNodes = [
        {
          id: `node-${Date.now()}-1`,
          title: 'Edge Gateway API',
          type: 'app' as const,
          x: 100,
          y: 120,
          status: 'idle' as const,
          endpoint: 'https://gateway.internal.io',
          tags: ['edge', 'api'],
        },
        {
          id: `node-${Date.now()}-2`,
          title: 'Primary DB Cluster',
          type: 'resource' as const,
          x: 460,
          y: 120,
          status: 'idle' as const,
          endpoint: 'postgres://db:5432/main',
          tags: ['db', 'postgres'],
        },
      ];
      initialConnectors = [
        {
          id: `conn-${Date.now()}-1`,
          sourceId: initialNodes[0].id,
          targetId: initialNodes[1].id,
          sourceHandle: 'right' as const,
          targetHandle: 'left' as const,
          type: 'dependency' as const,
          label: 'Reads/Writes',
        },
      ];
    } else if (template === 'sprint') {
      initialNodes = [
        {
          id: `node-${Date.now()}-k`,
          title: 'Sprint Tracking Board',
          type: 'kanban' as const,
          x: 120,
          y: 100,
          width: 680,
          status: 'idle' as const,
          kanbanColumns: [
            { id: 'c-todo', title: 'Planned', cards: [{ id: 'cd-1', title: 'Scope architectural boundary', tag: 'Core', priority: 'high' as const, assignee: 'Tech Lead' }] },
            { id: 'c-prog', title: 'In Progress', cards: [{ id: 'cd-2', title: 'Wire connector lines', tag: 'Frontend', priority: 'medium' as const, assignee: 'Dev' }] },
            { id: 'c-done', title: 'Shipped', cards: [{ id: 'cd-3', title: 'Organizer tree component', tag: 'UI', priority: 'low' as const, assignee: 'Dev' }] },
          ],
        },
      ];
    } else if (template === 'pipeline') {
      initialNodes = [
        {
          id: `node-${Date.now()}-t1`,
          title: 'Test & Code Lint',
          type: 'tool' as const,
          x: 100,
          y: 140,
          status: 'idle' as const,
          command: 'npm run lint && npm test',
          tags: ['ci'],
        },
        {
          id: `node-${Date.now()}-t2`,
          title: 'Container Packager',
          type: 'tool' as const,
          x: 480,
          y: 140,
          status: 'idle' as const,
          command: 'docker build -t app:latest .',
          tags: ['cd'],
        },
      ];
      initialConnectors = [
        {
          id: `conn-${Date.now()}-p`,
          sourceId: initialNodes[0].id,
          targetId: initialNodes[1].id,
          sourceHandle: 'right' as const,
          targetHandle: 'left' as const,
          type: 'trigger' as const,
          label: 'On Green Tests',
        },
      ];
    }

    const newBoard: CanvasBoard = {
      id: `board-${Date.now()}`,
      name: finalName,
      description: description.trim() || 'Independent visual board view',
      icon,
      updatedAt: 'Just created',
      pan: { x: 50, y: 50 },
      zoom: 1,
      nodes: initialNodes,
      connectors: initialConnectors,
    };

    onCreateBoard(newBoard);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs select-none">
      <div 
        className="w-full max-w-md bg-[#F8EBE8] dark:bg-[#1F3E22] rounded-2xl border border-[#709654]/30 dark:border-[#3B5D37] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-[#1F3E22] dark:text-[#F8EBE8]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[#709654]/25 dark:border-[#3B5D37]/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#3B5D37]/20 text-[#3B5D37] dark:text-[#AFD1C2] border border-[#3B5D37]/40">
              <FolderPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1F3E22] dark:text-[#F8EBE8]">
                Create New Visual Board
              </h3>
              <p className="text-[11px] text-[#709654] dark:text-[#AFD1C2]">
                Independent workspace canvas view
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#709654] hover:text-[#1F3E22] dark:hover:text-[#F8EBE8] rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="text-[11px] font-semibold text-[#1F3E22] dark:text-[#F8EBE8] block mb-1">
              Board Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. ( NEW ), Mobile Architecture"
              className={`w-full px-3 py-2 bg-[#EEDFD8] dark:bg-[#182E1A] border rounded-lg text-[#1F3E22] dark:text-[#F8EBE8] focus:outline-none ${
                isDuplicate
                  ? 'border-[#DB3A31] focus:border-[#DB3A31] ring-1 ring-[#DB3A31]/30'
                  : 'border-[#709654]/30 focus:border-[#DF9C56]'
              }`}
            />
            {isDuplicate && (
              <p className="text-[11px] font-semibold text-[#DB3A31] mt-1.5 flex items-center gap-1">
                <span>⚠️ A canvas with this name already exists. Choose a unique name.</span>
              </p>
            )}
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[#1F3E22] dark:text-[#F8EBE8] block mb-1">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Workspace purpose and team scope..."
              className="w-full px-3 py-2 bg-[#EEDFD8] dark:bg-[#182E1A] border border-[#709654]/30 rounded-lg text-[#1F3E22] dark:text-[#F8EBE8] focus:outline-none focus:border-[#DF9C56]"
            />
          </div>

          {/* Template Choice */}
          <div>
            <label className="text-[11px] font-semibold text-[#1F3E22] dark:text-[#F8EBE8] block mb-1.5">
              Starter Template
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'blank', title: '( NEW ) Canvas', desc: 'Empty canvas workspace' },
                { id: 'microservices', title: 'Microservices', desc: 'Edge gateway & DB' },
                { id: 'sprint', title: 'Sprint Kanban', desc: 'Board with cards' },
                { id: 'pipeline', title: 'CI/CD Pipeline', desc: 'Test & Docker runner' },
              ].map((t) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => setTemplate(t.id as any)}
                  className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                    template === t.id
                      ? 'border-[#871201] bg-[#DF9C56]/20 text-[#871201] dark:text-[#DF9C56] shadow-xs font-semibold'
                      : 'border-[#709654]/30 text-[#1F3E22]/80 dark:text-[#F8EBE8]/80 hover:bg-[#709654]/10'
                  }`}
                >
                  <div className="font-semibold text-xs">{t.title}</div>
                  <div className="text-[10px] text-[#709654] dark:text-[#AFD1C2] mt-0.5">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Icon Selection */}
          <div>
            <label className="text-[11px] font-semibold text-[#1F3E22] dark:text-[#F8EBE8] block mb-1.5">
              Board Icon
            </label>
            <div className="flex items-center gap-2">
              {[
                { name: 'Network', icon: <Network className="w-4 h-4" /> },
                { name: 'Kanban', icon: <Kanban className="w-4 h-4" /> },
                { name: 'Layers', icon: <Layers className="w-4 h-4" /> },
                { name: 'GitBranch', icon: <GitBranch className="w-4 h-4" /> },
              ].map((ic) => (
                <button
                  type="button"
                  key={ic.name}
                  onClick={() => setIcon(ic.name)}
                  className={`p-2 rounded-lg border transition-all cursor-pointer ${
                    icon === ic.name
                      ? 'border-[#871201] bg-[#DF9C56]/20 text-[#871201] dark:text-[#DF9C56] shadow-xs'
                      : 'border-[#709654]/30 text-[#709654] dark:text-[#AFD1C2] hover:bg-[#709654]/10'
                  }`}
                >
                  {ic.icon}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-[#709654]/25 dark:border-[#3B5D37]/50 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-[#709654] hover:text-[#1F3E22] dark:hover:text-[#F8EBE8] rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isDuplicate || !trimmedName}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors shadow-xs ${
                isDuplicate || !trimmedName
                  ? 'bg-gray-400 opacity-60 cursor-not-allowed text-white'
                  : 'text-[#F8EBE8] bg-[#3B5D37] hover:bg-[#1F3E22] cursor-pointer'
              }`}
            >
              Create Board
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
