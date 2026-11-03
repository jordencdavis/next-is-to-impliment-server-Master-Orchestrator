import React from 'react';
import { 
  Play, 
  ExternalLink, 
  Copy, 
  Trash2, 
  X, 
  Activity, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Wrench,
  AppWindow,
  FolderGit2,
  Database,
  StickyNote,
  Kanban,
  Zap,
  ArrowRight,
  Palette,
  Type,
  Check
} from 'lucide-react';
import { CanvasNode, NodeStatus, NodeType } from '../types/orchestrator';

interface OverheadActionBarProps {
  selectedNode: CanvasNode | null;
  onRunNode: (nodeId: string) => void;
  onOpenNodeInspector: (node: CanvasNode) => void;
  onDuplicateNode: (nodeId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onDeselect: () => void;
  onStartConnectFromNode: (nodeId: string) => void;
  onUpdateNode?: (node: CanvasNode) => void;
}

const ACTION_BAR_COLORS = [
  '#871201', '#C61B31', '#DB3A31', '#DF9C56',
  '#F8EBE8', '#AFD1C2', '#709654', '#3B5D37',
  '#1F3E22', '#FFFFFF', '#2563EB', '#9333EA'
];

export const OverheadActionBar: React.FC<OverheadActionBarProps> = ({
  selectedNode,
  onRunNode,
  onOpenNodeInspector,
  onDuplicateNode,
  onDeleteNode,
  onDeselect,
  onStartConnectFromNode,
  onUpdateNode,
}) => {
  const [showColorPopover, setShowColorPopover] = React.useState(false);
  const [showFontPopover, setShowFontPopover] = React.useState(false);
  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [titleDraft, setTitleDraft] = React.useState(selectedNode?.title || '');
  const [isEditingSN, setIsEditingSN] = React.useState(false);
  const [snDraft, setSnDraft] = React.useState(selectedNode?.serialNumber || '');

  React.useEffect(() => {
    if (selectedNode) {
      setTitleDraft(selectedNode.title);
      setSnDraft(selectedNode.serialNumber || '');
    }
  }, [selectedNode?.title, selectedNode?.serialNumber]);

  const handleSaveSN = () => {
    if (!selectedNode) return;
    const trimmed = snDraft.trim();
    if (trimmed && trimmed !== selectedNode.serialNumber && onUpdateNode) {
      onUpdateNode({ ...selectedNode, serialNumber: trimmed });
    } else {
      setSnDraft(selectedNode.serialNumber || '');
    }
    setIsEditingSN(false);
  };

  const handleSaveTitle = () => {
    if (!selectedNode) return;
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== selectedNode.title && onUpdateNode) {
      onUpdateNode({ ...selectedNode, title: trimmed });
    } else {
      setTitleDraft(selectedNode.title);
    }
    setIsEditingTitle(false);
  };

  if (!selectedNode) return null;

  const isRunning = selectedNode.status === 'running';

  const getNodeIcon = (type: NodeType) => {
    switch (type) {
      case 'tool': return <Wrench className="w-4 h-4 text-amber-500" />;
      case 'app': return <AppWindow className="w-4 h-4 text-indigo-500" />;
      case 'project': return <FolderGit2 className="w-4 h-4 text-violet-500" />;
      case 'resource': return <Database className="w-4 h-4 text-emerald-500" />;
      case 'note': return <StickyNote className="w-4 h-4 text-yellow-500" />;
      case 'kanban': return <Kanban className="w-4 h-4 text-cyan-500" />;
      default: return <Activity className="w-4 h-4 text-slate-500" />;
    }
  };

  const getStatusBadge = (status: NodeStatus) => {
    switch (status) {
      case 'running':
        return (
          <span className="flex items-center gap-1.5 text-xs text-sky-600 dark:text-sky-400 font-medium">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Executing</span>
          </span>
        );
      case 'success':
        return (
          <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Nominal</span>
          </span>
        );
      case 'error':
        return (
          <span className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Alert</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <Activity className="w-3.5 h-3.5" />
            <span>Ready</span>
          </span>
        );
    }
  };

