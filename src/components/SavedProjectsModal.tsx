import React, { useState, useMemo } from 'react';
import { 
  X, 
  Folder, 
  Trash2, 
  Download, 
  Calendar, 
  ArrowRight, 
  Layers, 
  FolderPlus,
  Pencil,
  Check,
  Sparkles
} from 'lucide-react';
import { SavedProject } from '../types/orchestrator';

interface SavedProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedProjects: SavedProject[];
  currentProjectId?: string;
  onLoadProject: (project: SavedProject) => void;
  onDeleteProject: (projectId: string) => void;
  onExportProject: (project: SavedProject) => void;
  onStartNewProject: () => void;
  onRenameProject?: (projectId: string, newName: string) => void;
  onDeduplicateProjects?: () => void;
}

export const SavedProjectsModal: React.FC<SavedProjectsModalProps> = ({
  isOpen,
  onClose,
  savedProjects,
  currentProjectId,
  onLoadProject,
  onDeleteProject,
  onExportProject,
  onStartNewProject,
  onRenameProject,
  onDeduplicateProjects,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');

  const hasDuplicates = useMemo(() => {
    const names = savedProjects.map((p) => p.name.trim().toLowerCase());
    return new Set(names).size < names.length;
  }, [savedProjects]);

  if (!isOpen) return null;

  const handleStartRename = (project: SavedProject) => {
    setEditingId(project.id);
    setEditingName(project.name);
  };

  const handleSaveRename = (projectId: string) => {
    if (editingName.trim()) {
      onRenameProject?.(projectId, editingName.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs select-none">
      <div 
        className="w-full max-w-lg bg-[#F8EBE8] dark:bg-[#1A331C] rounded-2xl border-2 border-[#709654]/40 dark:border-[#3B5D37] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-[#1F3E22] dark:text-[#F8EBE8] flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#709654]/25 dark:border-[#3B5D37]/50 flex items-center justify-between bg-white/40 dark:bg-black/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#3B5D37] text-white flex items-center justify-center shadow-xs">
              <Folder className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1F3E22] dark:text-[#F8EBE8]">
                Projects Library
              </h3>
              <p className="text-[11px] text-[#709654] dark:text-[#AFD1C2]">
                Switch between saved projects or manage workspace saves
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasDuplicates && onDeduplicateProjects && (
              <button
                type="button"
                onClick={onDeduplicateProjects}
                className="px-2.5 py-1 rounded-lg bg-[#DF9C56]/20 text-[#871201] dark:text-[#DF9C56] hover:bg-[#DF9C56]/30 border border-[#DF9C56]/50 text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Merge and clean duplicate projects with identical names"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Remove Duplicates</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-[#709654] hover:text-[#1F3E22] dark:hover:text-[#F8EBE8] rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* List of projects */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1 text-xs">
          {hasDuplicates && (
            <div className="p-3 rounded-xl bg-[#DF9C56]/20 border border-[#DF9C56]/50 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="w-4 h-4 text-[#871201] dark:text-[#DF9C56] shrink-0" />
                <span className="text-[#871201] dark:text-[#DF9C56] font-medium truncate">
                  Multiple projects share duplicate names.
                </span>
              </div>
              {onDeduplicateProjects && (
                <button
                  type="button"
                  onClick={onDeduplicateProjects}
                  className="px-2.5 py-1 rounded-lg bg-[#871201] text-white hover:bg-[#A81702] font-semibold text-xs shadow-xs transition-colors cursor-pointer shrink-0"
                >
                  Merge Copies
                </button>
              )}
            </div>
          )}

          {savedProjects.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#709654]/15 flex items-center justify-center mx-auto text-[#709654]">
                <Folder className="w-6 h-6" />
              </div>
              <p className="text-xs text-[#709654] dark:text-[#AFD1C2]">
                No projects saved in the library yet.
              </p>
              <button
                onClick={() => {
                  onClose();
                  onStartNewProject();
                }}
                className="px-3.5 py-1.5 rounded-lg bg-[#871201] text-white font-semibold text-xs hover:bg-[#A81702] transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>Start New Project</span>
              </button>
            </div>
          ) : (
            savedProjects.map((p, idx) => {
              const totalNodes = p.boards.reduce((acc, b) => acc + (b.nodes?.length || 0), 0);
              const isCurrent = p.id === currentProjectId;
              const isEditing = editingId === p.id;

              return (
                <div
                  key={p.id}
                  className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    isCurrent
                      ? 'border-[#871201] bg-[#DF9C56]/15 dark:bg-[#DF9C56]/10'
                      : 'border-[#709654]/30 bg-white/50 dark:bg-black/20 hover:border-[#709654]'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/5 dark:bg-white/10 text-[#709654] dark:text-[#AFD1C2]">
                        #{idx + 1}
                      </span>
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={editingName}
                            autoFocus
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveRename(p.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            className="px-1.5 py-0.5 bg-white dark:bg-[#152816] border border-[#709654] rounded font-bold text-xs text-[#1F3E22] dark:text-[#F8EBE8] outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveRename(p.id)}
                            className="p-1 rounded bg-[#3B5D37] text-white hover:bg-[#1F3E22] transition-colors"
                            title="Save new name"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 min-w-0 group/pname">
                          <span className="font-bold text-sm text-[#1F3E22] dark:text-[#F8EBE8] truncate">
                            {p.name}
                          </span>
                          {onRenameProject && (
                            <button
                              type="button"
                              onClick={() => handleStartRename(p)}
                              className="opacity-0 group-hover/pname:opacity-100 p-0.5 text-[#709654] hover:text-[#1F3E22] dark:hover:text-[#F8EBE8] transition-opacity cursor-pointer"
                              title="Rename this project"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                      {isCurrent && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#871201] text-white shrink-0">
                          Current
                        </span>
                      )}
                    </div>
                    {p.description && (
                      <p className="text-[11px] text-[#709654] dark:text-[#AFD1C2] truncate mt-0.5">
                        {p.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-[10px] text-[#709654] dark:text-[#AFD1C2] mt-1.5 font-medium flex-wrap">
                      <span>{p.boards.length} board(s)</span>
                      <span>•</span>
                      <span>{totalNodes} node(s)</span>
                      <span>•</span>
                      <span>{p.organizerItems.length} organizer item(s)</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5" />
                        {new Date(p.createdAt).toLocaleDateString()} {p.updatedAt ? `(${p.updatedAt})` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => onExportProject(p)}
                      className="p-1.5 rounded-lg border border-[#709654]/30 text-[#709654] hover:text-[#1F3E22] dark:hover:text-[#F8EBE8] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                      title="Download JSON export"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteProject(p.id)}
                      className="p-1.5 rounded-lg border border-[#DB3A31]/30 text-[#DB3A31] hover:bg-[#DB3A31]/10 transition-colors cursor-pointer"
                      title="Delete project from library"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {!isCurrent && (
                      <button
                        onClick={() => {
                          onLoadProject(p);
                          onClose();
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#3B5D37] hover:bg-[#1F3E22] text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer ml-1"
                      >
                        <span>Open</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#709654]/25 dark:border-[#3B5D37]/50 flex items-center justify-between bg-white/40 dark:bg-black/20 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#709654] dark:text-[#AFD1C2]">
              {savedProjects.length} project(s) in library
            </span>
            {hasDuplicates && onDeduplicateProjects && (
              <button
                type="button"
                onClick={onDeduplicateProjects}
                className="text-[10px] text-[#871201] dark:text-[#DF9C56] font-semibold underline cursor-pointer"
              >
                Clean duplicate names
              </button>
            )}
          </div>
          <button
            onClick={() => {
              onClose();
              onStartNewProject();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#871201] hover:bg-[#A81702] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Start New Project</span>
          </button>
        </div>
      </div>
    </div>
  );
};
