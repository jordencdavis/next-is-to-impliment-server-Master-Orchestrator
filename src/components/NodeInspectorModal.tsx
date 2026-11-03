import React, { useState } from 'react';
import { 
  CanvasNode, 
  NodeStatus, 
  NodeType, 
  Connector 
} from '../types/orchestrator';
import { 
  X, 
  Play, 
  Check, 
  Trash2, 
  ExternalLink, 
  Terminal, 
  Globe, 
  Activity, 
  Plus, 
  Tag, 
  Sliders,
  Layers,
  StickyNote
} from 'lucide-react';

interface NodeInspectorModalProps {
  node: CanvasNode | null;
  connectors: Connector[];
  allNodes: CanvasNode[];
  onClose: () => void;
  onUpdateNode: (updated: CanvasNode) => void;
  onRunNode: (nodeId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onSelectNode: (nodeId: string) => void;
}

export const NodeInspectorModal: React.FC<NodeInspectorModalProps> = ({
  node,
  connectors,
  allNodes,
  onClose,
  onUpdateNode,
  onRunNode,
  onDeleteNode,
  onSelectNode,
}) => {
  if (!node) return null;

  const [title, setTitle] = useState(node.title);
  const [serialNumber, setSerialNumber] = useState(node.serialNumber || '');
  const [description, setDescription] = useState(node.description || '');
  const [command, setCommand] = useState(node.command || '');
  const [endpoint, setEndpoint] = useState(node.endpoint || '');
  const [environment, setEnvironment] = useState(node.environment || 'production');
  const [status, setStatus] = useState<NodeStatus>(node.status);
  const [tags, setTags] = useState<string[]>(node.tags || []);
  const [newTagInput, setNewTagInput] = useState('');
  const [noteContent, setNoteContent] = useState(node.noteContent || '');
  const [noteColor, setNoteColor] = useState(node.noteColor || 'yellow');

  // Connected nodes analysis
  const upstreamConnectors = connectors.filter((c) => c.targetId === node.id);
  const downstreamConnectors = connectors.filter((c) => c.sourceId === node.id);

  const handleSave = () => {
    onUpdateNode({
      ...node,
      title,
      serialNumber: serialNumber.trim() || undefined,
      description,
      command: command || undefined,
      endpoint: endpoint || undefined,
      environment,
      status,
      tags,
      noteContent: node.type === 'note' ? noteContent : undefined,
      noteColor: node.type === 'note' ? (noteColor as any) : undefined,
    });
    onClose();
  };

  const addTag = () => {
    if (newTagInput.trim() && !tags.includes(newTagInput.trim())) {
      setTags([...tags, newTagInput.trim()]);
      setNewTagInput('');
    }
  };

  const removeTag = (t: string) => {
    setTags(tags.filter((x) => x !== t));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs select-none">
      <div 
        className="w-full max-w-xl bg-[#F8EBE8] dark:bg-[#1F3E22] rounded-2xl border border-[#709654]/30 dark:border-[#3B5D37] shadow-2xl flex flex-col max-h-[88vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-[#1F3E22] dark:text-[#F8EBE8]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#709654]/25 dark:border-[#3B5D37]/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#3B5D37]/20 text-[#3B5D37] dark:text-[#AFD1C2] border border-[#3B5D37]/40">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1F3E22] dark:text-[#F8EBE8]">
                Node Properties & Configuration
              </h3>
              <div className="text-[11px] text-[#709654] dark:text-[#AFD1C2] flex items-center gap-2 mt-0.5">
                <span className="uppercase font-semibold tracking-wider">{node.type}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-[10px]">{node.id}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#709654] hover:text-[#1F3E22] dark:hover:text-[#F8EBE8] hover:bg-[#709654]/15 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Serial Number & Title */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Serial Number (S/N)
              </label>
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="e.g. SN-01"
                className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 font-mono text-[11px] font-bold"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 font-medium"
              />
            </div>
          </div>

          {/* Status & Environment Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Operational Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as NodeStatus)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="idle">Idle / Ready</option>
                <option value="running">Running / Active</option>
                <option value="success">Nominal / Success</option>
                <option value="warning">Degraded / Warning</option>
                <option value="error">Failed / Error</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Environment
              </label>
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="production">Production</option>
                <option value="staging">Staging</option>
                <option value="development">Development</option>
                <option value="local">Local</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Command if Tool */}
          {node.type === 'tool' && (
            <div>
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-amber-500" />
                <span>Execution Command</span>
              </label>
              <input
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="npm run test / docker build..."
                className="w-full px-3 py-2 bg-slate-900 text-slate-200 font-mono text-[11px] border border-slate-800 rounded-lg focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {/* Endpoint if App or Resource */}
          {(node.type === 'app' || node.type === 'resource') && (
            <div>
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-indigo-500" />
                <span>Service Endpoint / URI</span>
              </label>
              <input
                type="text"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="https://... or postgres://..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono text-[11px] focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {/* Note Specific Options */}
          {node.type === 'note' && (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Note Color Theme
                </label>
                <div className="flex items-center gap-2">
                  {['yellow', 'blue', 'green', 'purple', 'slate'].map((c) => (
                    <button
                      key={c}
                      onClick={() => setNoteColor(c as any)}
                      className={`w-7 h-7 rounded-lg capitalize border-2 text-[10px] font-medium transition-all ${
                        noteColor === c ? 'border-indigo-600 scale-110 shadow-xs' : 'border-transparent'
                      } ${
                        c === 'yellow' ? 'bg-amber-100 text-amber-900' :
                        c === 'blue' ? 'bg-sky-100 text-sky-900' :
                        c === 'green' ? 'bg-emerald-100 text-emerald-900' :
                        c === 'purple' ? 'bg-purple-100 text-purple-900' : 'bg-slate-200 text-slate-900'
                      }`}
                    >
                      {c[0].toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Note Markdown Content
                </label>
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>
            </div>
          )}

          {/* Tags */}
          <div>
            <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Labels & Tags
            </label>
            <div className="flex items-center gap-1.5 flex-wrap mb-2">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px]"
                >
                  <span>#{t}</span>
                  <button
                    onClick={() => removeTag(t)}
                    className="hover:text-rose-500"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Add tag..."
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                className="flex-1 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none text-[11px]"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-md text-[11px] font-medium"
              >
                Add
              </button>
            </div>
          </div>

          {/* Connected Relationships Overview */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Connected Graph Relations
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-1 font-semibold">
                  Upstream Dependencies ({upstreamConnectors.length})
                </span>
                {upstreamConnectors.length === 0 ? (
                  <span className="text-[11px] text-slate-400 italic">No incoming connections</span>
                ) : (
                  <ul className="space-y-1">
                    {upstreamConnectors.map((c) => {
                      const srcNode = allNodes.find((n) => n.id === c.sourceId);
                      return (
                        <li
                          key={c.id}
                          onClick={() => {
                            if (srcNode) {
                              onSelectNode(srcNode.id);
                              onClose();
                            }
                          }}
                          className="flex items-center justify-between text-[11px] text-slate-700 dark:text-slate-300 hover:text-indigo-600 cursor-pointer"
                        >
                          <span className="truncate">← {srcNode?.title || 'Unknown'}</span>
                          <span className="text-[9px] text-slate-400 font-mono">({c.type})</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-1 font-semibold">
                  Downstream Outputs ({downstreamConnectors.length})
                </span>
                {downstreamConnectors.length === 0 ? (
                  <span className="text-[11px] text-slate-400 italic">No outgoing connections</span>
                ) : (
                  <ul className="space-y-1">
                    {downstreamConnectors.map((c) => {
                      const tgtNode = allNodes.find((n) => n.id === c.targetId);
                      return (
                        <li
                          key={c.id}
                          onClick={() => {
                            if (tgtNode) {
                              onSelectNode(tgtNode.id);
                              onClose();
                            }
                          }}
                          className="flex items-center justify-between text-[11px] text-slate-700 dark:text-slate-300 hover:text-indigo-600 cursor-pointer"
                        >
                          <span className="truncate">→ {tgtNode?.title || 'Unknown'}</span>
                          <span className="text-[9px] text-slate-400 font-mono">({c.type})</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#709654]/25 dark:border-[#3B5D37]/50 bg-[#EEDFD8]/50 dark:bg-[#182E1A]/60 flex items-center justify-between">
          <button
            onClick={() => {
              onDeleteNode(node.id);
              onClose();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#DB3A31] hover:bg-[#DB3A31]/15 rounded-lg transition-colors font-medium"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Node</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onRunNode(node.id);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#871201] dark:text-[#DF9C56] bg-[#DF9C56]/25 hover:bg-[#DF9C56]/35 border border-[#DF9C56]/40 rounded-lg transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Execute</span>
            </button>
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-[#709654] hover:text-[#1F3E22] dark:hover:text-[#F8EBE8] rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 text-xs font-semibold text-[#F8EBE8] bg-[#3B5D37] hover:bg-[#1F3E22] rounded-lg transition-colors shadow-xs"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