  const getNodeTypeStyle = (type: NodeType) => {
    switch (type) {
      case 'tool':
        return {
          iconWrap: 'bg-[#DF9C56]/20 border border-[#DF9C56]/40 text-[#871201] dark:text-[#DF9C56]',
          badge: 'text-[#871201] dark:text-[#DF9C56] bg-[#DF9C56]/20 border border-[#DF9C56]/40',
        };
      case 'app':
        return {
          iconWrap: 'bg-[#C61B31]/15 border border-[#C61B31]/40 text-[#C61B31]',
          badge: 'text-[#C61B31] bg-[#C61B31]/15 border border-[#C61B31]/40',
        };
      case 'project':
        return {
          iconWrap: 'bg-[#DB3A31]/15 border border-[#DB3A31]/40 text-[#DB3A31]',
          badge: 'text-[#871201] dark:text-[#DB3A31] bg-[#DB3A31]/15 border border-[#DB3A31]/40',
        };
      case 'resource':
        return {
          iconWrap: 'bg-[#3B5D37]/20 border border-[#3B5D37]/40 text-[#3B5D37] dark:text-[#AFD1C2]',
          badge: 'text-[#3B5D37] dark:text-[#AFD1C2] bg-[#3B5D37]/20 border border-[#3B5D37]/40',
        };
      case 'kanban':
        return {
          iconWrap: 'bg-[#709654]/20 border border-[#709654]/40 text-[#709654] dark:text-[#AFD1C2]',
          badge: 'text-[#709654] dark:text-[#AFD1C2] bg-[#709654]/20 border border-[#709654]/40',
        };
      case 'note':
      default:
        return {
          iconWrap: 'bg-[#DF9C56]/20 border border-[#DF9C56]/40 text-[#DF9C56]',
          badge: 'text-[#1F3E22] dark:text-[#AFD1C2] bg-[#AFD1C2]/30',
        };
    }
  };

  const typeStyle = getNodeTypeStyle(selectedNode.type);

  const getNodeAccentColor = (type: NodeType) => {
    switch (type) {
      case 'tool': return '#DF9C56';
      case 'app': return '#C61B31';
      case 'project': return '#DB3A31';
      case 'resource': return '#3B5D37';
      case 'kanban': return '#709654';
      default: return '#AFD1C2';
    }
  };

  const accentColor = selectedNode.customColor || getNodeAccentColor(selectedNode.type);

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 select-none animate-in fade-in slide-in-from-top-3 duration-200 overflow-visible">
      <div 
        style={{ borderColor: accentColor, backgroundColor: '#ffffff' }}
        className="flex items-center gap-3 px-4 py-2.5 backdrop-blur-md rounded-2xl border-2 shadow-2xl shadow-black/25 relative overflow-visible"
      >
        {/* Top Signature Accent Bar */}
        <div 
          style={{ backgroundColor: accentColor }}
          className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl pointer-events-none"
        />

        {/* Node Identity Zone */}
        <div className="flex items-center gap-2.5 pr-3 border-r border-[#709654]/30 dark:border-[#3B5D37]/70">
          <div className={`p-1.5 rounded-lg ${typeStyle.iconWrap}`}>
            {getNodeIcon(selectedNode.type)}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              {isEditingSN ? (
                <input
                  type="text"
                  value={snDraft}
                  onChange={(e) => setSnDraft(e.target.value)}
                  onBlur={handleSaveSN}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') handleSaveSN();
                    if (e.key === 'Escape') setIsEditingSN(false);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                  className="text-[10px] font-mono font-extrabold bg-amber-100 text-amber-900 px-1 py-0.5 rounded border border-[#DF9C56] outline-none w-16 shrink-0"
                />
              ) : (
                <span
                  onDoubleClick={() => {
                    setIsEditingSN(true);
                    setSnDraft(selectedNode.serialNumber || 'SN-01');
                  }}
                  className="text-[10px] font-mono font-extrabold px-1.5 py-0.5 rounded bg-[#DF9C56]/25 text-[#871201] dark:text-[#DF9C56] border border-[#DF9C56]/40 shrink-0 cursor-text hover:underline"
                  title="Double click to edit serial number"
                >
                  {selectedNode.serialNumber || 'SN-01'}
                </span>
              )}

