import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  AlertTriangle, 
  Download, 
  ArrowRight,
  FolderOpen
} from 'lucide-react';

interface SaveBeforeLoadModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProjectName: string;
  incomingProjectName: string;
  boardsCount: number;
  nodesCount: number;
  organizerItemsCount: number;
  onConfirmSaveAndLoad: (params: { saveName: string; saveToComputer: boolean }) => void;
  onConfirmLoadWithoutSaving: () => void;
}

export const SaveBeforeLoadModal: React.FC<SaveBeforeLoadModalProps> = ({
  isOpen,
  onClose,
  currentProjectName,
  incomingProjectName,
  boardsCount,
  nodesCount,
  organizerItemsCount,
  onConfirmSaveAndLoad,
  onConfirmLoadWithoutSaving,
}) => {
  const effectiveCurrentName = (!currentProjectName || currentProjectName.trim() === 'ty')
    ? 'Master Orchestrator'
    : currentProjectName;

  const [saveName, setSaveName] = useState(() => effectiveCurrentName);
  const [saveToComputer, setSaveToComputer] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const resolved = (!currentProjectName || currentProjectName.trim() === 'ty')
        ? 'Master Orchestrator'
        : currentProjectName;
      setSaveName(resolved);
    }
  }, [isOpen, currentProjectName]);

  if (!isOpen) return null;

  const handleSaveAndLoad = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmSaveAndLoad({
      saveName: saveName.trim() || currentProjectName || 'Saved Project',
      saveToComputer,
    });
  };

  return (
    <div className="fixed inset-0 z-[320] flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs select-none">
      <div 
        className="w-full max-w-lg bg-[#F8EBE8] dark:bg-[#1A331C] rounded-2xl border-2 border-[#DF9C56] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-[#1F3E22] dark:text-[#F8EBE8]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#709654]/25 dark:border-[#3B5D37]/50 flex items-center justify-between bg-white/40 dark:bg-black/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#DF9C56] text-white flex items-center justify-center shadow-xs">
              <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1F3E22] dark:text-[#F8EBE8]">
                Save Current Project Before Loading?
              </h3>
              <p className="text-[11px] text-[#709654] dark:text-[#AFD1C2]">
                Loading &quot;{incomingProjectName}&quot; will replace the current workspace
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

        {/* Content */}
        <form onSubmit={handleSaveAndLoad} className="p-6 space-y-4 text-xs">
          <div className="p-3.5 rounded-xl border border-[#709654]/30 bg-white/50 dark:bg-black/20 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-[#1F3E22] dark:text-[#F8EBE8]">
              <span>Current Project: <strong className="font-bold">{effectiveCurrentName}</strong></span>
              <span className="font-mono text-[#709654] dark:text-[#AFD1C2]">
                {boardsCount} board(s) • {nodesCount === 0 ? '0 nodes (Cleared Canvas)' : `${nodesCount} node(s)`} • {organizerItemsCount} item(s)
              </span>
            </div>
            {nodesCount === 0 ? (
              <p className="text-[11px] text-[#DF9C56] dark:text-[#DF9C56] leading-relaxed font-medium">
                The current canvas is cleared (0 nodes). Saving will record this cleared canvas to &quot;{effectiveCurrentName}&quot; before loading &quot;{incomingProjectName}&quot;.
              </p>
            ) : (
              <p className="text-[11px] text-[#709654] dark:text-[#AFD1C2] leading-relaxed">
                Do you want to save your current work before loading <span className="font-bold text-[#1F3E22] dark:text-[#F8EBE8]">&quot;{incomingProjectName}&quot;</span>?
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div>
              <label className="text-[11px] font-semibold text-[#1F3E22] dark:text-[#F8EBE8] block mb-1">
                Save current project as:
              </label>
              <input
                type="text"
                required
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="e.g. Master Architecture v1"
                className="w-full px-3 py-1.5 bg-[#EEDFD8] dark:bg-[#152816] border border-[#709654]/40 rounded-lg text-[#1F3E22] dark:text-[#F8EBE8] font-medium focus:outline-none focus:ring-1 focus:ring-[#871201]"
              />
            </div>

            <label className="flex items-center gap-2 text-[11px] text-[#709654] dark:text-[#AFD1C2] cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={saveToComputer}
                onChange={(e) => setSaveToComputer(e.target.checked)}
                className="w-3.5 h-3.5 accent-[#709654] rounded"
              />
              <Download className="w-3.5 h-3.5 text-[#709654]" />
              <span>Also save JSON file to my computer (prompts folder location)</span>
            </label>
          </div>

          {/* Action Buttons: Cancel, Don't Save, and Save & Load */}
          <div className="pt-3 border-t border-[#709654]/25 dark:border-[#3B5D37]/50 flex items-center justify-between gap-2 flex-wrap">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-[#709654] hover:text-[#1F3E22] dark:hover:text-[#F8EBE8] rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <div className="flex items-center gap-2">
              {/* Don't Save Button */}
              <button
                type="button"
                onClick={onConfirmLoadWithoutSaving}
                className="px-3.5 py-1.5 text-xs font-semibold text-[#DB3A31] hover:text-white hover:bg-[#DB3A31] border border-[#DB3A31]/40 rounded-xl transition-all cursor-pointer shadow-2xs"
                title="Discard current project changes and load incoming project immediately"
              >
                Don&apos;t Save
              </button>

              {/* Save & Load Project Button */}
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#3B5D37] hover:bg-[#1F3E22] active:scale-98 rounded-xl transition-all shadow-md cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save &amp; Load Project</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
