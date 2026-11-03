import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Layers, 
  ChevronDown, 
  Download, 
  Upload, 
  Moon, 
  Sun, 
  FolderPlus,
  Trash2,
  Copy,
  Kanban,
  Network,
  GitBranch,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Folder,
  FolderOpen,
  Pencil,
  Check,
  CheckSquare,
  FolderGit2
} from 'lucide-react';
import { CanvasBoard } from '../types/orchestrator';

interface HeaderProps {
  boards: CanvasBoard[];
  activeBoardId: string;
  onSelectBoard: (boardId: string) => void;
  onNewBoard: () => void;
  onDuplicateBoard: (boardId: string) => void;
  onDeleteBoard: (boardId: string) => void;
  onDeleteMultipleBoards?: (boardIds: string[]) => void;
  onExportBoards: () => void;
  onImportBoards: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAddQuickNode: () => void;
  darkMode: boolean;
  onToggleTheme: () => void;
  onClearBoard?: (boardId?: string) => void;
  onMasterClear?: () => void;
  onDeleteAllBoards?: () => void;
  onSyncOrganizerItems?: () => void;
  currentProjectName?: string;
  savedProjectsCount?: number;
  onNewProject?: () => void;
  onOpenProjectsManager?: () => void;
  onRenameProject?: (newName: string) => void;
  onRenameBoard?: (boardId: string, newName: string) => void;
  onOpenGithubSync?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  boards,
  activeBoardId,
  onSelectBoard,
  onNewBoard,
  onDuplicateBoard,
  onDeleteBoard,
  onDeleteMultipleBoards,
  onExportBoards,
  onImportBoards,
  onAddQuickNode,
  darkMode,
  onToggleTheme,
  onClearBoard,
  onMasterClear,
  onDeleteAllBoards,
  onSyncOrganizerItems,
  currentProjectName,
  savedProjectsCount,
  onNewProject,
  onOpenProjectsManager,
  onRenameProject,
  onRenameBoard,
  onOpenGithubSync,
}) => {
  const [boardMenuOpen, setBoardMenuOpen] = useState(false);
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  const [selectedBoardsToDelete, setSelectedBoardsToDelete] = useState<string[]>(() =>
    boards.slice(1).map((b) => b.id)
  );

  const [editingBoardId, setEditingBoardId] = useState<string | null>(null);
  const [editingBoardNameText, setEditingBoardNameText] = useState<string>('');

  const handleFinishBoardRename = (boardId: string) => {
    setEditingBoardId(null);
    const trimmed = editingBoardNameText.trim();
    if (!trimmed) return;
    const isDuplicate = boards.some(
      (b) => b.id !== boardId && b.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (!isDuplicate) {
      onRenameBoard?.(boardId, trimmed);
    }
  };

  useEffect(() => {
    if (clearModalOpen) {
      setSelectedBoardsToDelete(boards.slice(1).map((b) => b.id));
    }
  }, [clearModalOpen, boards]);

  const effectiveProjectName = (!currentProjectName || currentProjectName.trim() === 'ty')
    ? 'Master Orchestrator'
    : currentProjectName;
  const [isEditingProjectName, setIsEditingProjectName] = useState(false);
  const [editingNameText, setEditingNameText] = useState(effectiveProjectName);

  useEffect(() => {
    setEditingNameText(effectiveProjectName);
  }, [effectiveProjectName]);

  const handleFinishRename = () => {
    setIsEditingProjectName(false);
    const trimmed = editingNameText.trim();
    if (trimmed && trimmed !== 'ty') {
      onRenameProject?.(trimmed);
    } else {
      setEditingNameText(effectiveProjectName);
    }
  };

  // Unselected tab hover tracking (set below cursor)
  const [hoveredUnselected, setHoveredUnselected] = useState<{
    board: CanvasBoard;
    color: string;
  } | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Scroll indicator state
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = tabsContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = tabsContainerRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [updateScrollState, boards]);

  const currentIndex = boards.findIndex((b) => b.id === activeBoardId);
  const canSelectLeft = currentIndex > 0;
  const canSelectRight = currentIndex < boards.length - 1;

  // Click on left: select previous board and scroll left
  const handleSelectPrevious = () => {
    const curIdx = boards.findIndex((b) => b.id === activeBoardId);
    if (curIdx > 0) {
      onSelectBoard(boards[curIdx - 1].id);
    } else if (tabsContainerRef.current) {
      tabsContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  };

  // Click on right: select next board and scroll right till last
  const handleSelectNext = () => {
    const curIdx = boards.findIndex((b) => b.id === activeBoardId);
    if (curIdx >= 0 && curIdx < boards.length - 1) {
      onSelectBoard(boards[curIdx + 1].id);
    } else if (tabsContainerRef.current) {
      tabsContainerRef.current.scrollTo({ left: tabsContainerRef.current.scrollWidth, behavior: 'smooth' });
    }
  };

  // Ensure selected tab is always scrolled smoothly into view (with generous blank space at the end)
  useEffect(() => {
    const container = tabsContainerRef.current;
    if (!container) return;
    const activeBtn = container.querySelector(`[data-board-id="${activeBoardId}"]`) as HTMLElement | null;
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeBoardId]);

  // When clicking a tab directly: select it and scroll it into view
  const handleTabClick = (boardId: string, e: React.MouseEvent<HTMLButtonElement>) => {
    onSelectBoard(boardId);
    setHoveredUnselected(null);
    const button = e.currentTarget;
    if (!button) return;
    button.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  };

  // Keyboard navigation on tabs container (Left/Right arrows change selection)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handleSelectPrevious();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      handleSelectNext();
    }
  };

  // Wheel horizontal scroll
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!tabsContainerRef.current) return;
    if (e.deltaY !== 0 && Math.abs(e.deltaX) < Math.abs(e.deltaY)) {
      tabsContainerRef.current.scrollLeft += e.deltaY;
    }
  };

  const getBoardIcon = (iconName: string) => {
    switch (iconName) {
      case 'Kanban':
        return <Kanban className="w-3.5 h-3.5" />;
      case 'Layers':
        return <Layers className="w-3.5 h-3.5" />;
      case 'GitBranch':
        return <GitBranch className="w-3.5 h-3.5" />;
      default:
        return <Network className="w-3.5 h-3.5" />;
    }
  };

  return (
    <header 
      className="h-13 bg-[#F8EBE8] dark:bg-[#1A331C] border-b border-[#709654]/25 dark:border-[#3B5D37]/60 px-4 flex items-center justify-between gap-8 shrink-0 relative z-50 overflow-visible select-none"
    >
      {/* Zone 1: Wordmark & Project & New Project CTA */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-[#871201] text-[#F8EBE8] flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
          MO
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold tracking-tight text-[#1F3E22] dark:text-[#F8EBE8] whitespace-nowrap">
              Master Orchestrator
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-[#709654] dark:text-[#AFD1C2] leading-tight">
            {isEditingProjectName ? (
              <input
                type="text"
                autoFocus
                value={editingNameText}
                onChange={(e) => setEditingNameText(e.target.value)}
                onBlur={handleFinishRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleFinishRename();
                  if (e.key === 'Escape') {
                    setEditingNameText(effectiveProjectName);
                    setIsEditingProjectName(false);
                  }
                }}
                className="px-1.5 py-0.5 bg-white dark:bg-[#152816] border border-[#709654] rounded text-[11px] font-bold text-[#1F3E22] dark:text-[#F8EBE8] outline-none max-w-[130px]"
              />
            ) : (
              <div className="flex items-center gap-1 group/name">
                <span
                  onClick={() => setIsEditingProjectName(true)}
                  className="font-semibold truncate max-w-[120px] hover:underline cursor-pointer"
                  title={`${effectiveProjectName} (Click to rename)`}
                >
                  {effectiveProjectName}
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditingProjectName(true)}
                  className="opacity-0 group-hover/name:opacity-100 hover:text-[#1F3E22] dark:hover:text-[#F8EBE8] transition-opacity cursor-pointer p-0.5"
                  title="Rename current project"
                >
                  <Pencil className="w-2.5 h-2.5" />
                </button>
              </div>
            )}
            {(savedProjectsCount ?? 0) > 0 && onOpenProjectsManager && (
              <button
                onClick={onOpenProjectsManager}
                className="text-[9px] px-1.5 py-0.2 rounded bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-[#1F3E22] dark:text-[#F8EBE8] transition-colors cursor-pointer"
                title={`${savedProjectsCount} saved project(s) in library. Click to open Projects Library.`}
              >
                {savedProjectsCount} saved
              </button>
            )}
          </div>
        </div>

        {/* Buttons to start a new project and load an existing project */}
        <div className="flex items-center gap-1.5 ml-1">
          {onNewProject && (
            <button
              onClick={onNewProject}
              style={{ width: '74.45px' }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-white bg-[#871201] hover:bg-[#A81702] active:scale-95 rounded-lg transition-all shadow-xs border border-[#871201]/40 shrink-0 cursor-pointer hover:shadow-sm"
              title="Start a new project (prompts to name & save current project first)"
              aria-label="Start New Project"
            >
              <FolderPlus className="w-3.5 h-3.5 stroke-[2.2]" />
              <span className="font-bold text-[11px] whitespace-nowrap">New Project</span>
            </button>
          )}

          {/* Load Project Button */}
          <label
            style={{ width: '80.417px' }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-[#1F3E22] dark:text-[#F8EBE8] bg-white/80 dark:bg-[#152816] hover:bg-white dark:hover:bg-[#1F3E22] active:scale-95 rounded-lg transition-all shadow-xs border border-[#709654]/40 shrink-0 cursor-pointer hover:shadow-sm"
            title="Load an existing project JSON file from your computer (prompts to save current canvas first)"
          >
            <FolderOpen className="w-3.5 h-3.5 text-[#3B5D37] dark:text-[#AFD1C2] stroke-[2.2]" />
            <span className="font-bold text-[11px] whitespace-nowrap">Load Project</span>
            <input
              type="file"
              accept=".json"
              onChange={onImportBoards}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Zone 2: Canvas List / Boards Switcher (Area D) */}
      <div className="flex-1 min-w-0 w-full flex items-center gap-1.5 py-1 overflow-visible relative">
        {/* Click on left: scroll left & select previous item */}
        <button
          onClick={handleSelectPrevious}
          className={`p-1.5 rounded-lg border border-[#709654]/30 bg-white/70 dark:bg-[#152816] text-[#1F3E22] dark:text-[#F8EBE8] hover:bg-white dark:hover:bg-[#1F3E22] transition-all shrink-0 ${
            canSelectLeft ? 'opacity-100 cursor-pointer shadow-xs hover:scale-105 active:scale-95' : 'opacity-40 cursor-not-allowed'
          }`}
          title={canSelectLeft ? `Select previous board (${boards[currentIndex - 1]?.name})` : 'First board reached'}
          aria-label="Previous board"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Quick Board Selector Tabs */}
        <div 
          ref={tabsContainerRef}
          onWheel={handleWheel}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          className="flex-1 min-w-0 w-full flex items-center p-1 bg-[#EEDFD8] dark:bg-[#152816] rounded-xl border border-[#709654]/30 dark:border-[#3B5D37]/50 gap-1.5 overflow-x-auto scroll-smooth select-none focus:outline-none focus:ring-1 focus:ring-[#709654]/40"
          style={{ scrollbarWidth: 'none' }}
        >
          {/* Leading blank space */}
          <div className="w-1 shrink-0 h-4 pointer-events-none" aria-hidden="true" />

          {boards.map((b, idx) => {
            const isActive = b.id === activeBoardId;
            // Alternating signature color for each board
            const boardColors = ['#C61B31', '#709654', '#3B5D37', '#DF9C56', '#DB3A31', '#871201'];
            const boardColor = boardColors[idx % boardColors.length];

            return (
              <button
                key={b.id}
                data-board-id={b.id}
                onClick={(e) => handleTabClick(b.id, e)}
                onDoubleClick={(e) => {
                  if (idx !== 0) {
                    e.stopPropagation();
                    setEditingBoardId(b.id);
                    setEditingBoardNameText(b.name);
                  }
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    setHoveredUnselected({ board: b, color: boardColor });
                    setCursorPos({ x: e.clientX, y: e.clientY });
                  } else {
                    setHoveredUnselected(null);
                  }
                }}
                onMouseMove={(e) => {
                  if (!isActive) {
                    setCursorPos({ x: e.clientX, y: e.clientY });
                  }
                }}
                onMouseLeave={() => {
                  setHoveredUnselected(null);
                }}
                style={{
                  borderColor: isActive ? boardColor : 'transparent',
                }}
                className={`group flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 border relative ${
                  isActive
                    ? 'bg-white dark:bg-[#1F3E22] text-[#1F3E22] dark:text-[#F8EBE8] shadow-md border-l-3 scale-100 z-10'
                    : 'text-[#1F3E22]/70 dark:text-[#AFD1C2]/80 hover:text-[#1F3E22] dark:hover:text-[#F8EBE8] hover:bg-white/60 dark:hover:bg-[#1F3E22]/60 translate-y-[1px] hover:translate-y-0 opacity-80 hover:opacity-100 cursor-pointer'
                }`}
                title={
                  idx === 0
                    ? `${b.name} (Default Main Board - Protected)`
                    : isActive
                    ? `${b.name} (Active - Double click text to rename)`
                    : `${b.name} (Double click text to rename)`
                }
              >
                {/* Active side indicator: which ever selected pass to side */}
                {isActive && (
                  <span
                    style={{ backgroundColor: boardColor }}
                    className="w-1.5 h-3.5 rounded-full shrink-0 shadow-xs animate-in fade-in duration-150"
                  />
                )}

                <span
                  style={{
                    backgroundColor: isActive ? boardColor : `${boardColor}25`,
                    color: isActive ? '#F8EBE8' : boardColor,
                  }}
                  className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] shrink-0 font-bold transition-colors"
                >
                  {getBoardIcon(b.icon)}
                </span>
                {editingBoardId === b.id ? (
                  <input
                    type="text"
                    autoFocus
                    value={editingBoardNameText}
                    onChange={(e) => setEditingBoardNameText(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => e.stopPropagation()}
                    onBlur={() => handleFinishBoardRename(b.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleFinishBoardRename(b.id);
                      if (e.key === 'Escape') setEditingBoardId(null);
                    }}
                    className="px-1.5 py-0.5 bg-white dark:bg-[#152816] border border-[#709654] rounded text-[11px] font-bold text-[#1F3E22] dark:text-[#F8EBE8] outline-none max-w-[120px]"
                  />
                ) : (
                  <span
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      if (idx !== 0) {
                        setEditingBoardId(b.id);
                        setEditingBoardNameText(b.name);
                      }
                    }}
                    className="truncate max-w-[140px]"
                  >
                    {b.name}
                  </span>
                )}
                <span 
                  style={{ color: isActive ? boardColor : undefined }}
                  className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/5 dark:bg-white/10"
                >
                  {b.nodes.length}
                </span>

                {/* Quick clear button on active board tab */}
                {isActive && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setClearModalOpen(true);
                    }}
                    className="p-0.5 text-[#DB3A31]/70 hover:text-[#DB3A31] hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors ml-0.5 cursor-pointer"
                    title={`Clear ${b.name} canvas (or Master Clear)`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </span>
                )}
              </button>
            );
          })}

          {/* Trailing blank space spacer so last tab scrolls completely into view without being trapped */}
          <div className="w-24 shrink-0 h-4 pointer-events-none" aria-hidden="true" />
        </div>

        {/* Click on right: scroll right & select next item till last */}
        <button
          onClick={handleSelectNext}
          className={`p-1.5 rounded-lg border border-[#709654]/30 bg-white/70 dark:bg-[#152816] text-[#1F3E22] dark:text-[#F8EBE8] hover:bg-white dark:hover:bg-[#1F3E22] transition-all shrink-0 ${
            canSelectRight ? 'opacity-100 cursor-pointer shadow-xs hover:scale-105 active:scale-95' : 'opacity-40 cursor-not-allowed'
          }`}
          title={canSelectRight ? `Select next board (${boards[currentIndex + 1]?.name})` : '( NEW ) Board Reached'}
          aria-label="Next board"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Plus Button for Create New Visual Board directly on Header */}
        <button
          onClick={onNewBoard}
          style={{ width: '54.25px' }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-[#F8EBE8] bg-[#709654] hover:bg-[#3B5D37] active:scale-95 rounded-lg transition-all shadow-xs border border-[#709654]/50 shrink-0 cursor-pointer hover:shadow-sm"
          title="Create New Visual Board (+)"
          aria-label="Create New Visual Board"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span className="hidden sm:inline font-bold text-[11px]">New Board</span>
        </button>

        {/* Clear Button for Visual Board / Master Clear */}
        <button
          onClick={() => setClearModalOpen(true)}
          style={{ width: '53.7px' }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-[#DB3A31] hover:text-white bg-[#DB3A31]/10 hover:bg-[#DB3A31] active:scale-95 rounded-lg transition-all shadow-xs border border-[#DB3A31]/40 shrink-0 cursor-pointer hover:shadow-sm"
          title="Clear Visual Board Canvas (or Master Clear)"
          aria-label="Clear Visual Board"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline font-bold text-[11px]">Clear</span>
        </button>

        {/* Unselected Tab Preview Set Below the Cursor */}
        {hoveredUnselected && (
          <div
            className="fixed pointer-events-none z-[200] px-3 py-2 rounded-xl bg-[#1F3E22]/95 text-[#F8EBE8] dark:bg-[#102213]/95 dark:text-[#F8EBE8] text-xs shadow-2xl border border-[#709654]/50 flex flex-col gap-1 transform -translate-x-1/2 backdrop-blur-md transition-all duration-75 select-none"
            style={{
              left: Math.max(100, Math.min(window.innerWidth - 100, cursorPos.x)),
              top: cursorPos.y + 18,
            }}
          >
            <div className="flex items-center gap-2 font-bold text-[11px]">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                style={{ backgroundColor: hoveredUnselected.color }}
              />
              <span className="truncate max-w-[180px]">{hoveredUnselected.board.name}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 dark:bg-white/15 ml-auto">
                {hoveredUnselected.board.nodes.length} nodes
              </span>
            </div>
            <div className="text-[10px] text-[#F8EBE8]/80 max-w-[220px] line-clamp-2 leading-relaxed">
              {hoveredUnselected.board.description || 'Canvas workspace board'}
            </div>
            <div className="text-[9px] text-[#DF9C56] font-medium flex items-center gap-1 pt-0.5 border-t border-white/10">
              <span>Click to select and pass to side</span>
            </div>
          </div>
        )}

        {/* Board Dropdown / Management Menu - placed outside the horizontal scroll container */}
        <div className="relative shrink-0 overflow-visible">
          <button
            onClick={() => setBoardMenuOpen(!boardMenuOpen)}
            className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 rounded-lg hover:bg-white/80 dark:hover:bg-slate-800 transition-colors border border-[#709654]/30 bg-white/60 dark:bg-[#152816]"
            title="Board Management & Templates"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {boardMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-[100]"
                onClick={() => setBoardMenuOpen(false)}
              />
              <div className="absolute left-0 top-full mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-[101] py-1.5 text-xs text-[#1F3E22] dark:text-[#F8EBE8]">
                <div className="px-3 py-1.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 pb-1 mb-0.5">
                  <span>Workspace Boards ({boards.length})</span>
                  {boards.length > 1 && (
                    <button
                      onClick={() => {
                        onDeleteAllBoards?.();
                        setBoardMenuOpen(false);
                      }}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950/60 text-[#DB3A31] dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/80 transition-colors flex items-center gap-1 cursor-pointer font-bold lowercase"
                      title="Combined Delete All: Delete all extra boards and reset to 1 clean default board"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                      <span>Delete All</span>
                    </button>
                  )}
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {boards.map((b) => (
                    <div
                      key={b.id}
                      className={`flex items-center justify-between px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/70 cursor-pointer ${
                        b.id === activeBoardId ? 'bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'
                      }`}
                      onClick={() => {
                        onSelectBoard(b.id);
                        setBoardMenuOpen(false);
                      }}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {getBoardIcon(b.icon)}
                        <div className="truncate">
                          <div className="font-medium truncate">{b.name}</div>
                          <div className="text-[10px] text-slate-400 truncate">{b.description}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onDuplicateBoard(b.id)}
                          className="p-1 hover:text-indigo-600 rounded text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                          title="Duplicate board"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => {
                            onClearBoard?.(b.id);
                            setBoardMenuOpen(false);
                          }}
                          className="p-1 hover:text-[#DB3A31] rounded text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                          title={`Clear all nodes on ${b.name}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                        {boards.length > 1 && (
                          <button
                            onClick={() => onDeleteBoard(b.id)}
                            className="p-1 hover:text-rose-600 rounded text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                            title="Delete board"
                          >
                            <Trash2 className="w-3 h-3 text-red-500" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 mt-1 pt-1 px-1 space-y-0.5">
                  <button
                    onClick={() => {
                      setBoardMenuOpen(false);
                      onNewBoard();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-medium cursor-pointer"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>Create New Visual Board</span>
                  </button>
                  {boards.length > 1 && (
                    <button
                      onClick={() => {
                        setBoardMenuOpen(false);
                        onDeleteAllBoards?.();
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 text-rose-600 dark:text-rose-400 font-medium cursor-pointer"
                      title="Combined Delete All: Wipe all visual boards and return to a single fresh board"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      <span>Combined Delete All Boards</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setBoardMenuOpen(false);
                      setClearModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 text-[#DB3A31] font-medium cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Board / Master Clear</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Zone 3: Primary Action & Utilities */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* GitHub Sync Button */}
        {onOpenGithubSync && (
          <button
            onClick={onOpenGithubSync}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-[#1F3E22] dark:text-[#F8EBE8] bg-[#709654]/15 hover:bg-[#709654]/25 rounded-lg transition-colors border border-[#709654]/40 cursor-pointer shadow-xs"
            title="Sync, upload, and download code and project files with GitHub"
            aria-label="Sync GitHub"
          >
            <FolderGit2 className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 stroke-[2.2]" />
            <span className="hidden sm:inline text-[11px] font-bold">GitHub Sync</span>
          </button>
        )}

        {/* Projects Library Button */}
        {onOpenProjectsManager && (
          <button
            onClick={onOpenProjectsManager}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-[#1F3E22] dark:text-[#F8EBE8] bg-white/70 dark:bg-[#152816] hover:bg-white dark:hover:bg-[#1F3E22] rounded-lg transition-colors border border-[#709654]/30 cursor-pointer shadow-xs"
            title={`Projects Library (${savedProjectsCount ?? 0} saved)`}
            aria-label="Projects Library"
          >
            <Folder className="w-3.5 h-3.5 text-[#709654]" />
            <span className="hidden md:inline text-[11px]">Projects</span>
            {(savedProjectsCount ?? 0) > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#871201] text-white text-[9px] font-bold">
                {savedProjectsCount}
              </span>
            )}
          </button>
        )}

        {/* Import / Export JSON */}
        <label
          className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
          title="Import Project / Workspace JSON from Computer"
        >
          <Upload className="w-4 h-4" />
          <input
            type="file"
            accept=".json"
            onChange={onImportBoards}
            className="hidden"
          />
        </label>
        <button
          onClick={onExportBoards}
          className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          title="Export / Save Project File to Computer (Prompts folder location)"
        >
          <Download className="w-4 h-4" />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Sync Organizer Items to Canvas Main Window */}
        {onSyncOrganizerItems && (
          <button
            onClick={onSyncOrganizerItems}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#1F3E22] dark:text-[#F8EBE8] bg-[#AFD1C2] dark:bg-[#3B5D37]/80 hover:bg-[#3B5D37] hover:text-[#F8EBE8] active:scale-98 rounded-lg transition-all shadow-xs whitespace-nowrap shrink-0 cursor-pointer"
            title="Sync all organizer items onto main window canvas"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Canvas</span>
          </button>
        )}

        {/* Primary Action Button: Add Canvas Node */}
        <button
          onClick={onAddQuickNode}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-[#F8EBE8] bg-[#3B5D37] hover:bg-[#1F3E22] active:scale-98 rounded-lg transition-colors shadow-xs whitespace-nowrap shrink-0 cursor-pointer"
          title="Add a new node / service block to active visual board canvas"
          aria-label="Add Node"
        >
          <Plus className="w-3.5 h-3.5 shrink-0" />
          <div className="flex flex-col text-left leading-tight">
            <span className="font-bold text-[11px] leading-tight">Add Node</span>
            <span className="text-[9px] text-[#AFD1C2] font-normal leading-tight hidden sm:inline">
              Canvas Service Block
            </span>
          </div>
        </button>
      </div>

      {/* Clear Visual Board / Master Clear Modal Overlay */}
      {clearModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#F8EBE8] dark:bg-[#1A331C] border-2 border-[#DB3A31] rounded-2xl p-5 max-w-lg w-full shadow-2xl space-y-4 select-none">
            <div className="flex items-center gap-2.5 text-[#DB3A31]">
              <div className="p-2 rounded-xl bg-[#DB3A31]/15 text-[#DB3A31]">
                <Trash2 className="w-5 h-5 shrink-0" />
              </div>
              <h3 className="font-bold text-sm text-[#1F3E22] dark:text-[#F8EBE8]">
                Clear Board / Delete Canvas Boards / Master Clear
              </h3>
            </div>
            <p className="text-xs text-[#709654] dark:text-[#AFD1C2] leading-relaxed">
              Clear all nodes on <span className="font-bold text-[#1F3E22] dark:text-[#F8EBE8]">&quot;{boards.find((b) => b.id === activeBoardId)?.name || 'active board'}&quot;</span> ({boards.find((b) => b.id === activeBoardId)?.nodes.length || 0} nodes), select which visual boards to delete from list, or trigger a workspace Master Clear (wipes visual boards, organizer items, and all category div types).
            </p>

            {/* Checklist with tick marks for selecting extra boards to delete (Excluding Default Board) */}
            {boards.length > 1 && (
              <div className="space-y-2 border-t border-b border-[#709654]/20 py-3">
                <div className="flex items-center justify-between text-xs font-semibold text-[#1F3E22] dark:text-[#F8EBE8]">
                  <span className="flex items-center gap-1.5 font-bold">
                    <Trash2 className="w-3.5 h-3.5 text-[#DB3A31]" />
                    <span>Select Canvas Boards to Delete ({selectedBoardsToDelete.length}/{boards.length - 1} Ticked):</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const extraIds = boards.slice(1).map((b) => b.id);
                      if (selectedBoardsToDelete.length === extraIds.length) {
                        setSelectedBoardsToDelete([]);
                      } else {
                        setSelectedBoardsToDelete(extraIds);
                      }
                    }}
                    className="text-[10px] text-[#3B5D37] dark:text-[#AFD1C2] hover:underline cursor-pointer font-bold px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10"
                  >
                    {selectedBoardsToDelete.length === boards.length - 1 ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                  {boards.slice(1).map((board) => {
                    const isSelected = selectedBoardsToDelete.includes(board.id);
                    return (
                      <div
                        key={board.id}
                        onClick={() => {
                          setSelectedBoardsToDelete((prev) =>
                            isSelected ? prev.filter((id) => id !== board.id) : [...prev, board.id]
                          );
                        }}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[#DB3A31]/10 border-[#DB3A31]/50 text-[#1F3E22] dark:text-[#F8EBE8]'
                            : 'bg-white/50 dark:bg-black/20 border-[#709654]/20 text-[#1F3E22]/60 dark:text-[#F8EBE8]/60 hover:bg-white/80 dark:hover:bg-black/40'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                              isSelected
                                ? 'bg-[#DB3A31] border-[#DB3A31] text-white'
                                : 'border-[#709654]/40 bg-white dark:bg-[#152816]'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <div className="flex items-center gap-2 truncate">
                            {getBoardIcon(board.icon)}
                            <span className="font-semibold truncate">{board.name}</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 shrink-0">
                          {board.nodes.length} nodes
                        </span>
                      </div>
                    );
                  })}
                </div>

                <p className="text-[10px] text-[#709654] dark:text-[#AFD1C2] italic">
                  * Default Board (&quot;{boards[0]?.name}&quot;) is protected and NOT included in the deletion list.
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-3 border-t border-[#709654]/20 flex-wrap">
              <button
                onClick={() => setClearModalOpen(false)}
                className="w-full sm:w-auto px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 text-[#1F3E22] dark:text-[#F8EBE8] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onClearBoard?.(activeBoardId);
                  setClearModalOpen(false);
                }}
                className="w-full sm:w-auto px-3.5 py-1.5 text-xs font-bold rounded-xl border border-[#DB3A31]/50 text-[#DB3A31] hover:bg-[#DB3A31]/10 transition-colors cursor-pointer"
                title="Clear all nodes and connectors on the active visual board"
              >
                Clear Current Board
              </button>
              {boards.length > 1 && (
                <button
                  onClick={() => {
                    if (selectedBoardsToDelete.length > 0) {
                      if (onDeleteMultipleBoards) {
                        onDeleteMultipleBoards(selectedBoardsToDelete);
                      } else {
                        selectedBoardsToDelete.forEach((id) => onDeleteBoard(id));
                      }
                      setClearModalOpen(false);
                    }
                  }}
                  disabled={selectedBoardsToDelete.length === 0}
                  className={`w-full sm:w-auto px-3.5 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    selectedBoardsToDelete.length > 0
                      ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
                      : 'bg-gray-300 dark:bg-gray-800 text-gray-500 cursor-not-allowed opacity-50'
                  }`}
                  title="Delete all ticked canvas boards from list"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Delete Ticked Boards ({selectedBoardsToDelete.length})</span>
                </button>
              )}
              <button
                onClick={() => {
                  onMasterClear?.();
                  setClearModalOpen(false);
                }}
                className="w-full sm:w-auto px-4 py-1.5 text-xs font-bold rounded-xl bg-[#DB3A31] hover:bg-[#871201] text-white shadow-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                title="Master Clear: Wipes all visual boards canvas, organizer items, and category div types"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Master Clear Everything</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
