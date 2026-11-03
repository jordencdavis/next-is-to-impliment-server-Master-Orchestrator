import React, { useState, useEffect } from 'react';
import { 
  CanvasNode, 
  NodeType, 
  NodeStatus, 
  KanbanColumn, 
  KanbanCard 
} from '../types/orchestrator';
import { 
  Wrench, 
  AppWindow, 
  FolderGit2, 
  Database, 
  StickyNote, 
  Kanban, 
  Play, 
  ExternalLink, 
  MoreHorizontal, 
  Plus, 
  Check, 
  ChevronRight, 
  ChevronLeft,
  Trash2,
  Activity,
  Layers,
  Sparkles,
  Terminal,
  X,
  Palette,
  ArrowUpRight
} from 'lucide-react';

const renderTextWithLinks = (text: string | undefined, defaultPlaceholder?: string) => {
  if (!text) {
    return defaultPlaceholder ? <span className="italic opacity-60">{defaultPlaceholder}</span> : null;
  }

  const urlPattern = /((?:https?|postgres|redis|mongodb|ws|wss):\/\/[^\s]+|www\.[a-zA-Z0-9-]+\.[^\s]+|[a-zA-Z0-9-]+\.(?:io|com|net|org|dev|app|co|ai|gov|edu|internal)(?::\d+)?(?:\/[^\s]*)?)/gi;

  const parts = text.split(urlPattern);

  return parts.map((part, index) => {
    if (!part) return null;

    const isLink =
      /^(?:https?|postgres|redis|mongodb|ws|wss):\/\//i.test(part) ||
      /^www\./i.test(part) ||
      /^[a-zA-Z0-9-]+\.(?:io|com|net|org|dev|app|co|ai|gov|edu|internal)(?::\d+)?(?:\/[^\s]*)?$/i.test(part);

    if (isLink) {
      let targetHref = part;
      if (!/^[a-zA-Z]+:\/\//i.test(targetHref)) {
        targetHref = `https://${part}`;
      }

      return (
        <a
          key={index}
          href={targetHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.5 rounded text-[10px] mx-0.5 shrink-0 align-middle shadow-2xs"
          title={`Click arrow to open link: ${targetHref}`}
        >
          <ArrowUpRight className="w-3 h-3 stroke-[2.8] text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span className="truncate max-w-[200px]">{part}</span>
        </a>
      );
    }

    return <span key={index}>{part}</span>;
  });
};

export const NOTE_THEMES: Record<string, {
  name: string;
  bg: string;
  border: string;
  text: string;
  headerBorder: string;
  swatch: string;
}> = {
  yellow: {
    name: 'Warm Amber',
    bg: 'bg-[#DF9C56]/20 dark:bg-[#DF9C56]/25',
    border: 'border-[#DF9C56]',
    text: 'text-[#871201] dark:text-[#F8EBE8]',
    headerBorder: 'border-[#DF9C56]/30',
    swatch: '#DF9C56',
  },
  green: {
    name: 'Sage Mint',
    bg: 'bg-[#3B5D37]/20 dark:bg-[#3B5D37]/30',
    border: 'border-[#3B5D37]',
    text: 'text-[#1F3E22] dark:text-[#AFD1C2]',
    headerBorder: 'border-[#3B5D37]/30',
    swatch: '#3B5D37',
  },
  rose: {
    name: 'Dusk Rose',
    bg: 'bg-[#DB3A31]/15 dark:bg-[#DB3A31]/25',
    border: 'border-[#DB3A31]',
    text: 'text-[#871201] dark:text-[#F8EBE8]',
    headerBorder: 'border-[#DB3A31]/30',
    swatch: '#DB3A31',
  },
  blue: {
    name: 'Ocean Teal',
    bg: 'bg-[#AFD1C2]/35 dark:bg-[#AFD1C2]/20',
    border: 'border-[#3B5D37]',
    text: 'text-[#1F3E22] dark:text-[#AFD1C2]',
    headerBorder: 'border-[#3B5D37]/30',
    swatch: '#709654',
  },
  purple: {
    name: 'Lavender Dusk',
    bg: 'bg-purple-100/70 dark:bg-purple-950/40',
    border: 'border-purple-400 dark:border-purple-600',
    text: 'text-purple-950 dark:text-purple-200',
    headerBorder: 'border-purple-300 dark:border-purple-700',
    swatch: '#9333ea',
  },
  slate: {
    name: 'Cool Slate',
    bg: 'bg-slate-100 dark:bg-slate-800/70',
    border: 'border-slate-300 dark:border-slate-600',
    text: 'text-slate-800 dark:text-slate-200',
    headerBorder: 'border-slate-300 dark:border-slate-700',
    swatch: '#64748b',
  },
  white: {
    name: 'Paper White',
    bg: 'bg-white dark:bg-slate-900',
    border: 'border-slate-300 dark:border-slate-700 shadow-md',
    text: 'text-slate-900 dark:text-slate-100',
    headerBorder: 'border-slate-200 dark:border-slate-800',
    swatch: '#f8fafc',
  },
};

export const KANBAN_THEMES: Record<string, {
  name: string;
  headerBg: string;
  headerText: string;
  containerBg: string;
  containerBorder: string;
  badgeBg: string;
  swatch: string;
  columns: Array<{
    bg: string;
    header: string;
    tagBg: string;
    cardBorder: string;
  }>;
}> = {
  basil: {
    name: 'Basil & Sage',
    headerBg: 'bg-[#709654]',
    headerText: 'text-[#F8EBE8]',
    containerBg: 'bg-[#F8EBE8] dark:bg-[#182E1A]',
    containerBorder: 'border-[#709654]',
    badgeBg: 'bg-[#1F3E22]/50 text-[#F8EBE8]',
    swatch: '#709654',
    columns: [
      {
        bg: 'bg-[#DF9C56]/15 dark:bg-[#DF9C56]/10 border-[#DF9C56]/50',
        header: 'bg-[#DF9C56]/30 text-[#871201] dark:text-[#DF9C56] border-b-2 border-[#DF9C56]',
        tagBg: 'text-[#871201] dark:text-[#DF9C56] font-bold',
        cardBorder: 'border-l-3 border-l-[#DF9C56]',
      },
      {
        bg: 'bg-[#DB3A31]/15 dark:bg-[#DB3A31]/10 border-[#DB3A31]/50',
        header: 'bg-[#DB3A31]/25 text-[#DB3A31] dark:text-[#F8EBE8] border-b-2 border-[#DB3A31]',
        tagBg: 'text-[#DB3A31] dark:text-[#F8EBE8] font-bold',
        cardBorder: 'border-l-3 border-l-[#DB3A31]',
      },
      {
        bg: 'bg-[#3B5D37]/15 dark:bg-[#3B5D37]/10 border-[#3B5D37]/50',
        header: 'bg-[#3B5D37]/30 text-[#1F3E22] dark:text-[#AFD1C2] border-b-2 border-[#3B5D37]',
        tagBg: 'text-[#3B5D37] dark:text-[#AFD1C2] font-bold',
        cardBorder: 'border-l-3 border-l-[#3B5D37]',
      },
    ],
  },
  toasted: {
    name: 'Toasted Amber',
    headerBg: 'bg-[#DF9C56]',
    headerText: 'text-[#871201]',
    containerBg: 'bg-[#fffaf3] dark:bg-[#2b1f13]',
    containerBorder: 'border-[#DF9C56]',
    badgeBg: 'bg-[#871201]/20 text-[#871201]',
    swatch: '#DF9C56',
    columns: [
      {
        bg: 'bg-amber-100/60 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700',
        header: 'bg-amber-200/80 text-amber-900 dark:text-amber-200 border-b-2 border-amber-400',
        tagBg: 'text-amber-800 dark:text-amber-300 font-bold',
        cardBorder: 'border-l-3 border-l-amber-500',
      },
      {
        bg: 'bg-orange-100/60 dark:bg-orange-950/30 border-orange-300 dark:border-orange-700',
        header: 'bg-orange-200/80 text-orange-900 dark:text-orange-200 border-b-2 border-orange-400',
        tagBg: 'text-orange-800 dark:text-orange-300 font-bold',
        cardBorder: 'border-l-3 border-l-orange-500',
      },
      {
        bg: 'bg-emerald-100/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700',
        header: 'bg-emerald-200/80 text-emerald-900 dark:text-emerald-200 border-b-2 border-emerald-400',
        tagBg: 'text-emerald-800 dark:text-emerald-300 font-bold',
        cardBorder: 'border-l-3 border-l-emerald-500',
      },
    ],
  },
  dusk: {
    name: 'Dusk Crimson',
    headerBg: 'bg-[#DB3A31]',
    headerText: 'text-[#F8EBE8]',
    containerBg: 'bg-[#fff5f5] dark:bg-[#2a1314]',
    containerBorder: 'border-[#DB3A31]',
    badgeBg: 'bg-[#871201]/40 text-[#F8EBE8]',
    swatch: '#DB3A31',
    columns: [
      {
        bg: 'bg-rose-100/60 dark:bg-rose-950/30 border-rose-300 dark:border-rose-700',
        header: 'bg-rose-200/80 text-rose-900 dark:text-rose-200 border-b-2 border-rose-400',
        tagBg: 'text-rose-800 dark:text-rose-300 font-bold',
        cardBorder: 'border-l-3 border-l-rose-500',
      },
      {
        bg: 'bg-red-100/60 dark:bg-red-950/30 border-red-300 dark:border-red-700',
        header: 'bg-red-200/80 text-red-900 dark:text-red-200 border-b-2 border-red-400',
        tagBg: 'text-red-800 dark:text-red-300 font-bold',
        cardBorder: 'border-l-3 border-l-red-500',
      },
      {
        bg: 'bg-amber-100/60 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700',
        header: 'bg-amber-200/80 text-amber-900 dark:text-amber-200 border-b-2 border-amber-400',
        tagBg: 'text-amber-800 dark:text-amber-300 font-bold',
        cardBorder: 'border-l-3 border-l-amber-500',
      },
    ],
  },
  teal: {
    name: 'Deep Teal',
    headerBg: 'bg-teal-700',
    headerText: 'text-teal-50',
    containerBg: 'bg-teal-50/50 dark:bg-slate-900',
    containerBorder: 'border-teal-600',
    badgeBg: 'bg-teal-900/40 text-teal-100',
    swatch: '#0f766e',
    columns: [
      {
        bg: 'bg-cyan-100/50 dark:bg-cyan-950/30 border-cyan-300 dark:border-cyan-700',
        header: 'bg-cyan-200/70 text-cyan-900 dark:text-cyan-200 border-b-2 border-cyan-400',
        tagBg: 'text-cyan-800 dark:text-cyan-300 font-bold',
        cardBorder: 'border-l-3 border-l-cyan-500',
      },
      {
        bg: 'bg-teal-100/50 dark:bg-teal-950/30 border-teal-300 dark:border-teal-700',
        header: 'bg-teal-200/70 text-teal-900 dark:text-teal-200 border-b-2 border-teal-400',
        tagBg: 'text-teal-800 dark:text-teal-300 font-bold',
        cardBorder: 'border-l-3 border-l-teal-500',
      },
      {
        bg: 'bg-emerald-100/50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700',
        header: 'bg-emerald-200/70 text-emerald-900 dark:text-emerald-200 border-b-2 border-emerald-400',
        tagBg: 'text-emerald-800 dark:text-emerald-300 font-bold',
        cardBorder: 'border-l-3 border-l-emerald-500',
      },
    ],
  },
  purple: {
    name: 'Vibrant Violet',
    headerBg: 'bg-purple-700',
    headerText: 'text-purple-50',
    containerBg: 'bg-purple-50/50 dark:bg-slate-900',
    containerBorder: 'border-purple-600',
    badgeBg: 'bg-purple-900/40 text-purple-100',
    swatch: '#7e22ce',
    columns: [
      {
        bg: 'bg-indigo-100/50 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-700',
        header: 'bg-indigo-200/70 text-indigo-900 dark:text-indigo-200 border-b-2 border-indigo-400',
        tagBg: 'text-indigo-800 dark:text-indigo-300 font-bold',
        cardBorder: 'border-l-3 border-l-indigo-500',
      },
      {
        bg: 'bg-purple-100/50 dark:bg-purple-950/30 border-purple-300 dark:border-purple-700',
        header: 'bg-purple-200/70 text-purple-900 dark:text-purple-200 border-b-2 border-purple-400',
        tagBg: 'text-purple-800 dark:text-purple-300 font-bold',
        cardBorder: 'border-l-3 border-l-purple-500',
      },
      {
        bg: 'bg-fuchsia-100/50 dark:bg-fuchsia-950/30 border-fuchsia-300 dark:border-fuchsia-700',
        header: 'bg-fuchsia-200/70 text-fuchsia-900 dark:text-fuchsia-200 border-b-2 border-fuchsia-400',
        tagBg: 'text-fuchsia-800 dark:text-fuchsia-300 font-bold',
        cardBorder: 'border-l-3 border-l-fuchsia-500',
      },
    ],
  },
  slate: {
    name: 'Modern Slate',
    headerBg: 'bg-slate-800',
    headerText: 'text-slate-100',
    containerBg: 'bg-slate-100 dark:bg-slate-900',
    containerBorder: 'border-slate-700',
    badgeBg: 'bg-black/30 text-slate-200',
    swatch: '#334155',
    columns: [
      {
        bg: 'bg-slate-200/70 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700',
        header: 'bg-slate-300 text-slate-800 dark:bg-slate-700 dark:text-slate-200 border-b-2 border-slate-400',
        tagBg: 'text-slate-700 dark:text-slate-300 font-bold',
        cardBorder: 'border-l-3 border-l-slate-500',
      },
      {
        bg: 'bg-sky-100/50 dark:bg-sky-950/30 border-sky-300 dark:border-sky-700',
        header: 'bg-sky-200 text-sky-900 dark:text-sky-200 border-b-2 border-sky-400',
        tagBg: 'text-sky-800 dark:text-sky-300 font-bold',
        cardBorder: 'border-l-3 border-l-sky-500',
      },
      {
        bg: 'bg-emerald-100/50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700',
        header: 'bg-emerald-200 text-emerald-900 dark:text-emerald-200 border-b-2 border-emerald-400',
        tagBg: 'text-emerald-800 dark:text-emerald-300 font-bold',
        cardBorder: 'border-l-3 border-l-emerald-500',
      },
    ],
  },
};

interface CanvasNodeComponentProps {
  node: CanvasNode;
  isSelected: boolean;
  onSelect: (nodeId: string, e: React.MouseEvent) => void;
  onStartDrag: (nodeId: string, e: React.MouseEvent) => void;
  onStartConnector: (nodeId: string, handle: 'top' | 'right' | 'bottom' | 'left', e: React.MouseEvent) => void;
  onConnectorDropTarget: (nodeId: string, handle: 'top' | 'right' | 'bottom' | 'left') => void;
  onUpdateNode: (updatedNode: CanvasNode) => void;
  onRunNode: (nodeId: string) => void;
  onOpenInspector: (node: CanvasNode) => void;
  onDeleteNode?: (nodeId: string) => void;
  onStartResize?: (nodeId: string, e: React.MouseEvent) => void;
}

export const CanvasNodeComponent: React.FC<CanvasNodeComponentProps> = ({
  node,
  isSelected,
  onSelect,
  onStartDrag,
  onStartConnector,
  onConnectorDropTarget,
  onUpdateNode,
  onRunNode,
  onOpenInspector,
  onDeleteNode,
  onStartResize,
}) => {
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(node.noteContent || '');
  const [newCardTitle, setNewCardTitle] = useState('');
  const [addingCardColId, setAddingCardColId] = useState<string | null>(null);
  const [showNoteThemeMenu, setShowNoteThemeMenu] = useState(false);
  const [showKanbanThemeMenu, setShowKanbanThemeMenu] = useState(false);

  // Double click inline serial number editing
  const [isEditingSN, setIsEditingSN] = useState(false);
  const [snDraft, setSnDraft] = useState(node.serialNumber || '');

  // Double click inline title editing
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(node.title);

  // Sub-text & Heading Inline Editing States (Canvas)
  const [isEditingType, setIsEditingType] = useState(false);
  const [typeDraft, setTypeDraft] = useState(node.type as string);

  const [isEditingEnv, setIsEditingEnv] = useState(false);
  const [envDraft, setEnvDraft] = useState(node.environment || '');

  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState(node.description || '');

  const [isEditingCommand, setIsEditingCommand] = useState(false);
  const [commandDraft, setCommandDraft] = useState(node.command || '');

  const [isEditingEndpoint, setIsEditingEndpoint] = useState(false);
  const [endpointDraft, setEndpointDraft] = useState(node.endpoint || '');

  // Kanban inline editing
  const [editingColId, setEditingColId] = useState<string | null>(null);
  const [colTitleDraft, setColTitleDraft] = useState('');

  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [cardTitleDraft, setCardTitleDraft] = useState('');

  const [editingCardTagId, setEditingCardTagId] = useState<string | null>(null);
  const [cardTagDraft, setCardTagDraft] = useState('');

  // Metrics and Tags inline editing
  const [editingMetricIdx, setEditingMetricIdx] = useState<{ idx: number; field: 'label' | 'value' } | null>(null);
  const [metricDraft, setMetricDraft] = useState('');

  const [editingTagIdx, setEditingTagIdx] = useState<number | null>(null);
  const [tagDraft, setTagDraft] = useState('');

  useEffect(() => {
    setSnDraft(node.serialNumber || '');
    setTitleDraft(node.title);
    setTypeDraft(node.type);
    setEnvDraft(node.environment || '');
    setDescDraft(node.description || '');
    setCommandDraft(node.command || '');
    setEndpointDraft(node.endpoint || '');
  }, [node.serialNumber, node.title, node.type, node.environment, node.description, node.command, node.endpoint]);

  const handleSaveSN = () => {
    const trimmed = snDraft.trim();
    if (trimmed && trimmed !== node.serialNumber) {
      onUpdateNode({ ...node, serialNumber: trimmed });
    } else {
      setSnDraft(node.serialNumber || '');
    }
    setIsEditingSN(false);
  };

  const handleSaveTitle = () => {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== node.title) {
      onUpdateNode({ ...node, title: trimmed });
    } else {
      setTitleDraft(node.title);
    }
    setIsEditingTitle(false);
  };

  const handleSaveType = () => {
    const trimmed = typeDraft.trim().toLowerCase();
    if (trimmed && trimmed !== node.type) {
      onUpdateNode({ ...node, type: trimmed as NodeType });
    }
    setIsEditingType(false);
  };

  const handleSaveEnv = () => {
    const trimmed = envDraft.trim();
    onUpdateNode({ ...node, environment: trimmed || undefined });
    setIsEditingEnv(false);
  };

  const handleSaveDesc = () => {
    const trimmed = descDraft.trim();
    onUpdateNode({ ...node, description: trimmed || undefined });
    setIsEditingDesc(false);
  };

  const handleSaveCommand = () => {
    const trimmed = commandDraft.trim();
    onUpdateNode({ ...node, command: trimmed || undefined });
    setIsEditingCommand(false);
  };

  const handleSaveEndpoint = () => {
    const trimmed = endpointDraft.trim();
    onUpdateNode({ ...node, endpoint: trimmed || undefined });
    setIsEditingEndpoint(false);
  };

  const handleSaveColumnTitle = (colId: string) => {
    const trimmed = colTitleDraft.trim();
    if (trimmed && node.kanbanColumns) {
      const updated = node.kanbanColumns.map((c) =>
        c.id === colId ? { ...c, title: trimmed } : c
      );
      onUpdateNode({ ...node, kanbanColumns: updated });
    }
    setEditingColId(null);
  };

  const handleSaveCardTitle = (cardId: string, colId: string) => {
    const trimmed = cardTitleDraft.trim();
    if (trimmed && node.kanbanColumns) {
      const updated = node.kanbanColumns.map((c) =>
        c.id === colId
          ? {
              ...c,
              cards: c.cards.map((card) =>
                card.id === cardId ? { ...card, title: trimmed } : card
              ),
            }
          : c
      );
      onUpdateNode({ ...node, kanbanColumns: updated });
    }
    setEditingCardId(null);
  };

  const handleSaveCardTag = (cardId: string, colId: string) => {
    const trimmed = cardTagDraft.trim();
    if (node.kanbanColumns) {
      const updated = node.kanbanColumns.map((c) =>
        c.id === colId
          ? {
              ...c,
              cards: c.cards.map((card) =>
                card.id === cardId ? { ...card, tag: trimmed || 'Task' } : card
              ),
            }
          : c
      );
      onUpdateNode({ ...node, kanbanColumns: updated });
    }
    setEditingCardTagId(null);
  };

  const handleSaveTag = (idx: number) => {
    const trimmed = tagDraft.trim();
    if (node.tags) {
      const updated = [...node.tags];
      if (trimmed) {
        updated[idx] = trimmed.replace(/^#/, '');
      } else {
        updated.splice(idx, 1);
      }
      onUpdateNode({ ...node, tags: updated });
    }
    setEditingTagIdx(null);
  };

  const handleAddTag = () => {
    const existing = node.tags || [];
    onUpdateNode({ ...node, tags: [...existing, 'new-tag'] });
    setEditingTagIdx(existing.length);
    setTagDraft('new-tag');
  };

  const handleSaveMetric = (idx: number, field: 'label' | 'value') => {
    const trimmed = metricDraft.trim();
    if (node.metrics && node.metrics[idx]) {
      const updated = [...node.metrics];
      updated[idx] = { ...updated[idx], [field]: trimmed };
      onUpdateNode({ ...node, metrics: updated });
    }
    setEditingMetricIdx(null);
  };

  const getNodeTheme = (type: NodeType) => {
    switch (type) {
      case 'tool':
        return {
          containerBorder: 'border-2 border-[#DF9C56] shadow-md hover:border-[#871201]',
          headerBg: 'bg-[#DF9C56] text-[#871201] border-b border-[#DF9C56]',
          iconWrapper: 'p-1.5 rounded-lg bg-[#871201] text-[#DF9C56] shrink-0',
          typeBadge: 'text-[#871201] bg-[#DF9C56]/35 border border-[#871201]/30 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider',
          handleBorder: 'border-[#DF9C56]',
          handleDot: 'bg-[#DF9C56]',
          activeRing: 'ring-3 ring-[#DF9C56] shadow-xl shadow-[#DF9C56]/30',
        };
      case 'app':
        return {
          containerBorder: 'border-2 border-[#C61B31] shadow-md hover:border-[#871201]',
          headerBg: 'bg-[#C61B31] text-[#F8EBE8] border-b border-[#C61B31]',
          iconWrapper: 'p-1.5 rounded-lg bg-[#871201] text-[#F8EBE8] shrink-0',
          typeBadge: 'text-[#C61B31] bg-[#C61B31]/15 border border-[#C61B31]/40 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider',
          handleBorder: 'border-[#C61B31]',
          handleDot: 'bg-[#C61B31]',
          activeRing: 'ring-3 ring-[#C61B31] shadow-xl shadow-[#C61B31]/30',
        };
      case 'project':
        return {
          containerBorder: 'border-2 border-[#DB3A31] shadow-md hover:border-[#871201]',
          headerBg: 'bg-[#DB3A31] text-[#F8EBE8] border-b border-[#DB3A31]',
          iconWrapper: 'p-1.5 rounded-lg bg-[#871201] text-[#F8EBE8] shrink-0',
          typeBadge: 'text-[#DB3A31] bg-[#DB3A31]/15 border border-[#DB3A31]/40 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider',
          handleBorder: 'border-[#DB3A31]',
          handleDot: 'bg-[#DB3A31]',
          activeRing: 'ring-3 ring-[#DB3A31] shadow-xl shadow-[#DB3A31]/30',
        };
      case 'resource':
        return {
          containerBorder: 'border-2 border-[#3B5D37] shadow-md hover:border-[#1F3E22]',
          headerBg: 'bg-[#3B5D37] text-[#AFD1C2] border-b border-[#3B5D37]',
          iconWrapper: 'p-1.5 rounded-lg bg-[#1F3E22] text-[#AFD1C2] shrink-0',
          typeBadge: 'text-[#3B5D37] dark:text-[#AFD1C2] bg-[#3B5D37]/20 border border-[#3B5D37]/40 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider',
          handleBorder: 'border-[#3B5D37]',
          handleDot: 'bg-[#3B5D37]',
          activeRing: 'ring-3 ring-[#3B5D37] shadow-xl shadow-[#3B5D37]/30',
        };
      case 'kanban':
        return {
          containerBorder: 'border-2 border-[#709654] shadow-md hover:border-[#1F3E22]',
          headerBg: 'bg-[#709654] text-[#F8EBE8] border-b border-[#709654]',
          iconWrapper: 'p-1.5 rounded-lg bg-[#1F3E22] text-[#F8EBE8] shrink-0',
          typeBadge: 'text-[#709654] dark:text-[#AFD1C2] bg-[#709654]/20 border border-[#709654]/40 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider',
          handleBorder: 'border-[#709654]',
          handleDot: 'bg-[#709654]',
          activeRing: 'ring-3 ring-[#709654] shadow-xl shadow-[#709654]/30',
        };
      case 'note':
      default:
        return {
          containerBorder: 'border-2 border-[#DF9C56] shadow-md',
          headerBg: 'bg-[#DF9C56] text-[#871201]',
          iconWrapper: 'p-1.5 rounded-lg bg-[#871201] text-[#DF9C56] shrink-0',
          typeBadge: 'text-[#871201] bg-[#DF9C56]/30 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider',
          handleBorder: 'border-[#DF9C56]',
          handleDot: 'bg-[#DF9C56]',
          activeRing: 'ring-3 ring-[#DF9C56] shadow-xl shadow-[#DF9C56]/30',
        };
    }
  };

  const theme = getNodeTheme(node.type);

  const getNodeBorder = () => {
    if (isSelected) {
      return theme.activeRing;
    }
    return theme.containerBorder;
  };

  const getStatusColor = (status: NodeStatus) => {
    switch (status) {
      case 'running': return 'bg-[#DF9C56] ring-4 ring-[#DF9C56]/30 animate-pulse';
      case 'success': return 'bg-[#3B5D37] ring-2 ring-[#3B5D37]/30';
      case 'error': return 'bg-[#DB3A31] ring-2 ring-[#DB3A31]/30';
      case 'warning': return 'bg-[#DF9C56] ring-2 ring-[#DF9C56]/30';
      default: return 'bg-[#709654]/40';
    }
  };

  const getNodeIcon = (type: NodeType) => {
    switch (type) {
      case 'tool': return <Wrench className="w-3.5 h-3.5 text-[#DF9C56]" />;
      case 'app': return <AppWindow className="w-3.5 h-3.5 text-[#C61B31]" />;
      case 'project': return <FolderGit2 className="w-3.5 h-3.5 text-[#DB3A31]" />;
      case 'resource': return <Database className="w-3.5 h-3.5 text-[#3B5D37] dark:text-[#AFD1C2]" />;
      case 'note': return <StickyNote className="w-3.5 h-3.5 text-[#DF9C56]" />;
      case 'kanban': return <Kanban className="w-3.5 h-3.5 text-[#709654]" />;
    }
  };

  // Note theme resolver
  const getNoteTheme = (color?: string) => {
    if (color && NOTE_THEMES[color]) {
      return NOTE_THEMES[color];
    }
    return NOTE_THEMES.yellow;
  };

  // Kanban theme resolver
  const getKanbanTheme = (themeKey?: string) => {
    if (themeKey && KANBAN_THEMES[themeKey]) {
      return KANBAN_THEMES[themeKey];
    }
    return KANBAN_THEMES.basil;
  };

  // Kanban Card Handlers
  const handleMoveCard = (cardId: string, fromColId: string, direction: 'left' | 'right') => {
    if (!node.kanbanColumns) return;
    const colIdx = node.kanbanColumns.findIndex((c) => c.id === fromColId);
    if (colIdx === -1) return;
    const targetIdx = direction === 'left' ? colIdx - 1 : colIdx + 1;
    if (targetIdx < 0 || targetIdx >= node.kanbanColumns.length) return;

    const sourceCol = node.kanbanColumns[colIdx];
    const targetCol = node.kanbanColumns[targetIdx];
    const card = sourceCol.cards.find((c) => c.id === cardId);
    if (!card) return;

    const updatedCols = node.kanbanColumns.map((c, idx) => {
      if (idx === colIdx) {
        return { ...c, cards: c.cards.filter((item) => item.id !== cardId) };
      }
      if (idx === targetIdx) {
        return { ...c, cards: [...c.cards, card] };
      }
      return c;
    });

    onUpdateNode({ ...node, kanbanColumns: updatedCols });
  };

  const handleAddKanbanCard = (colId: string) => {
    if (!newCardTitle.trim() || !node.kanbanColumns) return;
    const newCard: KanbanCard = {
      id: `kc-${Date.now()}`,
      title: newCardTitle.trim(),
      tag: 'Task',
      priority: 'medium',
      assignee: 'Dev',
    };

    const updatedCols = node.kanbanColumns.map((c) => {
      if (c.id === colId) {
        return { ...c, cards: [...c.cards, newCard] };
      }
      return c;
    });

    onUpdateNode({ ...node, kanbanColumns: updatedCols });
    setNewCardTitle('');
    setAddingCardColId(null);
  };

  const handleAddColumn = () => {
    const currentCols = node.kanbanColumns || [];
    const newCol: KanbanColumn = {
      id: `col-${Date.now()}`,
      title: `Column ${currentCols.length + 1}`,
      cards: [],
    };
    onUpdateNode({ ...node, kanbanColumns: [...currentCols, newCol] });
  };

  const handleDeleteCard = (cardId: string, colId: string) => {
    if (!node.kanbanColumns) return;
    const updatedCols = node.kanbanColumns.map((c) =>
      c.id === colId
        ? { ...c, cards: c.cards.filter((card) => card.id !== cardId) }
        : c
    );
    onUpdateNode({ ...node, kanbanColumns: updatedCols });
  };

  const handleDeleteColumn = (colId: string) => {
    if (!node.kanbanColumns) return;
    const updatedCols = node.kanbanColumns.filter((c) => c.id !== colId);
    onUpdateNode({ ...node, kanbanColumns: updatedCols });
  };

  // Connection port handles
  const renderHandle = (position: 'top' | 'right' | 'bottom' | 'left') => {
    const posClasses = {
      top: '-top-2 left-1/2 -translate-x-1/2',
      right: '-right-2 top-1/2 -translate-y-1/2',
      bottom: '-bottom-2 left-1/2 -translate-x-1/2',
      left: '-left-2 top-1/2 -translate-y-1/2',
    }[position];

    return (
      <div
        className={`absolute ${posClasses} z-20 group/handle cursor-crosshair`}
        onMouseDown={(e) => {
          e.stopPropagation();
          onStartConnector(node.id, position, e);
        }}
        onMouseUp={(e) => {
          e.stopPropagation();
          onConnectorDropTarget(node.id, position);
        }}
      >
        <div className={`w-3.5 h-3.5 rounded-full bg-white dark:bg-slate-900 border-2 ${theme.handleBorder} hover:scale-130 transition-transform shadow-xs flex items-center justify-center`}>
          <div className={`w-1 h-1 rounded-full ${theme.handleDot}`} />
        </div>
      </div>
    );
  };

  const isLightColor = (hex?: string) => {
    if (!hex) return false;
    const cleanHex = hex.replace('#', '');
    if (cleanHex.length !== 6 && cleanHex.length !== 3) return false;
    const fullHex = cleanHex.length === 3 
      ? cleanHex.split('').map(c => c + c).join('') 
      : cleanHex;
    const r = parseInt(fullHex.substring(0, 2), 16);
    const g = parseInt(fullHex.substring(2, 4), 16);
    const b = parseInt(fullHex.substring(4, 6), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 140;
  };

  const noteTheme = getNoteTheme(node.noteColor);
  const kanbanTheme = getKanbanTheme(node.kanbanTheme);

  return (
    <div
      style={{
        transform: `translate(${node.x}px, ${node.y}px)`,
        width: node.width ? `${node.width}px` : undefined,
        height: node.height ? `${node.height}px` : undefined,
      }}
      className={`absolute select-none cursor-move rounded-xl transition-shadow ${isSelected ? 'z-30 shadow-2xl' : 'z-10'} ${getNodeBorder()}`}
      onClick={(e) => onSelect(node.id, e)}
      onMouseDown={(e) => onStartDrag(node.id, e)}
    >
      {/* Port Handles */}
      {renderHandle('top')}
      {renderHandle('right')}
      {renderHandle('bottom')}
      {renderHandle('left')}

      {/* Note Node Variant */}
      {node.type === 'note' ? (
        <div 
          style={{
            borderColor: node.customColor || undefined,
            borderWidth: node.customColor ? '2px' : undefined,
            height: node.height ? `${node.height}px` : undefined,
          }}
          className={`rounded-xl border ${noteTheme.border} ${noteTheme.bg} ${noteTheme.text} min-w-[220px] h-full flex flex-col relative group overflow-hidden shadow-sm`}
        >
          {/* Note Header Banner - updates header color when colour changes */}
          <div 
            style={{
              backgroundColor: node.customColor || undefined,
              color: node.customColor 
                ? (isLightColor(node.customColor) ? '#1F3E22' : '#FFFFFF') 
                : undefined,
              borderColor: node.customColor 
                ? (isLightColor(node.customColor) ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.18)') 
                : undefined,
            }}
            className={`flex items-center justify-between gap-2 px-3.5 py-2.5 border-b shrink-0 transition-colors ${
              !node.customColor ? `${noteTheme.headerBorder} bg-black/5 dark:bg-white/5` : ''
            }`}
          >
            <div 
              className="flex items-center gap-1.5 font-bold text-xs flex-1 min-w-0"
              style={{ fontSize: node.fontSize ? `${node.fontSize}px` : undefined }}
            >
              <StickyNote className="w-3.5 h-3.5 opacity-90 shrink-0" />
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
                  className="text-[9px] font-mono font-extrabold bg-amber-100 text-amber-900 px-1 py-0.2 rounded border border-[#DF9C56] outline-none w-14 shrink-0"
                />
              ) : (
                <span
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setIsEditingSN(true);
                    setSnDraft(node.serialNumber || 'SN-01');
                  }}
                  className="text-[9px] font-mono font-extrabold px-1.5 py-0.2 rounded bg-black/15 dark:bg-white/20 border border-black/10 dark:border-white/10 shrink-0 cursor-text hover:underline"
                  title="Double click to edit serial number"
                >
                  {node.serialNumber || 'SN-01'}
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
                      setTitleDraft(node.title);
                      setIsEditingTitle(false);
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onDoubleClick={(e) => e.stopPropagation()}
                  autoFocus
                  className="font-bold text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-1.5 py-0.5 rounded border border-[#DF9C56] shadow-inner focus:outline-none flex-1 min-w-0"
                />
              ) : (
                <span 
                  className="truncate cursor-text hover:underline decoration-dashed flex-1 min-w-0"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setIsEditingTitle(true);
                  }}
                  title="Double click to edit note title"
                >
                  {node.title}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 relative">
              {/* Theme Palette Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNoteThemeMenu(!showNoteThemeMenu);
                  setShowKanbanThemeMenu(false);
                }}
                className={`p-1 rounded opacity-80 hover:opacity-100 transition-colors ${
                  node.customColor
                    ? (isLightColor(node.customColor) ? 'hover:bg-black/10 text-[#1F3E22]' : 'hover:bg-white/20 text-white')
                    : 'hover:bg-black/10 dark:hover:bg-white/10'
                }`}
                title="Change Note Theme & Header Colour"
              >
                <Palette className="w-3.5 h-3.5" />
              </button>

              {/* Note Theme Menu */}
              {showNoteThemeMenu && (
                <div 
                  className="absolute right-0 top-7 z-50 bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 p-2 min-w-[150px] space-y-1 text-slate-800 dark:text-slate-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1 mb-1">
                    Note Theme
                  </div>
                  {Object.entries(NOTE_THEMES).map(([key, t]) => (
                    <button
                      key={key}
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateNode({ ...node, noteColor: key, customColor: t.swatch });
                        setShowNoteThemeMenu(false);
                      }}
                      className={`w-full flex items-center gap-2 px-2 py-1 text-[11px] rounded transition-colors text-left ${
                        (node.noteColor || 'yellow') === key
                          ? 'bg-black/10 dark:bg-white/15 font-bold'
                          : 'hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      <span 
                        className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0" 
                        style={{ backgroundColor: t.swatch }} 
                      />
                      <span className="truncate">{t.name}</span>
                      {(node.noteColor || 'yellow') === key && (
                        <Check className="w-3 h-3 ml-auto shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={() => setEditingNote(!editingNote)}
                className={`text-[10px] font-semibold opacity-80 hover:opacity-100 ${
                  node.customColor
                    ? (isLightColor(node.customColor) ? 'text-[#1F3E22]' : 'text-white')
                    : ''
                }`}
              >
                {editingNote ? 'Done' : 'Edit'}
              </button>
              {onDeleteNode && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteNode(node.id);
                  }}
                  className={`p-0.5 rounded transition-colors ${
                    node.customColor
                      ? (isLightColor(node.customColor) ? 'hover:bg-rose-500/20 text-rose-800' : 'hover:bg-white/20 text-white')
                      : 'text-rose-700 dark:text-rose-400 hover:bg-rose-500/20'
                  }`}
                  title="Delete Note"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="p-3 flex-1 min-h-[50px] overflow-y-auto">
            {editingNote ? (
              <textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                onBlur={() => {
                  onUpdateNode({ ...node, noteContent: noteDraft });
                  setEditingNote(false);
                }}
                autoFocus
                className="w-full h-full min-h-[80px] text-xs bg-white/50 dark:bg-black/30 p-2 rounded border border-black/10 resize-none focus:outline-none"
                rows={4}
              />
            ) : (
              <p className="text-xs leading-relaxed opacity-90 whitespace-pre-wrap">
                {renderTextWithLinks(node.noteContent, 'Double click to add notes...')}
              </p>
            )}
          </div>

          {/* Resize Corner Handle */}
          <div
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onStartResize?.(node.id, e);
            }}
            title="Drag to resize note"
            className="absolute bottom-1 right-1 w-4 h-4 cursor-se-resize flex items-center justify-center opacity-40 group-hover:opacity-100 transition-opacity rounded hover:bg-black/10 dark:hover:bg-white/10 z-20"
          >
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M7 1L1 7M7 4L4 7M7 7H7.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      ) : node.type === 'kanban' ? (
        /* Kanban Element Node Variant with Configurable Overall Theme */
        <div 
          style={{ 
            borderColor: node.customColor || undefined,
            height: node.height ? `${node.height}px` : undefined,
          }}
          className={`rounded-xl border-2 ${kanbanTheme.containerBorder} ${kanbanTheme.containerBg} overflow-hidden min-w-[480px] shadow-md h-full flex flex-col relative group`}
        >
          {/* Header - updates header color when colour changes */}
          <div 
            style={{ 
              backgroundColor: node.customColor || undefined,
              color: node.customColor 
                ? (isLightColor(node.customColor) ? '#1F3E22' : '#FFFFFF') 
                : undefined,
              borderColor: node.customColor 
                ? (isLightColor(node.customColor) ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.18)') 
                : undefined,
            }}
            className={`flex items-center justify-between px-3.5 py-2.5 border-b transition-colors shrink-0 ${
              !node.customColor ? `${kanbanTheme.headerBg} ${kanbanTheme.headerText} border-transparent` : ''
            }`}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div 
                style={{
                  backgroundColor: node.customColor
                    ? (isLightColor(node.customColor) ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)')
                    : undefined,
                }}
                className={`p-1 rounded-md shrink-0 ${!node.customColor ? 'bg-black/20 text-inherit' : ''}`}
              >
                <Kanban className="w-3.5 h-3.5" />
              </div>
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
                  className="text-[9px] font-mono font-extrabold bg-amber-100 text-amber-900 px-1 py-0.2 rounded border border-[#DF9C56] outline-none w-14 shrink-0"
                />
              ) : (
                <span
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setIsEditingSN(true);
                    setSnDraft(node.serialNumber || 'SN-01');
                  }}
                  className="text-[9px] font-mono font-extrabold px-1.5 py-0.2 rounded bg-black/15 dark:bg-white/20 border border-black/10 dark:border-white/10 shrink-0 cursor-text hover:underline"
                  title="Double click to edit serial number"
                >
                  {node.serialNumber || 'SN-01'}
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
                      setTitleDraft(node.title);
                      setIsEditingTitle(false);
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onDoubleClick={(e) => e.stopPropagation()}
                  autoFocus
                  className="font-bold text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-1.5 py-0.5 rounded border border-[#709654] shadow-inner focus:outline-none min-w-[140px]"
                />
              ) : (
                <span 
                  className="font-bold text-xs truncate cursor-text hover:underline decoration-dashed"
                  style={{ fontSize: node.fontSize ? `${node.fontSize}px` : undefined }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setIsEditingTitle(true);
                  }}
                  title="Double click to edit board title"
                >
                  {node.title}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] relative">
              <span 
                style={{
                  backgroundColor: node.customColor 
                    ? (isLightColor(node.customColor) ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.2)') 
                    : undefined,
                  color: node.customColor 
                    ? (isLightColor(node.customColor) ? '#1F3E22' : '#FFFFFF') 
                    : undefined,
                }}
                className={`font-semibold uppercase tracking-wider text-[9px] px-2 py-0.5 rounded ${
                  !node.customColor ? kanbanTheme.badgeBg : ''
                }`}
              >
                Interactive Board
              </span>

              {/* Add Next Column Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddColumn();
                }}
                className={`px-1.5 py-0.5 rounded transition-colors flex items-center gap-1 text-[10px] font-bold border border-white/30 hover:bg-white/20 active:scale-95 ${
                  node.customColor ? (isLightColor(node.customColor) ? 'text-[#1F3E22]' : 'text-white') : 'text-white'
                }`}
                title="Add next column to Kanban board"
              >
                <Plus className="w-3 h-3" />
                <span>+ Column</span>
              </button>

              {/* Kanban Theme Palette Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowKanbanThemeMenu(!showKanbanThemeMenu);
                  setShowNoteThemeMenu(false);
                }}
                className={`p-1 rounded transition-colors ${
                  node.customColor
                    ? (isLightColor(node.customColor) ? 'hover:bg-black/10 text-[#1F3E22]' : 'hover:bg-white/20 text-white')
                    : 'hover:bg-black/15 dark:hover:bg-white/15'
                }`}
                title="Change Kanban Board Theme & Header Colour"
              >
                <Palette className="w-3.5 h-3.5" />
              </button>

              {/* Kanban Theme Menu */}
              {showKanbanThemeMenu && (
                <div 
                  className="absolute right-12 top-8 z-50 bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 p-2 min-w-[170px] space-y-1 text-slate-800 dark:text-slate-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1 mb-1">
                    Board Theme
                  </div>
                  {Object.entries(KANBAN_THEMES).map(([key, t]) => (
                    <button
                      key={key}
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateNode({ ...node, kanbanTheme: key, customColor: t.swatch });
                        setShowKanbanThemeMenu(false);
                      }}
                      className={`w-full flex items-center gap-2 px-2 py-1 text-[11px] rounded transition-colors text-left ${
                        (node.kanbanTheme || 'basil') === key
                          ? 'bg-black/10 dark:bg-white/15 font-bold'
                          : 'hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      <span 
                        className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0" 
                        style={{ backgroundColor: t.swatch }} 
                      />
                      <span className="truncate">{t.name}</span>
                      {(node.kanbanTheme || 'basil') === key && (
                        <Check className="w-3 h-3 ml-auto shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenInspector(node);
                }}
                className={`hover:opacity-80 transition-opacity ${
                  node.customColor ? (isLightColor(node.customColor) ? 'text-[#1F3E22]' : 'text-white') : ''
                }`}
                title="Open Inspector"
              >
                <ExternalLink className="w-3 h-3" />
              </button>
              {onDeleteNode && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteNode(node.id);
                  }}
                  className={`p-1 rounded transition-colors ${
                    node.customColor
                      ? (isLightColor(node.customColor) ? 'hover:bg-rose-500/20 text-rose-800' : 'hover:bg-white/20 text-white')
                      : 'hover:bg-rose-600/30'
                  }`}
                  title="Delete Kanban Board"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Kanban Columns with Active Theme Styles */}
          <div className="p-3 grid grid-cols-3 gap-2.5 flex-1 min-h-0 overflow-y-auto">
            {node.kanbanColumns?.map((col, colIdx) => {
              const cTheme = kanbanTheme.columns[colIdx % kanbanTheme.columns.length];

              return (
                <div
                  key={col.id}
                  className={`rounded-lg p-2 border flex flex-col h-full min-h-0 ${cTheme.bg}`}
                >
                  <div className={`flex items-center justify-between px-1.5 py-1 -mx-1 -mt-1 rounded-t mb-2 text-[11px] font-bold shrink-0 ${cTheme.header}`}>
                    {editingColId === col.id ? (
                      <input
                        type="text"
                        value={colTitleDraft}
                        onChange={(e) => setColTitleDraft(e.target.value)}
                        onBlur={() => handleSaveColumnTitle(col.id)}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === 'Enter') handleSaveColumnTitle(col.id);
                          if (e.key === 'Escape') setEditingColId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onDoubleClick={(e) => e.stopPropagation()}
                        autoFocus
                        className="bg-white/80 dark:bg-black/60 text-slate-900 dark:text-slate-100 text-[10px] font-bold px-1 py-0.2 rounded border border-black/20 focus:outline-none w-24"
                      />
                    ) : (
                      <span
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setEditingColId(col.id);
                          setColTitleDraft(col.title);
                        }}
                        className="cursor-text hover:underline decoration-dashed"
                        title="Double click to edit column heading"
                      >
                        {col.title}
                      </span>
                    )}
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-[10px] px-1.5 rounded-full bg-black/10 dark:bg-white/15">
                        {col.cards.length}
                      </span>
                      {(node.kanbanColumns?.length || 0) > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteColumn(col.id);
                          }}
                          className="p-0.5 hover:text-rose-600 opacity-60 hover:opacity-100 transition-opacity"
                          title="Delete column"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Cards List */}
                  <div className="space-y-1.5 flex-1 min-h-[60px] overflow-y-auto pr-0.5">
                    {col.cards.map((card) => (
                      <div
                        key={card.id}
                        className={`p-2 rounded bg-white dark:bg-[#1A331C] border border-black/10 dark:border-white/10 text-[11px] shadow-2xs group/card ${cTheme.cardBorder}`}
                      >
                        {editingCardId === card.id ? (
                          <input
                            type="text"
                            value={cardTitleDraft}
                            onChange={(e) => setCardTitleDraft(e.target.value)}
                            onBlur={() => handleSaveCardTitle(card.id, col.id)}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              if (e.key === 'Enter') handleSaveCardTitle(card.id, col.id);
                              if (e.key === 'Escape') setEditingCardId(null);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            onDoubleClick={(e) => e.stopPropagation()}
                            autoFocus
                            className="w-full text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 text-[11px] font-medium p-1 rounded border border-[#DF9C56] focus:outline-none"
                          />
                        ) : (
                          <div
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              setEditingCardId(card.id);
                              setCardTitleDraft(card.title);
                            }}
                            className="text-[#1F3E22] dark:text-[#F8EBE8] font-medium leading-snug cursor-text hover:underline decoration-dashed"
                            title="Double click to edit card title"
                          >
                            {card.title}
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-1.5 text-[9px]">
                          {editingCardTagId === card.id ? (
                            <input
                              type="text"
                              value={cardTagDraft}
                              onChange={(e) => setCardTagDraft(e.target.value)}
                              onBlur={() => handleSaveCardTag(card.id, col.id)}
                              onKeyDown={(e) => {
                                e.stopPropagation();
                                if (e.key === 'Enter') handleSaveCardTag(card.id, col.id);
                                if (e.key === 'Escape') setEditingCardTagId(null);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                              onDoubleClick={(e) => e.stopPropagation()}
                              autoFocus
                              className="w-16 bg-white dark:bg-black/40 text-[9px] px-1 py-0.2 rounded border border-black/20 focus:outline-none"
                            />
                          ) : (
                            <span
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                setEditingCardTagId(card.id);
                                setCardTagDraft(card.tag);
                              }}
                              className={`${cTheme.tagBg} cursor-text hover:underline decoration-dashed`}
                              title="Double click to edit card tag"
                            >
                              {card.tag}
                            </span>
                          )}
                          <div className="flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCard(card.id, col.id);
                              }}
                              className="p-0.5 hover:text-red-600 text-rose-500 hover:bg-rose-500/15 rounded transition-colors"
                              title="Delete sub-note card"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                            {colIdx > 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveCard(card.id, col.id, 'left');
                                }}
                                className="p-0.5 hover:text-[#871201] text-[#709654]"
                                title="Move left"
                              >
                                <ChevronLeft className="w-2.5 h-2.5" />
                              </button>
                            )}
                            {colIdx < (node.kanbanColumns?.length || 0) - 1 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveCard(card.id, col.id, 'right');
                                }}
                                className="p-0.5 hover:text-[#871201] text-[#709654]"
                                title="Move right"
                              >
                                <ChevronRight className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {addingCardColId === col.id ? (
                      <div className="mt-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          placeholder="Card title..."
                          value={newCardTitle}
                          onChange={(e) => setNewCardTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddKanbanCard(col.id);
                            if (e.key === 'Escape') setAddingCardColId(null);
                          }}
                          autoFocus
                          className="w-full text-[11px] px-2 py-1 bg-white dark:bg-[#152717] border border-[#709654] rounded focus:outline-none text-[#1F3E22] dark:text-[#F8EBE8]"
                        />
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <button
                            onClick={() => setAddingCardColId(null)}
                            className="text-[9px] text-[#709654] hover:text-[#1F3E22]"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleAddKanbanCard(col.id)}
                            className="text-[9px] px-2 py-0.5 bg-[#3B5D37] text-white rounded font-medium"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setAddingCardColId(col.id);
                        }}
                        className="w-full py-1 text-[10px] text-[#709654] hover:text-[#1F3E22] dark:hover:text-[#F8EBE8] flex items-center justify-center gap-1 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors"
                      >
                        <Plus className="w-2.5 h-2.5" />
                        <span>Add Task</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Resize Corner Handle */}
          <div
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onStartResize?.(node.id, e);
            }}
            title="Drag to resize kanban board"
            className="absolute bottom-1 right-1 w-4 h-4 cursor-se-resize flex items-center justify-center opacity-40 group-hover:opacity-100 transition-opacity rounded hover:bg-black/10 dark:hover:bg-white/10 z-20"
          >
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M7 1L1 7M7 4L4 7M7 7H7.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      ) : (
        /* Standard Visual Node: App, Tool, Project, Resource with Solid Header */
        <div 
          style={{
            borderColor: node.customColor || undefined,
            height: node.height ? `${node.height}px` : undefined,
          }}
          className={`rounded-xl border-2 ${theme.containerBorder} overflow-hidden w-full min-w-[260px] bg-white dark:bg-[#152816] shadow-md h-full flex flex-col relative group`}
        >
          {/* Header Banner - updates header color when colour changes */}
          <div 
            style={{
              backgroundColor: node.customColor || undefined,
              color: node.customColor 
                ? (isLightColor(node.customColor) ? '#1F3E22' : '#FFFFFF') 
                : undefined,
              borderColor: node.customColor 
                ? (isLightColor(node.customColor) ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.18)') 
                : undefined,
            }}
            className={`flex items-center justify-between px-3.5 py-2.5 border-b transition-colors shrink-0 ${
              !node.customColor ? `${theme.headerBg} border-transparent` : ''
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div 
                style={{
                  backgroundColor: node.customColor 
                    ? (isLightColor(node.customColor) ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.22)') 
                    : undefined,
                  color: node.customColor 
                    ? (isLightColor(node.customColor) ? '#1F3E22' : '#FFFFFF') 
                    : undefined,
                }}
                className={theme.iconWrapper}
              >
                {getNodeIcon(node.type)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 min-w-0">
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
                      onMouseDown={(e) => e.stopPropagation()}
                      onDoubleClick={(e) => e.stopPropagation()}
                      autoFocus
                      className="text-[9px] font-mono font-extrabold bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 px-1 py-0.2 rounded border border-[#DF9C56] focus:outline-none w-16 shrink-0"
                    />
                  ) : (
                    <span
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setIsEditingSN(true);
                        setSnDraft(node.serialNumber || 'SN-01');
                      }}
                      className="text-[9px] font-mono font-extrabold px-1.5 py-0.2 rounded bg-black/15 dark:bg-white/20 border border-black/10 dark:border-white/10 shrink-0 cursor-text hover:underline"
                      title="Double click to edit serial number"
                    >
                      {node.serialNumber || 'SN-01'}
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
                          setTitleDraft(node.title);
                          setIsEditingTitle(false);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onDoubleClick={(e) => e.stopPropagation()}
                      autoFocus
                      className="font-bold text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-1.5 py-0.5 rounded border-2 border-[#DF9C56] shadow-inner focus:outline-none flex-1 min-w-0"
                    />
                  ) : (
                    <div 
                      className="font-bold text-xs truncate cursor-text hover:underline decoration-dashed flex-1 min-w-0"
                      style={{ fontSize: node.fontSize ? `${node.fontSize}px` : '14px' }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setIsEditingTitle(true);
                      }}
                      title="Double click to edit name"
                    >
                      {node.title}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 text-[10px]">
                  {/* Category / Type Badge - CSS Selector 4 */}
                  {isEditingType ? (
                    <input
                      type="text"
                      value={typeDraft}
                      onChange={(e) => setTypeDraft(e.target.value)}
                      onBlur={handleSaveType}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') handleSaveType();
                        if (e.key === 'Escape') setIsEditingType(false);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onDoubleClick={(e) => e.stopPropagation()}
                      autoFocus
                      className="text-[9px] font-bold uppercase tracking-wider bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-1 py-0.2 rounded border border-[#DF9C56] shadow-xs focus:outline-none w-20"
                    />
                  ) : (
                    <span 
                      style={{
                        backgroundColor: node.customColor 
                          ? (isLightColor(node.customColor) ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.2)') 
                          : undefined,
                        color: node.customColor 
                          ? (isLightColor(node.customColor) ? '#1F3E22' : '#FFFFFF') 
                          : undefined,
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setIsEditingType(true);
                        setTypeDraft(node.type);
                      }}
                      className={`${theme.typeBadge} cursor-text hover:underline decoration-dashed`}
                      title="Double click to edit type/category"
                    >
                      {node.type}
                    </span>
                  )}

                  {/* Environment Sub-text - CSS Selector 3 */}
                  {isEditingEnv ? (
                    <input
                      type="text"
                      value={envDraft}
                      onChange={(e) => setEnvDraft(e.target.value)}
                      onBlur={handleSaveEnv}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') handleSaveEnv();
                        if (e.key === 'Escape') setIsEditingEnv(false);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onDoubleClick={(e) => e.stopPropagation()}
                      autoFocus
                      className="text-[9px] font-mono bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-1 py-0.2 rounded border border-[#DF9C56] shadow-xs focus:outline-none w-24"
                    />
                  ) : (
                    <span 
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setIsEditingEnv(true);
                        setEnvDraft(node.environment || 'development');
                      }}
                      className="font-mono opacity-80 cursor-text hover:underline decoration-dashed"
                      title="Double click to edit environment"
                    >
                      · {node.environment || 'set env'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Status dot, quick run & X delete button */}
            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              <span className={`w-2.5 h-2.5 rounded-full ${getStatusColor(node.status)}`} title={`Status: ${node.status}`} />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRunNode(node.id);
                }}
                className={`p-1 rounded transition-colors ${
                  node.customColor
                    ? (isLightColor(node.customColor) ? 'bg-black/10 hover:bg-black/20 text-[#1F3E22]' : 'bg-white/20 hover:bg-white/30 text-white')
                    : 'bg-black/10 hover:bg-black/25 dark:bg-white/10 dark:hover:bg-white/25'
                }`}
                title="Run step"
              >
                <Play className="w-3 h-3 fill-current" />
              </button>
              {onDeleteNode && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteNode(node.id);
                  }}
                  className={`p-1 rounded transition-colors ${
                    node.customColor
                      ? (isLightColor(node.customColor) ? 'hover:bg-rose-500/20 text-rose-800' : 'hover:bg-rose-500/30 text-white')
                      : 'bg-black/10 hover:bg-rose-600/30 hover:text-rose-600 dark:bg-white/10 dark:hover:bg-rose-500/30'
                  }`}
                  title="Delete Node"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <div className="p-3 flex-1 overflow-y-auto">

          {/* Description (Sub-text) - CSS Selector 2 */}
          {isEditingDesc ? (
            <textarea
              value={descDraft}
              onChange={(e) => setDescDraft(e.target.value)}
              onBlur={handleSaveDesc}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSaveDesc();
                }
                if (e.key === 'Escape') setIsEditingDesc(false);
              }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onDoubleClick={(e) => e.stopPropagation()}
              autoFocus
              rows={2}
              className="w-full text-[11px] p-1.5 rounded border-2 border-[#DF9C56] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-inner focus:outline-none mb-2.5 resize-none"
            />
          ) : (
            <p 
              onDoubleClick={(e) => {
                e.stopPropagation();
                setIsEditingDesc(true);
                setDescDraft(node.description || '');
              }}
              className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed mb-2.5 line-clamp-2 cursor-text hover:underline decoration-dashed"
              title="Double click to edit description"
            >
              {renderTextWithLinks(node.description, '+ Double click to add description...')}
            </p>
          )}

          {/* Code Command or Endpoint Monospace Snippet - CSS Selector 1 */}
          {node.command !== undefined && (
            <div className="mb-2.5 p-1.5 bg-slate-900 rounded text-slate-300 font-mono text-[10px] flex items-center gap-1.5 overflow-hidden">
              <Terminal className="w-3 h-3 text-amber-400 shrink-0" />
              {isEditingCommand ? (
                <input
                  type="text"
                  value={commandDraft}
                  onChange={(e) => setCommandDraft(e.target.value)}
                  onBlur={handleSaveCommand}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') handleSaveCommand();
                    if (e.key === 'Escape') setIsEditingCommand(false);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onDoubleClick={(e) => e.stopPropagation()}
                  autoFocus
                  className="bg-transparent text-slate-100 border-b border-amber-400 focus:outline-none text-[10px] font-mono w-full px-0.5"
                />
              ) : (
                <span 
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setIsEditingCommand(true);
                    setCommandDraft(node.command || '');
                  }}
                  className="truncate cursor-text hover:underline decoration-dashed decoration-amber-400"
                  title="Double click to edit command"
                >
                  {renderTextWithLinks(node.command, 'click to add command')}
                </span>
              )}
            </div>
          )}

          {node.endpoint !== undefined && (
            <div className="mb-2.5 p-1.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-300 font-mono text-[10px] truncate">
              {isEditingEndpoint ? (
                <input
                  type="text"
                  value={endpointDraft}
                  onChange={(e) => setEndpointDraft(e.target.value)}
                  onBlur={handleSaveEndpoint}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') handleSaveEndpoint();
                    if (e.key === 'Escape') setIsEditingEndpoint(false);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onDoubleClick={(e) => e.stopPropagation()}
                  autoFocus
                  className="bg-transparent text-slate-800 dark:text-slate-100 border-b border-[#3B5D37] focus:outline-none text-[10px] font-mono w-full"
                />
              ) : (
                <span 
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setIsEditingEndpoint(true);
                    setEndpointDraft(node.endpoint || '');
                  }}
                  className="cursor-text hover:underline decoration-dashed"
                  title="Double click to edit endpoint"
                >
                  {renderTextWithLinks(node.endpoint, 'click to add endpoint')}
                </span>
              )}
            </div>
          )}

          {/* Metrics strip if available */}
          {node.metrics && node.metrics.length > 0 && (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px]">
              {node.metrics.map((m, idx) => (
                <div key={idx} className="bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded">
                  {editingMetricIdx?.idx === idx && editingMetricIdx?.field === 'label' ? (
                    <input
                      type="text"
                      value={metricDraft}
                      onChange={(e) => setMetricDraft(e.target.value)}
                      onBlur={() => handleSaveMetric(idx, 'label')}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') handleSaveMetric(idx, 'label');
                        if (e.key === 'Escape') setEditingMetricIdx(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onDoubleClick={(e) => e.stopPropagation()}
                      autoFocus
                      className="text-[9px] bg-white dark:bg-black/40 text-slate-900 dark:text-slate-100 px-1 py-0.2 rounded border border-black/20 focus:outline-none w-full"
                    />
                  ) : (
                    <div 
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setEditingMetricIdx({ idx, field: 'label' });
                        setMetricDraft(m.label);
                      }}
                      className="text-slate-400 dark:text-slate-500 cursor-text hover:underline decoration-dashed truncate"
                      title="Double click to edit metric label"
                    >
                      {m.label}
                    </div>
                  )}

                  {editingMetricIdx?.idx === idx && editingMetricIdx?.field === 'value' ? (
                    <input
                      type="text"
                      value={metricDraft}
                      onChange={(e) => setMetricDraft(e.target.value)}
                      onBlur={() => handleSaveMetric(idx, 'value')}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') handleSaveMetric(idx, 'value');
                        if (e.key === 'Escape') setEditingMetricIdx(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onDoubleClick={(e) => e.stopPropagation()}
                      autoFocus
                      className="text-[10px] font-mono bg-white dark:bg-black/40 text-slate-900 dark:text-slate-100 px-1 py-0.2 rounded border border-black/20 focus:outline-none w-full"
                    />
                  ) : (
                    <div 
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setEditingMetricIdx({ idx, field: 'value' });
                        setMetricDraft(m.value);
                      }}
                      className="font-semibold font-mono tabular-nums text-slate-800 dark:text-slate-200 cursor-text hover:underline decoration-dashed truncate"
                      title="Double click to edit metric value"
                    >
                      {m.value}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Tags */}
          <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-400 flex-wrap">
            {node.tags && node.tags.map((t, idx) => (
              editingTagIdx === idx ? (
                <input
                  key={idx}
                  type="text"
                  value={tagDraft}
                  onChange={(e) => setTagDraft(e.target.value)}
                  onBlur={() => handleSaveTag(idx)}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') handleSaveTag(idx);
                    if (e.key === 'Escape') setEditingTagIdx(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onDoubleClick={(e) => e.stopPropagation()}
                  autoFocus
                  className="w-16 text-[9px] bg-white dark:bg-slate-900 px-1 py-0.2 rounded border border-[#DF9C56] focus:outline-none"
                />
              ) : (
                <span 
                  key={idx} 
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingTagIdx(idx);
                    setTagDraft(t);
                  }}
                  className="text-slate-500 dark:text-slate-400 cursor-text hover:underline decoration-dashed"
                  title="Double click to edit tag"
                >
                  #{t}
                </span>
              )
            ))}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAddTag();
              }}
              className="text-[9px] opacity-60 hover:opacity-100 hover:text-[#DF9C56] transition-opacity"
              title="Add tag"
            >
              + tag
            </button>
          </div>
          </div>

          {/* Resize Corner Handle for standard nodes */}
          <div
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onStartResize?.(node.id, e);
            }}
            title="Drag to resize node"
            className="absolute bottom-1 right-1 w-4 h-4 cursor-se-resize flex items-center justify-center opacity-30 group-hover:opacity-100 transition-opacity rounded hover:bg-black/10 dark:hover:bg-white/10 z-20"
          >
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M7 1L1 7M7 4L4 7M7 7H7.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};
