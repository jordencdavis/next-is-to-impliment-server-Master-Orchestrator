import React, { useState, useEffect } from 'react';
import { 
  X, 
  FolderPlus, 
  Save, 
  FileBox, 
  Download, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  Layers
} from 'lucide-react';
import { CanvasBoard, OrganizerItem } from '../types/orchestrator';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProjectName: string;
  boards: CanvasBoard[];
  organizerItems: OrganizerItem[];
  onConfirmNewProject: (params: {
    saveCurrent: boolean;
    currentSaveName: string;
    downloadBackup: boolean;
    newProjectName: string;
    newProjectDescription: string;
    template: 'blank' | 'starter';
  }) => void;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  currentProjectName,
  boards,
  organizerItems,
  onConfirmNewProject,
}) => {
  const effectiveCurrentName = (!currentProjectName || currentProjectName.trim() === 'ty')
    ? 'Master Orchestrator'
    : currentProjectName;

  const [saveCurrent, setSaveCurrent] = useState(true);
  const [currentSaveName, setCurrentSaveName] = useState(() => effectiveCurrentName);
  const [downloadBackup, setDownloadBackup] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [template, setTemplate] = useState<'blank' | 'starter'>('blank');

  useEffect(() => {
    if (isOpen) {
      const resolved = (!currentProjectName || currentProjectName.trim() === 'ty')
        ? 'Master Orchestrator'
        : currentProjectName;
      setCurrentSaveName(resolved);
      setNewProjectName('');
      setNewProjectDescription('');
    }
  }, [isOpen, currentProjectName]);

  if (!isOpen) return null;

  const totalNodes = boards.reduce((acc, b) => acc + (b.nodes?.length || 0), 0);
  const totalConnectors = boards.reduce((acc, b) => acc + (b.connectors?.length || 0), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalNewName = newProjectName.trim() || 'Untitled Project';
    const finalSaveName = currentSaveName.trim() || currentProjectName || 'Previous Project';

    onConfirmNewProject({
      saveCurrent,
      currentSaveName: finalSaveName,
      downloadBackup,
      newProjectName: finalNewName,
      newProjectDescription: newProjectDescription.trim(),
      template,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs select-none">
      <div 
        className="w-full max-w-lg bg-[#F8EBE8] dark:bg-[#1A331C] rounded-2xl border-2 border-[#709654]/40 dark:border-[#3B5D37] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-[#1F3E22] dark:text-[#F8EBE8]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#709654]/25 dark:border-[#3B5D37]/50 flex items-center justify-between bg-white/40 dark:bg-black/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#871201] text-white flex items-center justify-center shadow-xs">
              <FolderPlus className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1F3E22] dark:text-[#F8EBE8]">
                Start New Project
              </h3>
              <p className="text-[11px] text-[#709654] dark:text-[#AFD1C2]">
                Name and save your current project, then initialize a new workspace
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#709654] hover:text-[#1F3E22] dark:hover:text-[#F8EBE8] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4.5 text-xs">
          {/* Step 1: Save Current Project */}
          <div className="p-3.5 rounded-xl border border-[#DF9C56]/40 bg-[#DF9C56]/10 dark:bg-[#DF9C56]/5 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 font-bold text-[#1F3E22] dark:text-[#F8EBE8] cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveCurrent}
                  onChange={(e) => setSaveCurrent(e.target.checked)}
                  className="w-4 h-4 accent-[#871201] rounded"
                />
                <span className="flex items-center gap-1.5">
                  <Save className="w-3.5 h-3.5 text-[#DF9C56]" />
                  Save current project before starting new
                </span>
              </label>
              <span className="text-[10px] font-mono text-[#709654] dark:text-[#AFD1C2]">
                {boards.length} board(s) • {totalNodes} node(s) • {organizerItems.length} item(s)
              </span>
            </div>

            {saveCurrent ? (
              <div className="space-y-2 pt-1 border-t border-[#DF9C56]/20">
                <div>
                  <label className="text-[11px] font-semibold text-[#1F3E22] dark:text-[#F8EBE8] block mb-1">
                    Save current project as:
                  </label>
                  <input
                    type="text"
                    required={saveCurrent}
                    value={currentSaveName}
                    onChange={(e) => setCurrentSaveName(e.target.value)}
                    placeholder="e.g. Master Architecture v1"
                    className="w-full px-3 py-1.5 bg-[#EEDFD8] dark:bg-[#152816] border border-[#709654]/40 rounded-lg text-[#1F3E22] dark:text-[#F8EBE8] font-medium focus:outline-none focus:ring-1 focus:ring-[#871201]"
                  />
                </div>
                <label className="flex items-center gap-2 text-[11px] text-[#709654] dark:text-[#AFD1C2] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={downloadBackup}
                    onChange={(e) => setDownloadBackup(e.target.checked)}
                    className="w-3.5 h-3.5 accent-[#709654] rounded"
                  />
                  <Download className="w-3 h-3 text-[#709654]" />
                  <span>Also save JSON file to my computer (prompts folder location to save)</span>
                </label>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[11px] text-[#DB3A31] pt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Current project will be cleared without saving to library.</span>
              </div>
            )}
          </div>

          {/* Step 2: Configure New Project */}
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-bold text-[#1F3E22] dark:text-[#F8EBE8] block mb-1">
                New Project Name *
              </label>
              <input
                type="text"
                required
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="e.g. Mobile Backend Infrastructure, Sprint 14 Orchestrator"
                className="w-full px-3 py-2 bg-[#EEDFD8] dark:bg-[#152816] border border-[#709654]/40 rounded-lg text-[#1F3E22] dark:text-[#F8EBE8] font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-[#709654]/50"
                autoFocus
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#1F3E22] dark:text-[#F8EBE8] block mb-1">
                Description (Optional)
              </label>
              <input
                type="text"
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                placeholder="Brief summary of systems and workflow goals..."
                className="w-full px-3 py-1.5 bg-[#EEDFD8] dark:bg-[#152816] border border-[#709654]/30 rounded-lg text-[#1F3E22] dark:text-[#F8EBE8] focus:outline-none focus:ring-1 focus:ring-[#709654]"
              />
            </div>

            {/* Starter Template */}
            <div>
              <label className="text-[11px] font-semibold text-[#1F3E22] dark:text-[#F8EBE8] block mb-1.5">
                Workspace Initialization
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTemplate('blank')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    template === 'blank'
                      ? 'border-[#871201] bg-[#DF9C56]/20 text-[#871201] dark:text-[#DF9C56] shadow-xs'
                      : 'border-[#709654]/30 text-[#1F3E22]/80 dark:text-[#F8EBE8]/80 hover:bg-[#709654]/10'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <FileBox className="w-3.5 h-3.5" />
                    <span>Clean Blank Canvas</span>
                  </div>
                  <div className="text-[10px] text-[#709654] dark:text-[#AFD1C2] mt-0.5">
                    Fresh empty board and clean organizer
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTemplate('starter')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    template === 'starter'
                      ? 'border-[#871201] bg-[#DF9C56]/20 text-[#871201] dark:text-[#DF9C56] shadow-xs'
                      : 'border-[#709654]/30 text-[#1F3E22]/80 dark:text-[#F8EBE8]/80 hover:bg-[#709654]/10'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Sample Template</span>
                  </div>
                  <div className="text-[10px] text-[#709654] dark:text-[#AFD1C2] mt-0.5">
                    Includes starter boards and sample items
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-[#709654]/25 dark:border-[#3B5D37]/50 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-[#709654] hover:text-[#1F3E22] dark:hover:text-[#F8EBE8] rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <div className="flex items-center gap-2">
              {!saveCurrent && (
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs font-semibold text-[#DB3A31] hover:bg-[#DB3A31]/10 rounded-lg transition-colors cursor-pointer border border-[#DB3A31]/40"
                >
                  Proceed Without Saving
                </button>
              )}
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#871201] hover:bg-[#A81702] active:scale-98 rounded-xl transition-all shadow-md cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{saveCurrent ? 'Save Current & Start Project' : 'Start New Project'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