              {isEditingTitle ? (
                <input
                  type="text"
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={handleSaveTitle}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') handleSaveTitle();
                    if (e.key === 'Escape') {
                      setTitleDraft(selectedNode.title);
                      setIsEditingTitle(false);
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                  className="text-xs font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-1 py-0.5 rounded border border-[#DF9C56] outline-none max-w-[180px]"
                />
              ) : (
                <span 
                  className="text-xs font-bold text-[#1F3E22] dark:text-[#F8EBE8] max-w-[200px] truncate cursor-text hover:underline decoration-dashed"
                  onDoubleClick={() => setIsEditingTitle(true)}
                  title="Double click to edit name"
                >
                  {selectedNode.title}
                </span>
              )}
              <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded tracking-wider ${typeStyle.badge}`}>
                {selectedNode.type}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {getStatusBadge(selectedNode.status)}
              {selectedNode.lastExecutedAt && (
                <>
                  <span className="text-[#709654]/40" aria-hidden="true">·</span>
                  <span className="text-[10px] text-[#709654] dark:text-[#AFD1C2] font-mono">
                    Last: {selectedNode.lastExecutedAt}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Primary Required Actions: Run / Open */}
        <div className="flex items-center gap-2">
          {/* Run Action */}
          <button
            onClick={() => onRunNode(selectedNode.id)}
            disabled={isRunning}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all shadow-xs ${
              isRunning
                ? 'bg-[#DF9C56]/30 text-[#871201] dark:text-[#DF9C56] cursor-not-allowed'
                : 'bg-[#3B5D37] hover:bg-[#1F3E22] text-[#F8EBE8] active:scale-98'
            }`}
            title="Execute workflow step, run tool, or poll status"
          >
            {isRunning ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>{isRunning ? 'Running...' : 'Run'}</span>
          </button>

          {/* Open / Inspect Action */}
          <button
            onClick={() => onOpenNodeInspector(selectedNode)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-[#1F3E22] dark:text-[#F8EBE8] bg-[#F8EBE8] dark:bg-[#152717] hover:bg-[#709654]/15 rounded-lg transition-colors border border-[#709654]/50 shadow-xs"
            title="Open configuration, logs, and properties"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#709654] dark:text-[#AFD1C2]" />
            <span>Open</span>
          </button>
        </div>

        {/* Quick Format Actions: Color Palette & Font Size */}
        {onUpdateNode && (
          <div className="flex items-center gap-1.5 pl-2 border-l border-[#709654]/30 dark:border-[#3B5D37]/70">
            {/* Color Palette */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowColorPopover(!showColorPopover);
                  setShowFontPopover(false);
                }}
                className={`p-1.5 rounded-lg border flex items-center gap-1 text-xs transition-colors ${
                  showColorPopover
                    ? 'border-[#871201] bg-[#DF9C56]/20'
                    : 'border-[#709654]/30 hover:bg-black/5 dark:hover:bg-white/10'
                }`}
                title="Colour palette for this item"
              >
                <Palette className="w-3.5 h-3.5" />
                <span
                  className="w-2.5 h-2.5 rounded-full border border-black/20"
                  style={{ backgroundColor: selectedNode.customColor || accentColor }}
                />
              </button>

              {showColorPopover && (
                <>
                  <div
                    className="fixed inset-0 z-50 cursor-default"
                    onClick={() => setShowColorPopover(false)}
                  />
                  <div className="absolute top-full mt-2 left-0 p-2.5 bg-white dark:bg-[#182E1A] rounded-xl border border-[#709654]/40 shadow-2xl w-52 z-[60]">
                    <div className="grid grid-cols-4 gap-1.5">
                      {ACTION_BAR_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => {
                            onUpdateNode({ ...selectedNode, customColor: c });
                          }}
                          style={{ backgroundColor: c }}
                          className="h-6 rounded border border-black/15 flex items-center justify-center hover:scale-110 transition-transform cursor-pointer"
                        >
                          {selectedNode.customColor === c && (
                            <Check className={`w-3 h-3 ${c === '#FFFFFF' || c === '#F8EBE8' || c === '#AFD1C2' ? 'text-black' : 'text-white'}`} />
                          )}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        onUpdateNode({ ...selectedNode, customColor: undefined });
                      }}
                      className="w-full mt-1.5 text-[10px] text-[#709654] hover:text-[#1F3E22] py-0.5 border rounded cursor-pointer"
                    >
                      Reset Color
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Font Size */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowFontPopover(!showFontPopover);
                  setShowColorPopover(false);
                }}
                className={`px-2 py-1 rounded-lg border flex items-center gap-1 text-xs font-mono font-bold transition-colors cursor-pointer ${
                  showFontPopover
                    ? 'border-[#871201] bg-[#DF9C56]/20'
                    : 'border-[#709654]/30 hover:bg-black/5 dark:hover:bg-white/10'
                }`}
                title="Font size for this item"
              >
                <Type className="w-3.5 h-3.5" />
                <span>{selectedNode.fontSize || 14}px</span>
              </button>

              {showFontPopover && (
                <>
                  <div
                    className="fixed inset-0 z-50 cursor-default"
                    onClick={() => setShowFontPopover(false)}
                  />
                  <div className="absolute top-full mt-2 left-0 p-2.5 bg-white dark:bg-[#182E1A] rounded-xl border border-[#709654]/40 shadow-2xl w-44 z-[60]">
                    <div className="flex items-center justify-between pb-1 mb-1.5 border-b text-[11px] font-bold">
                      <span>Font Size</span>
                      <span className="font-mono">{selectedNode.fontSize || 14}px</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {[11, 12, 14, 16, 18, 20].map((sz) => (
                        <button
                          key={sz}
                          onClick={() => {
                            onUpdateNode({ ...selectedNode, fontSize: sz });
                          }}
                          className={`py-1 text-[10px] font-mono rounded border cursor-pointer ${
                            (selectedNode.fontSize || 14) === sz
                              ? 'bg-[#3B5D37] text-white font-bold'
                              : 'hover:bg-black/5'
                          }`}
                        >
                          {sz}px
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Secondary Contextual Actions */}
        <div className="flex items-center gap-1 pl-2 border-l border-[#709654]/30 dark:border-[#3B5D37]/70 text-[#709654] dark:text-[#AFD1C2]">
          <button
            onClick={() => onStartConnectFromNode(selectedNode.id)}
            className="p-1.5 hover:text-[#1F3E22] dark:hover:text-[#F8EBE8] hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors"
            title="Draw relationship connector"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => onDuplicateNode(selectedNode.id)}
            className="p-1.5 hover:text-[#1F3E22] dark:hover:text-[#F8EBE8] hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors"
            title="Duplicate node"
          >
            <Copy className="w-4 h-4" />
          </button>

          <button
            onClick={() => onDeleteNode(selectedNode.id)}
            className="p-1.5 hover:text-[#C61B31] dark:hover:text-[#C61B31] hover:bg-[#C61B31]/10 rounded-lg transition-colors"
            title="Delete node (Del / Backspace)"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={onDeselect}
            className="p-1.5 hover:text-[#1F3E22] dark:hover:text-[#F8EBE8] hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors ml-1"
            title="Deselect (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
