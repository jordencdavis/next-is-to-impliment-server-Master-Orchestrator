import React, { useState, useMemo, useEffect } from 'react';
import { 
  Wrench, 
  AppWindow, 
  FolderGit2, 
  Database, 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  Search, 
  X,
  GripVertical,
  CheckCircle2,
  Package,
  Code2,
  Network,
  ShieldCheck,
  Layout,
  Send,
  Smartphone,
  Lock,
  Zap,
  HardDrive,
  Layers,
  SlidersHorizontal,
  ChevronLeft,
  Trash2,
  Maximize2,
  Minimize2,
  Columns3,
  LayoutList,
  GitBranch,
  RotateCcw,
  ArrowUpDown,
  Hash,
  ListFilter
} from 'lucide-react';
import { OrganizerItem, ItemType } from '../types/orchestrator';
import { 
  compareSerialNumbers, 
  cleanSerialNumber, 
  resolveSerialNumberConflict 
} from '../utils/serialUtils';

interface OrganizerSidebarProps {
  items: OrganizerItem[];
  onAddToCanvas: (item: OrganizerItem) => void;
  onOpenNewItemModal: (defaultType?: ItemType) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onClearAllItems?: () => void;
  onResetDefaultItems?: () => void;
  onClearCategoryItems?: (type: ItemType) => void;
  onDeleteItem?: (itemId: string) => void;
  onDeleteItemFromAllCanvases?: (itemId: string) => void;
  onSelectItem?: (item: OrganizerItem) => void;
  onUpdateItemName?: (itemId: string, newName: string) => void;
  onUpdateItemDescription?: (itemId: string, newDesc: string) => void;
  onUpdateItemCategory?: (itemId: string, newCategory: string) => void;
  onUpdateItemSerialNumber?: (itemId: string, newSN: string) => void;
  selectedItemId?: string | null;
  activeCanvasItemIds?: string[];
  onMasterClear?: () => void;
}

export const OrganizerSidebar: React.FC<OrganizerSidebarProps> = ({
  items,
  onAddToCanvas,
  onOpenNewItemModal,
  isCollapsed,
  onToggleCollapse,
  onClearAllItems,
  onResetDefaultItems,
  onClearCategoryItems,
  onDeleteItem,
  onDeleteItemFromAllCanvases,
  onSelectItem,
  onUpdateItemName,
  onUpdateItemDescription,
  onUpdateItemCategory,
  onUpdateItemSerialNumber,
  selectedItemId,
  activeCanvasItemIds = [],
  onMasterClear,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [fullScreenMode, setFullScreenMode] = useState<'standard' | 'cards-stack'>('standard');
  const [canvasDeletePermissionItem, setCanvasDeletePermissionItem] = useState<OrganizerItem | null>(null);

  const handleAttemptDeleteItem = (item: OrganizerItem) => {
    const isOnCanvas = activeCanvasItemIds.includes(item.id);
    if (isOnCanvas) {
      // If the ON button is enabled, don't allow direct deletion because it is in the canvas.
      // Ask permission to delete it from across all the canvas.
      setCanvasDeletePermissionItem(item);
    } else {
      onDeleteItem?.(item.id);
    }
  };

  // Dismiss full screen on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen]);

  // Editable Category Headings (Selector 5)
  const [categoryTitles, setCategoryTitles] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('mo_category_titles');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return {
      tools: 'Tools & Utilities',
      apps: 'Applications & Services',
      projects: 'Projects & Initiatives',
      resources: 'Resources & Storage',
    };
  });
  const [editingCategoryKey, setEditingCategoryKey] = useState<string | null>(null);
  const [categoryDraft, setCategoryDraft] = useState('');

  const handleSaveCategoryTitle = (key: string) => {
    const trimmed = categoryDraft.trim();
    if (trimmed) {
      setCategoryTitles((prev) => {
        const next = { ...prev, [key]: trimmed };
        try {
          localStorage.setItem('mo_category_titles', JSON.stringify(next));
          window.dispatchEvent(new CustomEvent('mo_categories_updated'));
        } catch (e) {
          console.error(e);
        }
        return next;
      });
    }
    setEditingCategoryKey(null);
  };

  // Double click name editing for items
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemDraftName, setItemDraftName] = useState('');

  // Double click sub-text (description) editing for items
  const [editingItemDescId, setEditingItemDescId] = useState<string | null>(null);
  const [itemDraftDesc, setItemDraftDesc] = useState('');

  // Double click category editing for items
  const [editingItemCatId, setEditingItemCatId] = useState<string | null>(null);
  const [itemDraftCat, setItemDraftCat] = useState('');

  // Single click serial number editing for items
  const [editingItemSNId, setEditingItemSNId] = useState<string | null>(null);
  const [itemDraftSN, setItemDraftSN] = useState('');

  // Category S.No editing state
  const [editingCatSNKey, setEditingCatSNKey] = useState<string | null>(null);
  const [categoryDraftSN, setCategoryDraftSN] = useState('');
  const [categorySerials, setCategorySerials] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('mo_category_serials');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return {};
  });

  const getCategorySN = (key: string, index: number) => {
    if (categorySerials[key]) return cleanSerialNumber(categorySerials[key]);
    return String(index + 1);
  };

  const handleSaveCategorySN = (catKey: string, sectionIdx: number) => {
    const trimmed = categoryDraftSN.trim();
    if (!trimmed) {
      setEditingCatSNKey(null);
      return;
    }

    // Build list of existing category serial numbers
    const existingList = categories
      .filter((c: any) => c.key !== catKey)
      .map((c: any, idx: number) => ({
        id: c.key,
        serialNumber: categorySerials[c.key] || String(idx + 1),
      }));

    const resolved = resolveSerialNumberConflict(trimmed, existingList, catKey);
    const updated = { ...categorySerials, [catKey]: resolved };
    setCategorySerials(updated);
    try {
      localStorage.setItem('mo_category_serials', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    setEditingCatSNKey(null);
  };

  // Sort State (Serial Number, Name, Type, Status)
  const [sortBy, setSortBy] = useState<'serial' | 'name' | 'type' | 'status'>('serial');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');

  const handleStartEditItem = (item: OrganizerItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingItemId(item.id);
    setItemDraftName(item.name);
  };

  const handleSaveItemName = (itemId: string) => {
    const trimmed = itemDraftName.trim();
    if (trimmed && onUpdateItemName) {
      onUpdateItemName(itemId, trimmed);
    }
    setEditingItemId(null);
  };

  const handleSaveItemDesc = (itemId: string) => {
    const trimmed = itemDraftDesc.trim();
    if (onUpdateItemDescription) {
      onUpdateItemDescription(itemId, trimmed);
    }
    setEditingItemDescId(null);
  };

  const handleSaveItemCategory = (itemId: string) => {
    const trimmed = itemDraftCat.trim();
    if (trimmed && onUpdateItemCategory) {
      onUpdateItemCategory(itemId, trimmed);
    }
    setEditingItemCatId(null);
  };

  const handleSaveItemSN = (itemId: string) => {
    const trimmed = itemDraftSN.trim();
    if (trimmed && onUpdateItemSerialNumber) {
      const resolved = resolveSerialNumberConflict(trimmed, items, itemId);
      onUpdateItemSerialNumber(itemId, resolved);
    }
    setEditingItemSNId(null);
  };

  const handleSelectFilter = (type: string) => {
    setSelectedTypeFilter(type);
    if (type !== 'all') {
      setCollapsedGroups((prev) => ({ ...prev, [type]: false }));
    }
  };

  const handleCategoryHeaderClick = (sectionKey: string) => {
    toggleGroup(sectionKey);
  };
  
  // Clear / Master Clear Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    mode: 'master-clear' | 'delete-category' | null;
    title: string;
    message: string;
    categoryKey?: string;
    categoryTitle?: string;
    itemCount?: number;
  }>({
    isOpen: false,
    mode: null,
    title: '',
    message: '',
  });

  const DEFAULT_PRIMARY_CATEGORY = {
    key: 'default',
    title: 'Default Category',
    color: '#3B5D37',
    iconName: 'Package',
  };

  const DEFAULT_CATEGORIES = [
    DEFAULT_PRIMARY_CATEGORY,
    { key: 'tool', title: 'Tools & Utilities', color: '#DF9C56', iconName: 'Wrench' },
    { key: 'app', title: 'Applications & Services', color: '#C61B31', iconName: 'AppWindow' },
    { key: 'project', title: 'Projects & Initiatives', color: '#DB3A31', iconName: 'FolderGit2' },
    { key: 'resource', title: 'Resources & Storage', color: '#3B5D37', iconName: 'Database' },
    { key: 'pipeline', title: 'Pipelines & Workflows', color: '#2563EB', iconName: 'GitBranch' },
    { key: 'script', title: 'Scripts & Automation', color: '#9333EA', iconName: 'Code2' },
    { key: 'api', title: 'APIs & Gateways', color: '#0D9488', iconName: 'Network' },
  ];

  // Dynamic Categories list (always preserves at least the Default Category)
  const [categories, setCategories] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('mo_registered_categories_v2');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_CATEGORIES;
  });

  // Listen to category updates from NewItemModal or other components
  useEffect(() => {
    const handleCategoriesUpdated = () => {
      try {
        const saved = localStorage.getItem('mo_registered_categories_v2');
        if (saved !== null) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCategories(parsed);
          }
        }
        const savedTitles = localStorage.getItem('mo_category_titles');
        if (savedTitles) {
          try { setCategoryTitles(JSON.parse(savedTitles)); } catch (e) { console.error(e); }
        }
        const savedSerials = localStorage.getItem('mo_category_serials');
        if (savedSerials) {
          try { setCategorySerials(JSON.parse(savedSerials)); } catch (e) { console.error(e); }
        }
      } catch (err) {
        console.error(err);
      }
    };
    window.addEventListener('storage', handleCategoriesUpdated);
    window.addEventListener('mo_categories_updated', handleCategoriesUpdated);
    return () => {
      window.removeEventListener('storage', handleCategoriesUpdated);
      window.removeEventListener('mo_categories_updated', handleCategoriesUpdated);
    };
  }, []);

  const handleOpenMasterClearModal = () => {
    setConfirmModal({
      isOpen: true,
      mode: 'master-clear',
      title: 'Master Clear: Wipe All Items & Reset Categories?',
      message:
        'Master Clear will remove all organizer items and canvas nodes, and reset to the Default Category (S.No 1). The Default Category is preserved for new items.',
    });
  };

  const handleConfirmMasterClear = () => {
    onClearAllItems?.();
    onMasterClear?.();
    setCategories([DEFAULT_PRIMARY_CATEGORY]);
    const serials = { default: '1' };
    setCategorySerials(serials);
    try {
      localStorage.setItem('mo_registered_categories_v2', JSON.stringify([DEFAULT_PRIMARY_CATEGORY]));
      localStorage.setItem('mo_category_serials', JSON.stringify(serials));
      localStorage.removeItem('mo_category_titles');
      window.dispatchEvent(new CustomEvent('mo_categories_updated'));
    } catch (e) {
      console.error(e);
    }
    setCategoryTitles({ default: 'Default Category' });
    setSelectedTypeFilter('all');
    setSearchQuery('');
    setConfirmModal({ isOpen: false, mode: null, title: '', message: '' });
  };

  const handleConfirmClearItemsOnly = () => {
    onClearAllItems?.();
    setConfirmModal({ isOpen: false, mode: null, title: '', message: '' });
  };

  const handleOpenDeleteCategoryModal = (catKey: string, categoryTitle: string, count: number) => {
    const isDefaultCat = catKey === 'default' || (categories.length === 1 && categories[0].key === catKey);
    setConfirmModal({
      isOpen: true,
      mode: 'delete-category',
      title: isDefaultCat ? `Clear "${categoryTitle}" Items?` : `Delete "${categoryTitle}" Category?`,
      message: isDefaultCat
        ? `The Default Category is protected and cannot be deleted, but you can delete or clear all ${count} item(s) inside it.`
        : `Do you want to delete this category section div ("${categoryTitle}") entirely from the organizer, or clear all ${count} item(s) inside it?`,
      categoryKey: catKey,
      categoryTitle,
      itemCount: count,
    });
  };

  const handleDeleteCategory = (catKey: string) => {
    // "once project starts , don't delete it default category m but items in it can delete"
    if (catKey === 'default' || categories.length <= 1) {
      if (onClearCategoryItems) {
        onClearCategoryItems(catKey as ItemType);
      }
      return;
    }

    const updated = categories.filter((c: any) => c.key !== catKey);
    setCategories(updated);
    try {
      localStorage.setItem('mo_registered_categories_v2', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('mo_categories_updated'));
    } catch (err) {
      console.error(err);
    }
    if (onClearCategoryItems) {
      onClearCategoryItems(catKey as ItemType);
    }
    if (selectedTypeFilter === catKey) {
      setSelectedTypeFilter('all');
    }
  };

  const handleRestoreDefaults = () => {
    setCategories(DEFAULT_CATEGORIES);
    try {
      localStorage.setItem('mo_registered_categories_v2', JSON.stringify(DEFAULT_CATEGORIES));
      localStorage.removeItem('mo_category_titles');
      window.dispatchEvent(new CustomEvent('mo_categories_updated'));
    } catch (e) {
      console.error(e);
    }
    setCategoryTitles({
      default: 'Default Category',
      tool: 'Tools & Utilities',
      app: 'Applications & Services',
      project: 'Projects & Initiatives',
      resource: 'Resources & Storage',
      pipeline: 'Pipelines & Workflows',
      script: 'Scripts & Automation',
      api: 'APIs & Gateways',
    });
    setSelectedTypeFilter('all');
    setSearchQuery('');
    onResetDefaultItems?.();
  };

  // Track collapsed status of each category group dynamically by category key
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const allCollapsed = useMemo(() => {
    if (!categories || categories.length === 0) return false;
    return categories.every((cat: any) => Boolean(collapsedGroups[cat.key]));
  }, [categories, collapsedGroups]);

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    categories.forEach((cat: any) => {
      next[cat.key] = false;
    });
    setCollapsedGroups(next);
  };

  const collapseAll = () => {
    const next: Record<string, boolean> = {};
    categories.forEach((cat: any) => {
      next[cat.key] = true;
    });
    setCollapsedGroups(next);
  };

  // Filter & Sort items
  const filteredItems = useMemo(() => {
    const list = items.filter((item) => {
      const matchesSearch = 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.serialNumber && item.serialNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesType = selectedTypeFilter === 'all' || item.type === selectedTypeFilter;
      return matchesSearch && matchesType;
    });

    return [...list].sort((a, b) => {
      let comp = 0;
      if (sortBy === 'serial') {
        comp = compareSerialNumbers(a.serialNumber, b.serialNumber);
      } else if (sortBy === 'name') {
        comp = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
      } else if (sortBy === 'type') {
        comp = a.type.localeCompare(b.type, undefined, { sensitivity: 'base' });
        if (comp === 0) {
          comp = compareSerialNumbers(a.serialNumber, b.serialNumber);
        }
      } else if (sortBy === 'status') {
        const weight: Record<string, number> = { running: 5, error: 4, warning: 3, success: 2, idle: 1 };
        comp = (weight[b.status || 'idle'] || 0) - (weight[a.status || 'idle'] || 0);
        if (comp === 0) {
          comp = compareSerialNumbers(a.serialNumber, b.serialNumber);
        }
      }
      return sortOrder === 'asc' ? comp : -comp;
    });
  }, [items, searchQuery, selectedTypeFilter, sortBy, sortOrder]);

  // Modal / dropdown states for adding new categories
  const [addCatModalOpen, setAddCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#2563EB');
  const [newCatIcon, setNewCatIcon] = useState('GitBranch');
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const catKey = newCatName.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
    const newCategory = {
      key: catKey,
      title: newCatName.trim(),
      color: newCatColor,
      iconName: newCatIcon,
    };
    const updated = [...categories, newCategory];
    setCategories(updated);
    try {
      localStorage.setItem('mo_registered_categories_v2', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('mo_categories_updated'));
    } catch (err) {
      console.error(err);
    }
    setAddCatModalOpen(false);
    setNewCatName('');
  };

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Wrench': return <Wrench className="w-3.5 h-3.5" />;
      case 'AppWindow': return <AppWindow className="w-3.5 h-3.5" />;
      case 'FolderGit2': return <FolderGit2 className="w-3.5 h-3.5" />;
      case 'Database': return <Database className="w-3.5 h-3.5" />;
      case 'GitBranch': return <GitBranch className="w-3.5 h-3.5" />;
      case 'Code2': return <Code2 className="w-3.5 h-3.5" />;
      case 'Network': return <Network className="w-3.5 h-3.5" />;
      case 'ShieldCheck': return <ShieldCheck className="w-3.5 h-3.5" />;
      case 'Zap': return <Zap className="w-3.5 h-3.5" />;
      case 'Layers': return <Layers className="w-3.5 h-3.5" />;
      default: return <Package className="w-3.5 h-3.5" />;
    }
  };

  const getItemIcon = (iconName: string, itemType: string) => {
    switch (iconName) {
      case 'CheckCircle2': return <CheckCircle2 className="w-3.5 h-3.5" />;
      case 'Package': return <Package className="w-3.5 h-3.5" />;
      case 'Database': return <Database className="w-3.5 h-3.5" />;
      case 'Code2': return <Code2 className="w-3.5 h-3.5" />;
      case 'Network': return <Network className="w-3.5 h-3.5" />;
      case 'ShieldCheck': return <ShieldCheck className="w-3.5 h-3.5" />;
      case 'Zap': return <Zap className="w-3.5 h-3.5" />;
      case 'HardDrive': return <HardDrive className="w-3.5 h-3.5" />;
      case 'Layers': return <Layers className="w-3.5 h-3.5" />;
      case 'GitBranch': return <GitBranch className="w-3.5 h-3.5" />;
      case 'Lock': return <Lock className="w-3.5 h-3.5" />;
      default: return getCategoryIcon(itemType);
    }
  };

  const getTypeTheme = (type: string, customColor?: string) => {
    const cat = categories.find((c: any) => c.key === type);
    const themeColor = customColor || cat?.color || '#709654';

    return {
      treeBorder: 'border-l-2',
      treeBorderColor: themeColor,
      card: 'bg-white/80 dark:bg-black/30 border border-[#709654]/30 hover:border-[#709654]',
      iconWrapper: 'p-1.5 rounded-lg shrink-0',
      addBtn: 'text-white bg-[#3B5D37] hover:bg-[#1F3E22]',
      badge: 'text-[#1F3E22] dark:text-[#AFD1C2]',
      color: themeColor,
    };
  };

  const sections = useMemo(() => {
    const rawSections = categories.map((cat: any, idx: number) => {
      const customTitle = categoryTitles[cat.key] || cat.title;
      const catItems = filteredItems.filter((i) => i.type === cat.key);

      return {
        key: cat.key,
        title: customTitle,
        type: cat.key as ItemType,
        color: cat.color,
        headerBg: 'border-2',
        headerText: '',
        badgeBg: 'text-white',
        iconBg: 'text-white',
        icon: getCategoryIcon(cat.iconName),
        items: catItems,
        index: idx + 1,
      };
    });

    // In grouped mode, sort sections according to sort criteria so the view aligns with user intent
    return [...rawSections].sort((secA, secB) => {
      if (secA.items.length === 0 && secB.items.length > 0) return 1;
      if (secB.items.length === 0 && secA.items.length > 0) return -1;
      if (secA.items.length === 0 && secB.items.length === 0) return 0;

      const firstA = secA.items[0];
      const firstB = secB.items[0];

      if (sortBy === 'serial') {
        const comp = compareSerialNumbers(firstA.serialNumber, firstB.serialNumber);
        return sortOrder === 'asc' ? comp : -comp;
      } else if (sortBy === 'name') {
        const comp = firstA.name.localeCompare(firstB.name, undefined, { numeric: true, sensitivity: 'base' });
        return sortOrder === 'asc' ? comp : -comp;
      } else if (sortBy === 'type') {
        const comp = secA.title.localeCompare(secB.title, undefined, { sensitivity: 'base' });
        return sortOrder === 'asc' ? comp : -comp;
      } else if (sortBy === 'status') {
        const weight: Record<string, number> = { running: 5, error: 4, warning: 3, success: 2, idle: 1 };
        const comp = (weight[firstB.status || 'idle'] || 0) - (weight[firstA.status || 'idle'] || 0);
        return sortOrder === 'asc' ? comp : -comp;
      }
      return 0;
    });
  }, [categories, categoryTitles, filteredItems, sortBy, sortOrder]);

  if (isCollapsed) {
    return (
      <aside className="w-14 border-r border-[#709654]/30 dark:border-[#3B5D37]/60 bg-[#F8EBE8]/90 dark:bg-[#152717] flex flex-col items-center py-3 select-none shrink-0 transition-all">
        <button
          onClick={onToggleCollapse}
          className="p-2 text-[#709654] hover:text-[#1F3E22] dark:hover:text-[#F8EBE8] hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors mb-4"
          title="Expand Organizer Sidebar"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <div className="flex flex-col gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#DF9C56] text-[#871201] flex items-center justify-center shadow-xs font-bold" title="Tools">
            <Wrench className="w-4 h-4" />
          </div>
          <div className="w-9 h-9 rounded-xl bg-[#C61B31] text-[#F8EBE8] flex items-center justify-center shadow-xs font-bold" title="Applications">
            <AppWindow className="w-4 h-4" />
          </div>
          <div className="w-9 h-9 rounded-xl bg-[#DB3A31] text-[#F8EBE8] flex items-center justify-center shadow-xs font-bold" title="Projects">
            <FolderGit2 className="w-4 h-4" />
          </div>
          <div className="w-9 h-9 rounded-xl bg-[#3B5D37] text-[#AFD1C2] flex items-center justify-center shadow-xs font-bold" title="Resources">
            <Database className="w-4 h-4" />
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className={`border-r border-[#709654]/30 dark:border-[#3B5D37]/60 bg-[#F8EBE8] dark:bg-[#152717] flex flex-col select-none shrink-0 transition-all ${
      isFullScreen ? 'fixed inset-0 z-50 w-full h-full' : 'w-76 h-full relative'
    }`}>
      {/* Sidebar Header */}
      <div className="p-3 border-b border-[#709654]/25 dark:border-[#3B5D37]/60 flex items-center justify-between" style={{ backgroundColor: '#c2c2c2' }}>
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="p-1 rounded bg-[#1F3E22] text-[#AFD1C2]" title="Organizer" style={{ fontSize: '5px', width: '5px', height: '24px' }}>
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10px] text-[#1F3E22] font-mono font-bold shrink-0" style={{ fontSize: '15px' }}>
            ({filteredItems.length})
          </span>
          <span className="text-xs font-bold text-[#1F3E22] tracking-wide ml-1">
            Organizer
          </span>
          {isFullScreen && (
            <div className="flex items-center gap-1 ml-2 bg-[#1F3E22]/15 dark:bg-black/30 p-0.5 rounded-lg border border-[#709654]/30">
              <button
                onClick={() => setFullScreenMode('standard')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                  fullScreenMode === 'standard'
                    ? 'bg-[#1F3E22] text-[#F8EBE8] shadow-xs'
                    : 'text-[#1F3E22] dark:text-[#AFD1C2] hover:bg-black/5 dark:hover:bg-white/10'
                }`}
                title="Standard Full Screen (Hierarchy Tree)"
              >
                <LayoutList className="w-3 h-3" />
                <span>Standard Full Screen</span>
              </button>
              <button
                onClick={() => setFullScreenMode('cards-stack')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                  fullScreenMode === 'cards-stack'
                    ? 'bg-[#DF9C56] text-[#871201] shadow-xs'
                    : 'text-[#1F3E22] dark:text-[#AFD1C2] hover:bg-black/5 dark:hover:bg-white/10'
                }`}
                title="Cards Stack Side-by-Side Full Screen"
              >
                <Columns3 className="w-3 h-3" />
                <span>Cards Stack Side-by-Side</span>
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Option 1: Standard Full Screen (keeps current full screen) */}
          <button
            onClick={() => {
              if (isFullScreen && fullScreenMode === 'standard') {
                setIsFullScreen(false);
              } else {
                setIsFullScreen(true);
                setFullScreenMode('standard');
              }
            }}
            className={`p-1 rounded transition-colors ${
              isFullScreen && fullScreenMode === 'standard'
                ? 'bg-[#1F3E22] text-[#AFD1C2] font-bold'
                : 'text-[#1F3E22] hover:bg-black/10 dark:hover:bg-white/10'
            }`}
            title={isFullScreen && fullScreenMode === 'standard' ? "Exit Standard Full Screen" : "Standard Full Screen"}
          >
            {isFullScreen && fullScreenMode === 'standard' ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          {/* Option 2: Cards Stack Side by Side Full Screen */}
          <button
            onClick={() => {
              if (isFullScreen && fullScreenMode === 'cards-stack') {
                setIsFullScreen(false);
              } else {
                setIsFullScreen(true);
                setFullScreenMode('cards-stack');
              }
            }}
            className={`p-1 rounded transition-colors ${
              isFullScreen && fullScreenMode === 'cards-stack'
                ? 'bg-[#DF9C56] text-[#871201] font-bold shadow-xs'
                : 'text-[#1F3E22] hover:bg-black/10 dark:hover:bg-white/10'
            }`}
            title={isFullScreen && fullScreenMode === 'cards-stack' ? "Exit Cards Stack Full Screen" : "Cards Stack Side-by-Side (Full Screen)"}
          >
            <Columns3 className="w-4 h-4" />
          </button>

          <button
            onClick={onToggleCollapse}
            className="group p-1 text-[#709654] hover:text-[#1F3E22] dark:hover:text-[#F8EBE8] hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-all active:scale-90 hover:scale-105"
            title="Collapse Sidebar"
            aria-label="Collapse Sidebar"
          >
            <ChevronLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
          </button>
        </div>
      </div>

      {/* Search & Filter + Sort Control */}
      <div className="p-2.5 border-b border-[#709654]/25 dark:border-[#3B5D37]/60 space-y-2">
        <div className="flex items-center gap-1.5">
          {/* Master Clear moved to search's place */}
          <button
            onClick={handleOpenMasterClearModal}
            className="flex-1 text-[11px] font-extrabold py-1.5 px-2.5 rounded-lg bg-[#DB3A31]/10 border border-[#DB3A31]/60 hover:bg-[#DB3A31] hover:text-white text-[#DB3A31] transition-all active:scale-98 cursor-pointer shadow-2xs flex items-center justify-center gap-1.5"
            title="Master Clear: Clear all items and reset workspace"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Master Clear</span>
          </button>

          {/* Sort Controls */}
          <div className="relative flex items-center gap-1 shrink-0">
            {/* Top Sort Button & Direction Toggle */}
            <button
              onClick={() => setSortMenuOpen(!sortMenuOpen)}
              className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-bold bg-white dark:bg-[#1A331C] border border-[#709654]/40 hover:border-[#3B5D37] rounded-lg text-[#1F3E22] dark:text-[#F8EBE8] transition-all shadow-2xs cursor-pointer"
              title="Sort items by Serial #, Name, Type, or Status"
            >
              <ArrowUpDown className="w-3 h-3 text-[#709654]" />
              <span className="capitalize">{sortBy === 'serial' ? 'S/N' : sortBy}</span>
            </button>

            <button
              onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              style={{ color: '#eb1f1f', fontSize: '10px', backgroundColor: '#5fdff3' }}
              className="p-1.5 bg-white dark:bg-[#1A331C] border border-[#709654]/40 hover:border-[#3B5D37] rounded-lg text-[#1F3E22] dark:text-[#F8EBE8] text-[10px] font-mono font-bold transition-all shadow-2xs cursor-pointer hover:bg-black/5"
              title={`Sort Direction: ${sortOrder === 'asc' ? 'Ascending (1-9 / A-Z)' : 'Descending (9-1 / Z-A)'}`}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>

            {sortMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setSortMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-[#1A331C] border border-[#709654]/40 rounded-xl shadow-2xl z-50 py-1.5 text-xs text-[#1F3E22] dark:text-[#F8EBE8] animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1 font-bold text-[10px] text-[#709654] uppercase tracking-wider border-b border-black/5 dark:border-white/10 flex items-center justify-between">
                    <span>Sort Items By</span>
                    <span className="font-mono text-[#3B5D37] dark:text-[#AFD1C2] font-extrabold">{sortOrder === 'asc' ? 'ASC ↑' : 'DESC ↓'}</span>
                  </div>
                  {[
                    { key: 'serial', label: 'Serial Number (S/N)', desc: 'Natural numeric: SN-01, SN-02...', icon: <Hash className="w-3.5 h-3.5 text-[#DF9C56]" /> },
                    { key: 'name', label: 'Item Name (A-Z)', desc: 'Alphabetical by name', icon: <SlidersHorizontal className="w-3.5 h-3.5 text-[#2563EB]" /> },
                    { key: 'type', label: 'Category / Type', desc: 'Grouped by item classification', icon: <Package className="w-3.5 h-3.5 text-[#9333EA]" /> },
                    { key: 'status', label: 'Status (Running / Alert)', desc: 'Running > Error > Nominal > Idle', icon: <CheckCircle2 className="w-3.5 h-3.5 text-[#3B5D37]" /> },
                  ].map((opt, optIdx) => (
                    <button
                      key={`${opt.key}-${optIdx}`}
                      onClick={() => {
                        setSortBy(opt.key as any);
                        setSortMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-1.5 text-left text-[11px] font-semibold hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer ${
                        sortBy === opt.key ? 'text-[#3B5D37] dark:text-[#AFD1C2] bg-[#3B5D37]/10 font-bold' : 'text-[#1F3E22] dark:text-[#F8EBE8]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {opt.icon}
                        <div>
                          <div>{opt.label}</div>
                          <div className="text-[9px] text-[#709654]/80 font-normal">{opt.desc}</div>
                        </div>
                      </div>
                      {sortBy === opt.key && <span className="text-[11px] font-bold text-[#3B5D37] dark:text-[#AFD1C2]">✓</span>}
                    </button>
                  ))}

                  <div className="border-t border-black/5 dark:border-white/10 my-1 pt-1">
                    <div className="px-3 py-1 font-bold text-[10px] text-[#709654] uppercase tracking-wider">
                      Layout Mode
                    </div>
                    <button
                      onClick={() => {
                        setViewMode('grouped');
                        setSortMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-1.5 text-left text-[11px] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer ${
                        viewMode === 'grouped' ? 'text-[#3B5D37] dark:text-[#AFD1C2] bg-[#3B5D37]/10 font-bold' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <LayoutList className="w-3.5 h-3.5 text-[#709654]" />
                        <span>Grouped by Category</span>
                      </div>
                      {viewMode === 'grouped' && <span className="text-[11px] font-bold text-[#3B5D37]">✓</span>}
                    </button>
                    <button
                      onClick={() => {
                        setViewMode('flat');
                        setSortMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-1.5 text-left text-[11px] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer ${
                        viewMode === 'flat' ? 'text-[#3B5D37] dark:text-[#AFD1C2] bg-[#3B5D37]/10 font-bold' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <ListFilter className="w-3.5 h-3.5 text-[#3B5D37]" />
                        <span>Flat Continuous List</span>
                      </div>
                      {viewMode === 'flat' && <span className="text-[11px] font-bold text-[#3B5D37]">✓</span>}
                    </button>
                  </div>

                  <div className="border-t border-black/5 dark:border-white/10 my-1 pt-1">
                    <div className="px-3 py-1 font-bold text-[10px] text-[#709654] uppercase tracking-wider flex items-center justify-between">
                      <span>Filter By Category</span>
                      {selectedTypeFilter !== 'all' && (
                        <button
                          type="button"
                          onClick={() => {
                            handleSelectFilter('all');
                            setSortMenuOpen(false);
                          }}
                          className="text-[9px] text-[#DB3A31] hover:underline cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        handleSelectFilter('all');
                        setSortMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-1.5 text-left text-[11px] font-semibold hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer ${
                        selectedTypeFilter === 'all' ? 'text-[#3B5D37] dark:text-[#AFD1C2] bg-[#3B5D37]/10 font-bold' : 'text-[#1F3E22] dark:text-[#F8EBE8]'
                      }`}
                    >
                      <span>All Categories ({items.length})</span>
                      {selectedTypeFilter === 'all' && <span className="text-[11px] font-bold text-[#3B5D37] dark:text-[#AFD1C2]">✓</span>}
                    </button>
                    {categories.map((c: any, cIdx: number) => {
                      const count = items.filter((i) => i.type === c.key).length;
                      const title = categoryTitles[c.key] || c.title || c.key;
                      const isSelected = selectedTypeFilter === c.key;
                      return (
                        <button
                          key={`${c.key}-${cIdx}`}
                          type="button"
                          onClick={() => {
                            handleSelectFilter(c.key);
                            setSortMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-1.5 text-left text-[11px] font-semibold hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer ${
                            isSelected ? 'text-[#3B5D37] dark:text-[#AFD1C2] bg-[#3B5D37]/10 font-bold' : 'text-[#1F3E22] dark:text-[#F8EBE8]'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                            <span className="truncate">{title}</span>
                            <span className="text-[10px] opacity-70">({count})</span>
                          </div>
                          {isSelected && <span className="text-[11px] font-bold text-[#3B5D37] dark:text-[#AFD1C2]">✓</span>}
                        </button>
                      );
                    })}
                  </div>

                  <div className="border-t border-black/5 dark:border-white/10 my-1 pt-1 px-2 flex items-center justify-between gap-1">
                    <span className="text-[10px] text-[#709654] font-semibold">Direction:</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setSortOrder('asc');
                          setSortMenuOpen(false);
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                          sortOrder === 'asc' ? 'bg-[#3B5D37] text-white' : 'bg-black/5 dark:bg-white/10 hover:bg-black/10'
                        }`}
                      >
                        Asc (1-9 / A-Z)
                      </button>
                      <button
                        onClick={() => {
                          setSortOrder('desc');
                          setSortMenuOpen(false);
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                          sortOrder === 'desc' ? 'bg-[#3B5D37] text-white' : 'bg-black/5 dark:bg-white/10 hover:bg-black/10'
                        }`}
                      >
                        Desc (9-1 / Z-A)
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Actions Row: Collapse All + Plus Button & Grouped / Flat View Mode */}
        <div className="flex items-center gap-2 pt-0.5">
          <div className="flex-1 flex items-center gap-1.5">
            <button
              onClick={allCollapsed ? expandAll : collapseAll}
              className="flex-1 text-[11px] font-bold py-1.5 px-2 rounded-lg border border-[#709654]/40 bg-white/80 dark:bg-[#1A331C] hover:bg-[#709654]/20 text-[#1F3E22] dark:text-[#F8EBE8] transition-all active:scale-98 cursor-pointer shadow-2xs text-center truncate"
              title={allCollapsed ? 'Expand all categories' : 'Collapse all categories'}
            >
              {allCollapsed ? 'Expand All' : 'Collapse All'}
            </button>

            {/* Plus button added nearby Collapse All */}
            <div className="relative shrink-0">
              <button
                onClick={() => setPlusMenuOpen(!plusMenuOpen)}
                className="p-1.5 text-[#1F3E22] dark:text-[#F8EBE8] bg-white/80 dark:bg-[#1A331C] border border-[#709654]/40 hover:border-[#3B5D37] hover:bg-[#709654]/20 rounded-lg transition-all active:scale-95 shadow-2xs flex items-center justify-center cursor-pointer"
                title="Add New Item or Category"
                aria-label="Add item or category"
              >
                <Plus className="w-3.5 h-3.5 transition-transform duration-200" />
              </button>

              {plusMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setPlusMenuOpen(false)} />
                  <div className="absolute left-0 top-full mt-1.5 w-56 bg-white dark:bg-[#1A331C] border border-[#709654]/40 rounded-xl shadow-xl z-50 py-1 text-xs animate-in fade-in zoom-in-95 duration-100">
                    <button
                      onClick={() => {
                        setPlusMenuOpen(false);
                        onOpenNewItemModal();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-black/5 dark:hover:bg-white/10 text-[#1F3E22] dark:text-[#F8EBE8] font-semibold cursor-pointer"
                    >
                      <Package className="w-3.5 h-3.5 text-[#709654]" />
                      <span>Register New Item</span>
                    </button>
                    <button
                      onClick={() => {
                        setPlusMenuOpen(false);
                        setAddCatModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-black/5 dark:hover:bg-white/10 text-[#3B5D37] dark:text-[#AFD1C2] font-bold border-t border-black/5 dark:border-white/10 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#3B5D37]" />
                      <span>Add Category #{categories.length + 1}</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Grouped / Flat Button moved into Master Clear's previous place */}
          <button
            onClick={() => setViewMode((v) => (v === 'grouped' ? 'flat' : 'grouped'))}
            className={`flex-1 py-1.5 px-2.5 rounded-lg border transition-all shadow-2xs text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 ${
              viewMode === 'flat'
                ? 'bg-[#3B5D37] text-white border-[#3B5D37]'
                : 'bg-white dark:bg-[#1A331C] border-[#709654]/40 text-[#1F3E22] dark:text-[#F8EBE8] hover:border-[#3B5D37]'
            }`}
            title={viewMode === 'flat' ? 'Current: Flat Continuous Sorted List (Click to Group by Category)' : 'Current: Grouped by Category (Click for Flat Sorted List)'}
          >
            {viewMode === 'flat' ? <ListFilter className="w-3.5 h-3.5" /> : <LayoutList className="w-3.5 h-3.5" />}
            <span>{viewMode === 'flat' ? 'Flat List' : 'Grouped'}</span>
          </button>
        </div>
      </div>

      {/* Main Content: Either Side-by-Side Cards Stack or Tree Content */}
      {isFullScreen && fullScreenMode === 'cards-stack' ? (
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-4 bg-slate-100/80 dark:bg-[#0c180e]">
          <div className="flex gap-4 h-full min-w-max pb-1">
            {sections.map((section, sectionIdx) => {
              const theme = getTypeTheme(section.type);
              const isFilteredOut = selectedTypeFilter !== 'all' && selectedTypeFilter !== section.type;

              return (
                <div
                  key={`${section.key}-${sectionIdx}`}
                  className={`w-84 flex flex-col h-full rounded-2xl bg-[#F8EBE8] dark:bg-[#152717] border-2 shadow-md transition-all ${
                    isFilteredOut ? 'opacity-35 grayscale-[30%]' : ''
                  }`}
                  style={{ borderColor: section.color }}
                >
                  {/* Column Header Card */}
                  <div className={`p-3 rounded-t-xl flex items-center justify-between border-b ${section.headerBg}`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-xs ${section.iconBg}`}>
                        {section.icon}
                      </div>
                      <div className="min-w-0">
                        {editingCategoryKey === section.key ? (
                          <input
                            type="text"
                            value={categoryDraft}
                            onChange={(e) => setCategoryDraft(e.target.value)}
                            onBlur={() => handleSaveCategoryTitle(section.key)}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              if (e.key === 'Enter') handleSaveCategoryTitle(section.key);
                              if (e.key === 'Escape') setEditingCategoryKey(null);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            onDoubleClick={(e) => e.stopPropagation()}
                            autoFocus
                            className="text-xs font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-1 py-0.2 rounded border border-[#DF9C56] focus:outline-none w-36"
                          />
                        ) : (
                          <h3 
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              setEditingCategoryKey(section.key);
                              setCategoryDraft(section.title);
                            }}
                            className={`font-bold text-xs truncate cursor-text hover:underline decoration-dashed ${section.headerText}`}
                            title="Double click to edit column heading"
                          >
                            {section.title}
                          </h3>
                        )}
                        <span className="text-[10px] text-[#709654] font-medium">
                          {section.items.length} {section.items.length === 1 ? 'card' : 'cards'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => onOpenNewItemModal(section.type)}
                        className={`p-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs ${theme.addBtn}`}
                        title={`Add new ${section.type}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenDeleteCategoryModal(section.key, section.title, section.items.length)}
                        className="p-1.5 rounded-lg text-[#DB3A31] hover:bg-[#DB3A31]/15 transition-colors"
                        title={`Delete or clear ${section.title}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Column Stack Cards Container */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {section.items.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-[#709654]/30 rounded-xl p-4 text-center">
                        <div className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-[#709654] mb-2">
                          {section.icon}
                        </div>
                        <p className="text-xs font-semibold text-[#1F3E22] dark:text-[#AFD1C2]">
                          No items in this column
                        </p>
                        <p className="text-[10px] text-[#709654] mt-1 mb-3">
                          Click + Add to create a new {section.type}
                        </p>
                        <button
                          onClick={() => onOpenNewItemModal(section.type)}
                          className={`px-3 py-1 text-xs font-bold rounded-lg shadow-2xs ${theme.addBtn}`}
                        >
                          + Add Item
                        </button>
                      </div>
                    ) : (
                      section.items.map((item, itemIdx) => {
                        const isSelectedOnCanvas = selectedItemId === item.id;
                        const isOnActiveCanvas = activeCanvasItemIds.includes(item.id);

                        return (
                          <div
                            key={`${item.id}-${itemIdx}`}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData('application/json', JSON.stringify(item));
                              e.dataTransfer.setData('text/plain', item.id);
                              e.dataTransfer.effectAllowed = 'copy';
                            }}
                            onClick={() => onSelectItem?.(item)}
                            className={`group/card relative flex flex-col p-3 rounded-xl border bg-white dark:bg-[#1A331C] shadow-xs hover:shadow-md transition-all cursor-pointer ${
                              isSelectedOnCanvas
                                ? 'ring-2 ring-[#DF9C56] border-[#DF9C56] bg-amber-500/5'
                                : isOnActiveCanvas
                                ? 'border-[#709654]/70'
                                : 'border-[#709654]/30 dark:border-[#3B5D37]/50'
                            }`}
                          >
                            {/* Card Top: Drag handle, Icon, Editable Title & Description */}
                            <div className="flex items-start gap-2.5">
                              <div className="cursor-grab active:cursor-grabbing text-[#709654]/50 group-hover/card:text-[#1F3E22] mt-0.5">
                                <GripVertical className="w-3.5 h-3.5" />
                              </div>
                              <div className={theme.iconWrapper}>
                                {getItemIcon(item.icon, item.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-0.5 min-w-0">
                                  {editingItemSNId === item.id ? (
                                    <input
                                      type="text"
                                      value={itemDraftSN}
                                      onChange={(e) => setItemDraftSN(e.target.value)}
                                      onBlur={() => handleSaveItemSN(item.id)}
                                      onKeyDown={(e) => {
                                        e.stopPropagation();
                                        if (e.key === 'Enter') handleSaveItemSN(item.id);
                                        if (e.key === 'Escape') setEditingItemSNId(null);
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      onMouseDown={(e) => e.stopPropagation()}
                                      onDoubleClick={(e) => e.stopPropagation()}
                                      autoFocus
                                      className="text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 px-1 py-0.2 rounded border border-[#DF9C56] focus:outline-none w-16 shrink-0"
                                    />
                                  ) : (
                                    <span
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingItemSNId(item.id);
                                        setItemDraftSN(cleanSerialNumber(item.serialNumber));
                                      }}
                                      className="text-[10px] font-mono font-extrabold px-1.5 py-0.2 rounded bg-[#DF9C56]/20 text-[#871201] dark:text-[#DF9C56] border border-[#DF9C56]/40 cursor-pointer hover:scale-105 active:scale-95 transition-all shrink-0"
                                      title="Click to edit S.No (duplicate numbers auto-suffix as 1a, 1b...)"
                                    >
                                      {cleanSerialNumber(item.serialNumber)}
                                    </span>
                                  )}
                                  {editingItemId === item.id ? (
                                    <input
                                      type="text"
                                      value={itemDraftName}
                                      onChange={(e) => setItemDraftName(e.target.value)}
                                      onBlur={() => handleSaveItemName(item.id)}
                                      onKeyDown={(e) => {
                                        e.stopPropagation();
                                        if (e.key === 'Enter') handleSaveItemName(item.id);
                                        if (e.key === 'Escape') setEditingItemId(null);
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      onMouseDown={(e) => e.stopPropagation()}
                                      onDoubleClick={(e) => e.stopPropagation()}
                                      autoFocus
                                      className="text-xs font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-1.5 py-0.5 rounded border-2 border-[#DF9C56] shadow-inner focus:outline-none flex-1 min-w-0"
                                    />
                                  ) : (
                                    <h4
                                      onDoubleClick={(e) => handleStartEditItem(item, e)}
                                      className="text-xs font-bold text-[#1F3E22] dark:text-[#F8EBE8] truncate cursor-text hover:underline decoration-dashed flex-1 min-w-0"
                                      title="Double click to edit item name"
                                    >
                                      {item.name}
                                    </h4>
                                  )}
                                </div>

                                {/* Sub-text: Description */}
                                {editingItemDescId === item.id ? (
                                  <input
                                    type="text"
                                    value={itemDraftDesc}
                                    onChange={(e) => setItemDraftDesc(e.target.value)}
                                    onBlur={() => handleSaveItemDesc(item.id)}
                                    onKeyDown={(e) => {
                                      e.stopPropagation();
                                      if (e.key === 'Enter') handleSaveItemDesc(item.id);
                                      if (e.key === 'Escape') setEditingItemDescId(null);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onDoubleClick={(e) => e.stopPropagation()}
                                    autoFocus
                                    className="text-[11px] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-1 py-0.2 rounded border border-[#DF9C56] focus:outline-none w-full mt-0.5"
                                  />
                                ) : (
                                  <p 
                                    onDoubleClick={(e) => {
                                      e.stopPropagation();
                                      setEditingItemDescId(item.id);
                                      setItemDraftDesc(item.description);
                                    }}
                                    className="text-[11px] text-[#709654] dark:text-[#AFD1C2]/80 line-clamp-2 mt-0.5 cursor-text hover:underline decoration-dashed"
                                    title="Double click to edit description"
                                  >
                                    {item.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Card Metadata: Category pill & Tags */}
                            <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-[#709654]/15">
                              {editingItemCatId === item.id ? (
                                <input
                                  type="text"
                                  value={itemDraftCat}
                                  onChange={(e) => setItemDraftCat(e.target.value)}
                                  onBlur={() => handleSaveItemCategory(item.id)}
                                  onKeyDown={(e) => {
                                    e.stopPropagation();
                                    if (e.key === 'Enter') handleSaveItemCategory(item.id);
                                    if (e.key === 'Escape') setEditingItemCatId(null);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onDoubleClick={(e) => e.stopPropagation()}
                                  autoFocus
                                  className="text-[9px] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-1 py-0.2 rounded border border-[#DF9C56] focus:outline-none w-20"
                                />
                              ) : (
                                <span 
                                  onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    setEditingItemCatId(item.id);
                                    setItemDraftCat(item.category);
                                  }}
                                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${theme.badge} bg-black/5 dark:bg-white/5 cursor-text hover:underline decoration-dashed`}
                                  title="Double click to edit category"
                                >
                                  {item.category}
                                </span>
                              )}
                              {isOnActiveCanvas && (
                                <span 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAttemptDeleteItem(item);
                                  }}
                                  style={{ fontSize: '14px' }}
                                  className="text-[14px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 hover:bg-[#DB3A31]/20 text-emerald-700 hover:text-[#DB3A31] dark:text-emerald-400 dark:hover:text-[#F87171] cursor-pointer transition-colors active:scale-95 shadow-2xs"
                                  title="Item is active on canvas (Click to manage permission or delete from all canvas)"
                                >
                                  ON
                                </span>
                              )}
                              {item.tags.map((tag) => (
                                <span key={tag} className="text-[9px] text-[#709654] dark:text-[#AFD1C2]/70 bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded">
                                  #{tag}
                                </span>
                              ))}
                            </div>

                            {/* Card Action Buttons */}
                            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-[#709654]/15">
                              <span className="text-[9px] text-[#709654]/70 font-mono">
                                Drag to canvas
                              </span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAttemptDeleteItem(item);
                                  }}
                                  className="p-1 text-[#DB3A31]/70 hover:text-[#871201] hover:bg-[#DB3A31]/10 rounded-md transition-colors"
                                  title={isOnActiveCanvas ? "Item is on canvas - Click to request permission to delete across all canvas" : "Delete card"}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onAddToCanvas(item);
                                  }}
                                  className={`px-2.5 py-1 text-[10px] font-bold rounded-lg shadow-2xs transition-all ${theme.addBtn}`}
                                  title="Place onto canvas"
                                >
                                  + Add to Canvas
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Tree Content with Visually Distinguishable Headers */
        <div className="flex-1 overflow-y-auto px-2 py-2.5 space-y-3" style={{ backgroundColor: '#ffffff' }}>
          {sections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#DB3A31]/15 text-[#DB3A31] flex items-center justify-center shadow-xs">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-[#1F3E22] dark:text-[#F8EBE8]">
                  Master Cleared
                </h3>
                <p className="text-xs text-[#709654] dark:text-[#AFD1C2] max-w-xs">
                  All category window heads (&quot;select div types&quot;) and organizer items have been cleared.
                </p>
              </div>
              <div className="flex flex-col gap-2 pt-2 w-full max-w-xs">
                <button
                  onClick={handleRestoreDefaults}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-[#1F3E22] hover:bg-[#3B5D37] text-[#F8EBE8] shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Default Categories &amp; Items</span>
                </button>
                <button
                  onClick={() => setAddCatModalOpen(true)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-[#709654] hover:bg-[#709654]/15 text-[#1F3E22] dark:text-[#F8EBE8] transition-all active:scale-95 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Custom Category</span>
                </button>
              </div>
            </div>
          ) : viewMode === 'flat' ? (
            /* Flat Continuous Sorted Sequence */
            <div className="space-y-2.5">
              {/* Header Banner */}
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#EEDFD8] dark:bg-[#1A331C] border border-[#709654]/30 shadow-2xs">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-[#3B5D37] text-white flex items-center justify-center text-xs font-bold">
                    <ListFilter className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#1F3E22] dark:text-[#F8EBE8] flex items-center gap-1.5">
                      <span>Flat Sorted Sequence</span>
                      <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-md bg-[#DF9C56]/20 text-[#871201] font-bold">
                        {filteredItems.length} items
                      </span>
                    </div>
                    <div className="text-[10px] text-[#709654] dark:text-[#AFD1C2]/80">
                      Sorted by <span className="font-semibold capitalize">{sortBy === 'serial' ? 'Serial Number (S/N)' : sortBy}</span> ({sortOrder === 'asc' ? 'Ascending' : 'Descending'})
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setViewMode('grouped')}
                  className="text-[10px] font-bold px-2 py-1 rounded-lg bg-white dark:bg-[#122214] border border-[#709654]/30 hover:bg-black/5 text-[#1F3E22] dark:text-[#F8EBE8] transition-all cursor-pointer shadow-2xs"
                  title="Switch to Category Grouped View"
                >
                  Switch to Grouped
                </button>
              </div>

              {filteredItems.length === 0 ? (
                <div className="text-center py-8 text-xs text-[#709654]">
                  No items match the current search filter.
                </div>
              ) : (
                filteredItems.map((item, itemIdx) => {
                  const theme = getTypeTheme(item.type);
                  const isSelectedOnCanvas = selectedItemId === item.id;
                  const isOnActiveCanvas = activeCanvasItemIds.includes(item.id);
                  return (
                    <div
                      key={`${item.id}-${itemIdx}`}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/json', JSON.stringify(item));
                        e.dataTransfer.setData('text/plain', item.id);
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      onClick={() => onSelectItem?.(item)}
                      style={{
                        backgroundColor: '#ffffff',
                        borderColor: '#ffffff',
                      }}
                      className={`group/item flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer text-left shadow-2xs ${theme.card} ${
                        isSelectedOnCanvas
                          ? 'ring-2 ring-[#DF9C56] shadow-md bg-amber-500/10 dark:bg-amber-500/20'
                          : isOnActiveCanvas
                          ? 'border-[#709654]/70 bg-emerald-500/5'
                          : ''
                      }`}
                    >
                      <div className="flex items-start gap-2 min-w-0 flex-1">
                        <GripVertical className="w-3.5 h-3.5 text-[#709654]/50 group-hover/item:text-[#1F3E22] dark:group-hover/item:text-[#F8EBE8] shrink-0 mt-0.5" />
                        <div className={theme.iconWrapper}>
                          {getItemIcon(item.icon, item.type)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-0.5 min-w-0">
                            {editingItemSNId === item.id ? (
                              <input
                                type="text"
                                value={itemDraftSN}
                                onChange={(e) => setItemDraftSN(e.target.value)}
                                onBlur={() => handleSaveItemSN(item.id)}
                                onKeyDown={(e) => {
                                  e.stopPropagation();
                                  if (e.key === 'Enter') handleSaveItemSN(item.id);
                                  if (e.key === 'Escape') setEditingItemSNId(null);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                onDoubleClick={(e) => e.stopPropagation()}
                                autoFocus
                                className="text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 px-1 py-0.2 rounded border border-[#DF9C56] focus:outline-none w-16 shrink-0"
                              />
                            ) : (
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingItemSNId(item.id);
                                  setItemDraftSN(cleanSerialNumber(item.serialNumber));
                                }}
                                className="text-[10px] font-mono font-extrabold px-1.5 py-0.2 rounded bg-[#DF9C56]/20 text-[#871201] dark:text-[#DF9C56] border border-[#DF9C56]/40 cursor-pointer hover:scale-105 active:scale-95 transition-all shrink-0"
                                title="Click to edit S.No (duplicate numbers auto-suffix as 1a, 1b...)"
                              >
                                {cleanSerialNumber(item.serialNumber)}
                              </span>
                            )}
                            {editingItemId === item.id ? (
                              <input
                                type="text"
                                value={itemDraftName}
                                onChange={(e) => setItemDraftName(e.target.value)}
                                onBlur={() => handleSaveItemName(item.id)}
                                onKeyDown={(e) => {
                                  e.stopPropagation();
                                  if (e.key === 'Enter') handleSaveItemName(item.id);
                                  if (e.key === 'Escape') setEditingItemId(null);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                onDoubleClick={(e) => e.stopPropagation()}
                                autoFocus
                                className="text-xs font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-1 py-0.5 rounded border-2 border-[#DF9C56] shadow-inner focus:outline-none flex-1 min-w-0"
                              />
                            ) : (
                              <div 
                                className="text-xs font-bold text-[#1F3E22] dark:text-[#F8EBE8] truncate cursor-text hover:underline decoration-dashed flex-1 min-w-0"
                                onDoubleClick={(e) => handleStartEditItem(item, e)}
                                title="Double click to edit item name"
                              >
                                {item.name}
                              </div>
                            )}
                          </div>

                          {/* Sub-text: Description */}
                          {editingItemDescId === item.id ? (
                            <input
                              type="text"
                              value={itemDraftDesc}
                              onChange={(e) => setItemDraftDesc(e.target.value)}
                              onBlur={() => handleSaveItemDesc(item.id)}
                              onKeyDown={(e) => {
                                e.stopPropagation();
                                if (e.key === 'Enter') handleSaveItemDesc(item.id);
                                if (e.key === 'Escape') setEditingItemDescId(null);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                              onDoubleClick={(e) => e.stopPropagation()}
                              autoFocus
                              className="text-[11px] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-1 py-0.2 rounded border border-[#DF9C56] focus:outline-none w-full mt-0.5"
                            />
                          ) : (
                            <div 
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                setEditingItemDescId(item.id);
                                setItemDraftDesc(item.description);
                              }}
                              className="text-[11px] text-[#709654] dark:text-[#AFD1C2]/80 truncate cursor-text hover:underline decoration-dashed"
                              title="Double click to edit description"
                            >
                              {item.description}
                            </div>
                          )}

                          <div className="flex items-center gap-1.5 mt-1 text-[10px]">
                            {editingItemCatId === item.id ? (
                              <input
                                type="text"
                                value={itemDraftCat}
                                onChange={(e) => setItemDraftCat(e.target.value)}
                                onBlur={() => handleSaveItemCategory(item.id)}
                                onKeyDown={(e) => {
                                  e.stopPropagation();
                                  if (e.key === 'Enter') handleSaveItemCategory(item.id);
                                  if (e.key === 'Escape') setEditingItemCatId(null);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                onDoubleClick={(e) => e.stopPropagation()}
                                autoFocus
                                className="text-[10px] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-1 py-0.2 rounded border border-[#DF9C56] focus:outline-none w-20"
                              />
                            ) : (
                              <span 
                                onDoubleClick={(e) => {
                                  e.stopPropagation();
                                  setEditingItemCatId(item.id);
                                  setItemDraftCat(item.category);
                                }}
                                className={`font-semibold cursor-text hover:underline decoration-dashed ${theme.badge}`}
                                title="Double click to edit category"
                              >
                                {item.category}
                              </span>
                            )}
                            {isOnActiveCanvas && (
                              <span 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAttemptDeleteItem(item);
                                }}
                                style={{ fontSize: '14px' }}
                                className="text-[14px] font-bold px-1.5 py-0.2 rounded-full bg-[#709654]/20 hover:bg-[#DB3A31]/20 text-[#3B5D37] hover:text-[#DB3A31] dark:text-[#AFD1C2] dark:hover:text-[#F87171] cursor-pointer transition-colors active:scale-95 shadow-2xs"
                                title="Item is active on canvas (Click to manage permission or delete from all canvas)"
                              >
                                ON
                              </span>
                            )}
                            {item.tags.length > 0 && (
                              <>
                                <span className="text-[#709654]">·</span>
                                <span className="text-[#709654] dark:text-[#AFD1C2]/60 truncate">#{item.tags[0]}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Item Action buttons */}
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button
                          onClick={() => onAddToCanvas(item)}
                          className={`opacity-0 group-hover/item:opacity-100 px-2.5 py-1 text-[10px] font-bold rounded-md transition-all whitespace-nowrap shadow-xs ${theme.addBtn}`}
                          title="Place on active canvas"
                        >
                          + Add
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAttemptDeleteItem(item);
                          }}
                          className="opacity-0 group-hover/item:opacity-100 p-1 text-[#DB3A31] hover:text-[#871201] hover:bg-[#DB3A31]/15 rounded transition-all"
                          title={isOnActiveCanvas ? "Item is on canvas - Click to request permission to delete across all canvas" : "Delete item from organizer"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            sections.map((section, sectionIdx) => {
              const isCollapsed = collapsedGroups[section.key];
              const theme = getTypeTheme(section.type);
              return (
                <div 
                  key={`${section.key}-${sectionIdx}`} 
                  className="space-y-1.5"
                  style={sectionIdx === 0 ? { backgroundColor: '#ffffff' } : undefined}
                >
                  {/* Category Header Card with Bold Alternating Colors & Clear/Delete Button */}
                  <div 
                    onClick={() => handleCategoryHeaderClick(section.key)}
                    style={sectionIdx === 3 ? { fontSize: '14px' } : undefined}
                    className={`flex items-center justify-between px-2.5 py-2 rounded-xl cursor-pointer font-bold text-xs shadow-xs transition-all ${section.headerBg} ${
                      selectedTypeFilter === section.type ? 'ring-2 ring-offset-1 ring-[#871201] dark:ring-white scale-[1.01]' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 shadow-2xs ${section.iconBg}`}>
                        {section.icon}
                      </div>
                      {/* Category S.No: just number, click-editable with duplicate suffix */}
                      {editingCatSNKey === section.key ? (
                        <input
                          type="text"
                          value={categoryDraftSN}
                          onChange={(e) => setCategoryDraftSN(e.target.value)}
                          onBlur={() => handleSaveCategorySN(section.key, sectionIdx)}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === 'Enter') handleSaveCategorySN(section.key, sectionIdx);
                            if (e.key === 'Escape') setEditingCatSNKey(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          autoFocus
                          className="text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 px-1 py-0.2 rounded border border-[#DF9C56] focus:outline-none w-10 text-center shrink-0"
                        />
                      ) : (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCatSNKey(section.key);
                            setCategoryDraftSN(getCategorySN(section.key, sectionIdx));
                          }}
                          style={{ fontSize: sectionIdx === 0 ? '14px' : undefined }}
                          className="text-[10px] font-mono font-extrabold px-1.5 py-0.2 rounded-md bg-black/15 dark:bg-white/20 border border-black/10 dark:border-white/20 cursor-pointer hover:scale-105 active:scale-95 transition-all shrink-0"
                          title="Click to edit category S.No (duplicate numbers auto-suffix as 1a, 1b...)"
                        >
                          {getCategorySN(section.key, sectionIdx)}
                        </span>
                      )}
                      {editingCategoryKey === section.key ? (
                        <input
                          type="text"
                          value={categoryDraft}
                          onChange={(e) => setCategoryDraft(e.target.value)}
                          onBlur={() => handleSaveCategoryTitle(section.key)}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === 'Enter') handleSaveCategoryTitle(section.key);
                            if (e.key === 'Escape') setEditingCategoryKey(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          onDoubleClick={(e) => e.stopPropagation()}
                          autoFocus
                          className="text-xs font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-1 py-0.2 rounded border border-[#DF9C56] focus:outline-none w-36"
                        />
                      ) : (
                        <span 
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setEditingCategoryKey(section.key);
                            setCategoryDraft(section.title);
                          }}
                          className={`truncate cursor-text hover:underline decoration-dashed ${section.headerText}`}
                          title="Double click to edit category heading"
                        >
                          {section.title}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md font-bold shadow-2xs ${section.badgeBg}`}>
                        {section.items.length}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenNewItemModal(section.type);
                        }}
                        className="p-0.5 opacity-80 hover:opacity-100 rounded transition-opacity"
                        title={`Add new ${section.type}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDeleteCategoryModal(section.key, section.title, section.items.length);
                        }}
                        className="p-1 opacity-70 hover:opacity-100 hover:text-[#DB3A31] hover:bg-[#DB3A31]/10 rounded transition-all"
                        title={`Delete or clear this ${section.title} section`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <span 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleGroup(section.key);
                        }}
                        className={`p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-transform active:scale-90 cursor-pointer flex items-center justify-center ${section.headerText}`}
                        title={isCollapsed ? `Expand ${section.title}` : `Collapse ${section.title}`}
                      >
                        {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </span>
                    </div>
                  </div>

                {/* Items Tree */}
                {!isCollapsed && (
                  <div 
                    className={`pl-3 pr-1 space-y-2 ml-3.5 ${theme.treeBorder}`}
                    style={{ backgroundColor: '#ffffff' }}
                  >
                    {section.items.length === 0 ? (
                      <div className="px-2 py-2 text-[11px] text-[#709654] italic">
                        No matching {section.title.toLowerCase()}
                      </div>
                    ) : (
                      section.items.map((item, itemIdx) => {
                        const isAlternateRow = itemIdx % 2 === 1;
                        const isSelectedOnCanvas = selectedItemId === item.id;
                        const isOnActiveCanvas = activeCanvasItemIds.includes(item.id);
                        return (
                          <div
                            key={`${item.id}-${itemIdx}`}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData('application/json', JSON.stringify(item));
                              e.dataTransfer.setData('text/plain', item.id);
                              e.dataTransfer.effectAllowed = 'copy';
                            }}
                            onClick={() => onSelectItem?.(item)}
                            style={{
                              backgroundColor: '#ffffff',
                              borderColor: '#ffffff',
                            }}
                            className={`group/item flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer text-left shadow-2xs ${theme.card} ${
                              isSelectedOnCanvas
                                ? 'ring-2 ring-[#DF9C56] shadow-md bg-amber-500/10 dark:bg-amber-500/20'
                                : isOnActiveCanvas
                                ? 'border-[#709654]/70 bg-emerald-500/5'
                                : ''
                            }`}
                          >
                            <div className="flex items-start gap-2 min-w-0 flex-1">
                              <GripVertical className="w-3.5 h-3.5 text-[#709654]/50 group-hover/item:text-[#1F3E22] dark:group-hover/item:text-[#F8EBE8] shrink-0 mt-0.5" />
                              <div className={theme.iconWrapper}>
                                {getItemIcon(item.icon, item.type)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 mb-0.5 min-w-0">
                                  {editingItemSNId === item.id ? (
                                    <input
                                      type="text"
                                      value={itemDraftSN}
                                      onChange={(e) => setItemDraftSN(e.target.value)}
                                      onBlur={() => handleSaveItemSN(item.id)}
                                      onKeyDown={(e) => {
                                        e.stopPropagation();
                                        if (e.key === 'Enter') handleSaveItemSN(item.id);
                                        if (e.key === 'Escape') setEditingItemSNId(null);
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      onMouseDown={(e) => e.stopPropagation()}
                                      onDoubleClick={(e) => e.stopPropagation()}
                                      autoFocus
                                      className="text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 px-1 py-0.2 rounded border border-[#DF9C56] focus:outline-none w-16 shrink-0"
                                    />
                                  ) : (
                                    <span
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingItemSNId(item.id);
                                        setItemDraftSN(cleanSerialNumber(item.serialNumber));
                                      }}
                                      className="text-[10px] font-mono font-extrabold px-1.5 py-0.2 rounded bg-[#DF9C56]/20 text-[#871201] dark:text-[#DF9C56] border border-[#DF9C56]/40 cursor-pointer hover:scale-105 active:scale-95 transition-all shrink-0"
                                      title="Click to edit S.No (duplicate numbers auto-suffix as 1a, 1b...)"
                                    >
                                      {cleanSerialNumber(item.serialNumber)}
                                    </span>
                                  )}
                                  {editingItemId === item.id ? (
                                    <input
                                      type="text"
                                      value={itemDraftName}
                                      onChange={(e) => setItemDraftName(e.target.value)}
                                      onBlur={() => handleSaveItemName(item.id)}
                                      onKeyDown={(e) => {
                                        e.stopPropagation();
                                        if (e.key === 'Enter') handleSaveItemName(item.id);
                                        if (e.key === 'Escape') setEditingItemId(null);
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      onMouseDown={(e) => e.stopPropagation()}
                                      onDoubleClick={(e) => e.stopPropagation()}
                                      autoFocus
                                      className="text-xs font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-1 py-0.5 rounded border-2 border-[#DF9C56] shadow-inner focus:outline-none flex-1 min-w-0"
                                    />
                                  ) : (
                                    <div 
                                      className="text-xs font-bold text-[#1F3E22] dark:text-[#F8EBE8] truncate cursor-text hover:underline decoration-dashed flex-1 min-w-0"
                                      style={sectionIdx === 2 && itemIdx === 1 ? { fontSize: '12px' } : undefined}
                                      onDoubleClick={(e) => handleStartEditItem(item, e)}
                                      title="Double click to edit item name"
                                    >
                                      {item.name}
                                    </div>
                                  )}
                                </div>

                                {/* Sub-text: Description */}
                                {editingItemDescId === item.id ? (
                                  <input
                                    type="text"
                                    value={itemDraftDesc}
                                    onChange={(e) => setItemDraftDesc(e.target.value)}
                                    onBlur={() => handleSaveItemDesc(item.id)}
                                    onKeyDown={(e) => {
                                      e.stopPropagation();
                                      if (e.key === 'Enter') handleSaveItemDesc(item.id);
                                      if (e.key === 'Escape') setEditingItemDescId(null);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onDoubleClick={(e) => e.stopPropagation()}
                                    autoFocus
                                    className="text-[11px] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-1 py-0.2 rounded border border-[#DF9C56] focus:outline-none w-full mt-0.5"
                                  />
                                ) : (
                                  <div 
                                    onDoubleClick={(e) => {
                                      e.stopPropagation();
                                      setEditingItemDescId(item.id);
                                      setItemDraftDesc(item.description);
                                    }}
                                    className="text-[11px] text-[#709654] dark:text-[#AFD1C2]/80 truncate cursor-text hover:underline decoration-dashed"
                                    title="Double click to edit description"
                                  >
                                    {item.description}
                                  </div>
                                )}

                                <div className="flex items-center gap-1.5 mt-1 text-[10px]">
                                  {editingItemCatId === item.id ? (
                                    <input
                                      type="text"
                                      value={itemDraftCat}
                                      onChange={(e) => setItemDraftCat(e.target.value)}
                                      onBlur={() => handleSaveItemCategory(item.id)}
                                      onKeyDown={(e) => {
                                        e.stopPropagation();
                                        if (e.key === 'Enter') handleSaveItemCategory(item.id);
                                        if (e.key === 'Escape') setEditingItemCatId(null);
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      onMouseDown={(e) => e.stopPropagation()}
                                      onDoubleClick={(e) => e.stopPropagation()}
                                      autoFocus
                                      className="text-[10px] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-1 py-0.2 rounded border border-[#DF9C56] focus:outline-none w-20"
                                    />
                                  ) : (
                                    <span 
                                      onDoubleClick={(e) => {
                                        e.stopPropagation();
                                        setEditingItemCatId(item.id);
                                        setItemDraftCat(item.category);
                                      }}
                                      className={`font-semibold cursor-text hover:underline decoration-dashed ${theme.badge}`}
                                      title="Double click to edit category"
                                    >
                                      {item.category}
                                    </span>
                                  )}
                                  {isOnActiveCanvas && (
                                    <span 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAttemptDeleteItem(item);
                                      }}
                                      style={{ fontSize: '14px' }}
                                      className="text-[14px] font-bold px-1.5 py-0.2 rounded-full bg-[#709654]/20 hover:bg-[#DB3A31]/20 text-[#3B5D37] hover:text-[#DB3A31] dark:text-[#AFD1C2] dark:hover:text-[#F87171] cursor-pointer transition-colors active:scale-95 shadow-2xs"
                                      title="Item is active on canvas (Click to manage permission or delete from all canvas)"
                                    >
                                      ON
                                    </span>
                                  )}
                                  {item.tags.length > 0 && (
                                    <>
                                      <span className="text-[#709654]">·</span>
                                      <span className="text-[#709654] dark:text-[#AFD1C2]/60 truncate">#{item.tags[0]}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Item Action buttons */}
                            <div className="flex items-center gap-1 shrink-0 ml-2">
                              <button
                                onClick={() => onAddToCanvas(item)}
                                className={`opacity-0 group-hover/item:opacity-100 px-2.5 py-1 text-[10px] font-bold rounded-md transition-all whitespace-nowrap shadow-xs ${theme.addBtn}`}
                                title="Place on active canvas"
                              >
                                + Add
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAttemptDeleteItem(item);
                                }}
                                className="opacity-0 group-hover/item:opacity-100 p-1 text-[#DB3A31] hover:text-[#871201] hover:bg-[#DB3A31]/15 rounded transition-all"
                                title={isOnActiveCanvas ? "Item is on canvas - Click to request permission to delete across all canvas" : "Delete item from organizer"}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    )}

      {/* Footer Info / Drag helper (with Master Clear and Reset Defaults buttons) */}
      <div className="p-2.5 border-t border-[#709654]/25 dark:border-[#3B5D37]/60 bg-[#EEDFD8]/60 dark:bg-[#122214] text-[11px] text-[#709654] dark:text-[#AFD1C2]/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          {/* Master Clear Button */}
          <button
            onClick={handleOpenMasterClearModal}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-[#DB3A31] hover:text-white bg-[#DB3A31]/10 hover:bg-[#DB3A31] border border-[#DB3A31]/40 rounded-lg transition-all active:scale-95 shadow-xs cursor-pointer shrink-0"
            title="Master Clear: Clear all items and category div types"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Master Clear</span>
          </button>

          {(items.length === 0 || categories.length === 0) && (
            <button
              onClick={handleRestoreDefaults}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-[#3B5D37] dark:text-[#AFD1C2] hover:bg-[#3B5D37]/15 border border-[#3B5D37]/50 rounded-lg transition-all active:scale-95 cursor-pointer shrink-0"
              title="Restore initial default categories and items"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>
          )}

          <span className="hidden sm:inline truncate">
            {isFullScreen && fullScreenMode === 'cards-stack' ? 'Cards Stack view' : 'Drag item or click + Add'}
          </span>
          {isFullScreen && (
            <span className="hidden sm:inline text-[10px] text-[#709654] font-mono px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5">
              [Esc] exit
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isFullScreen && (
            <button
              onClick={() => setIsFullScreen(false)}
              className="text-xs px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 hover:bg-black/10 text-[#1F3E22] dark:text-[#F8EBE8] font-semibold transition-colors cursor-pointer"
            >
              Exit Full Screen
            </button>
          )}
          <button
            onClick={() => setAddCatModalOpen(true)}
            className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-[#3B5D37] dark:text-[#AFD1C2] hover:bg-[#3B5D37]/15 border border-[#3B5D37]/50 rounded-lg transition-all active:scale-95 cursor-pointer whitespace-nowrap"
            title={`Add Category #${categories.length + 1}`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Category</span>
          </button>
          <button
            onClick={() => onOpenNewItemModal()}
            style={{ fontSize: '14px' }}
            className="text-[#871201] dark:text-[#DF9C56] hover:underline font-bold cursor-pointer whitespace-nowrap"
          >
            + Custom Item
          </button>
        </div>
      </div>

      {/* Confirmation Modal Overlay */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#F8EBE8] dark:bg-[#1A331C] border-2 border-[#DB3A31] rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4 select-none">
            <div className="flex items-center gap-2.5 text-[#DB3A31]">
              <div className="p-2 rounded-xl bg-[#DB3A31]/15 text-[#DB3A31]">
                <Trash2 className="w-5 h-5 shrink-0" />
              </div>
              <h3 className="font-bold text-sm text-[#1F3E22] dark:text-[#F8EBE8]">
                {confirmModal.title}
              </h3>
            </div>
            <p className="text-xs text-[#709654] dark:text-[#AFD1C2] leading-relaxed">
              {confirmModal.message}
            </p>

            {confirmModal.mode === 'master-clear' ? (
              <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-3 border-t border-[#709654]/20">
                <button
                  onClick={() => setConfirmModal({ isOpen: false, mode: null, title: '', message: '' })}
                  className="w-full sm:w-auto px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 text-[#1F3E22] dark:text-[#F8EBE8] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmClearItemsOnly}
                  className="w-full sm:w-auto px-3.5 py-1.5 text-xs font-bold rounded-xl border border-[#DB3A31]/50 text-[#DB3A31] hover:bg-[#DB3A31]/10 transition-colors cursor-pointer"
                  title="Clear all items but keep category window heads"
                >
                  Clear Items Only
                </button>
                <button
                  onClick={handleConfirmMasterClear}
                  className="w-full sm:w-auto px-4 py-1.5 text-xs font-bold rounded-xl bg-[#DB3A31] hover:bg-[#871201] text-white shadow-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  title="Clear all items AND delete all category div types"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Master Clear Everything</span>
                </button>
              </div>
            ) : confirmModal.mode === 'delete-category' ? (
              <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-3 border-t border-[#709654]/20">
                <button
                  onClick={() => setConfirmModal({ isOpen: false, mode: null, title: '', message: '' })}
                  className="w-full sm:w-auto px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 text-[#1F3E22] dark:text-[#F8EBE8] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                {confirmModal.itemCount && confirmModal.itemCount > 0 ? (
                  <button
                    onClick={() => {
                      if (confirmModal.categoryKey && onClearCategoryItems) {
                        onClearCategoryItems(confirmModal.categoryKey as ItemType);
                      }
                      setConfirmModal({ isOpen: false, mode: null, title: '', message: '' });
                    }}
                    className="w-full sm:w-auto px-3.5 py-1.5 text-xs font-bold rounded-xl border border-[#DB3A31]/50 text-[#DB3A31] hover:bg-[#DB3A31]/10 transition-colors cursor-pointer"
                  >
                    Clear Items Only
                  </button>
                ) : null}
                {confirmModal.categoryKey !== 'default' && categories.length > 1 ? (
                  <button
                    onClick={() => {
                      if (confirmModal.categoryKey) {
                        handleDeleteCategory(confirmModal.categoryKey);
                      }
                      setConfirmModal({ isOpen: false, mode: null, title: '', message: '' });
                    }}
                    className="w-full sm:w-auto px-4 py-1.5 text-xs font-bold rounded-xl bg-[#DB3A31] hover:bg-[#871201] text-white shadow-xs transition-colors cursor-pointer"
                  >
                    Delete Category Section
                  </button>
                ) : (
                  <span className="text-[10px] text-[#709654] dark:text-[#AFD1C2] font-semibold italic px-2">
                    (Default Category is protected; items can be deleted)
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#709654]/20">
                <button
                  onClick={() => setConfirmModal({ isOpen: false, mode: null, title: '', message: '' })}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 text-[#1F3E22] dark:text-[#F8EBE8] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmMasterClear}
                  className="px-4 py-1.5 text-xs font-bold rounded-xl bg-[#DB3A31] hover:bg-[#871201] text-white shadow-xs transition-colors cursor-pointer"
                >
                  Confirm
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Category Modal (for 5th, 6th, 7th... category) */}
      {addCatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div 
            className="bg-[#F8EBE8] dark:bg-[#1A331C] border border-[#709654]/40 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#709654]/20 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#3B5D37] text-white">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-[#1F3E22] dark:text-[#F8EBE8]">
                  Add Category #{categories.length + 1}
                </h3>
              </div>
              <button
                onClick={() => setAddCatModalOpen(false)}
                className="p-1 text-[#709654] hover:text-[#1F3E22] dark:hover:text-[#F8EBE8] rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-3.5 text-xs">
              <div>
                <label className="text-[11px] font-bold text-[#1F3E22] dark:text-[#F8EBE8] block mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Microservices, Pipelines, Vault"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-[#152717] border border-[#709654]/40 rounded-lg text-[#1F3E22] dark:text-[#F8EBE8] focus:outline-none focus:border-[#3B5D37]"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#1F3E22] dark:text-[#F8EBE8] block mb-1">
                  Signature Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newCatColor}
                    onChange={(e) => setNewCatColor(e.target.value)}
                    className="w-9 h-9 p-0.5 rounded-lg border border-[#709654]/40 cursor-pointer bg-white"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {['#2563EB', '#9333EA', '#0D9488', '#E11D48', '#D97706', '#4F46E5', '#059669', '#DC2626'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewCatColor(c)}
                        style={{ backgroundColor: c }}
                        className={`w-5 h-5 rounded-md transition-transform ${newCatColor === c ? 'scale-120 ring-2 ring-offset-1 ring-black/40' : 'hover:scale-110'}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#1F3E22] dark:text-[#F8EBE8] block mb-1">
                  Category Icon
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { name: 'GitBranch', icon: <GitBranch className="w-3.5 h-3.5" /> },
                    { name: 'Code2', icon: <Code2 className="w-3.5 h-3.5" /> },
                    { name: 'Network', icon: <Network className="w-3.5 h-3.5" /> },
                    { name: 'ShieldCheck', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
                    { name: 'Zap', icon: <Zap className="w-3.5 h-3.5" /> },
                    { name: 'Database', icon: <Database className="w-3.5 h-3.5" /> },
                    { name: 'Package', icon: <Package className="w-3.5 h-3.5" /> },
                    { name: 'Layers', icon: <Layers className="w-3.5 h-3.5" /> },
                  ].map((ic) => (
                    <button
                      key={ic.name}
                      type="button"
                      onClick={() => setNewCatIcon(ic.name)}
                      className={`flex items-center justify-center p-2 rounded-lg border transition-all ${
                        newCatIcon === ic.name
                          ? 'border-[#3B5D37] bg-[#3B5D37] text-white shadow-xs'
                          : 'border-[#709654]/30 bg-white/60 dark:bg-black/20 text-[#1F3E22] dark:text-[#F8EBE8] hover:bg-white'
                      }`}
                    >
                      {ic.icon}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#709654]/20">
                <button
                  type="button"
                  onClick={() => setAddCatModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 text-[#1F3E22] dark:text-[#F8EBE8] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold rounded-xl bg-[#3B5D37] hover:bg-[#1F3E22] text-white shadow-xs transition-colors"
                >
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Canvas Item Delete Permission Modal */}
      {canvasDeletePermissionItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div 
            className="bg-[#F8EBE8] dark:bg-[#152717] border-2 border-[#DB3A31]/50 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 select-none animate-in zoom-in-95 duration-150 text-[#1F3E22] dark:text-[#F8EBE8]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-[#709654]/20 pb-3">
              <div className="w-10 h-10 rounded-xl bg-[#DB3A31]/15 text-[#DB3A31] flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-extrabold text-sm text-[#1F3E22] dark:text-[#F8EBE8]">
                  Permission Required to Delete
                </h3>
                <p className="text-[11px] text-[#709654] dark:text-[#AFD1C2]/80">
                  This item is currently active in the canvas
                </p>
              </div>
              <button
                onClick={() => setCanvasDeletePermissionItem(null)}
                className="p-1 text-[#709654] hover:text-[#1F3E22] dark:hover:text-[#F8EBE8] rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target Item Summary */}
            <div className="bg-white/80 dark:bg-black/20 border border-[#709654]/30 rounded-xl p-3.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#DF9C56]/20 text-[#871201] dark:text-[#DF9C56] border border-[#DF9C56]/40">
                  {cleanSerialNumber(canvasDeletePermissionItem.serialNumber)}
                </span>
                <span 
                  style={{ fontSize: '14px' }}
                  className="text-[14px] font-bold px-2 py-0.5 rounded-full bg-[#709654]/20 text-[#3B5D37] dark:text-[#AFD1C2]"
                >
                  ON
                </span>
              </div>
              <div className="font-bold text-xs text-[#1F3E22] dark:text-[#F8EBE8] truncate">
                {canvasDeletePermissionItem.name}
              </div>
              <div className="text-[11px] text-[#709654] dark:text-[#AFD1C2]/80 line-clamp-2">
                {canvasDeletePermissionItem.description}
              </div>
            </div>

            {/* Description & Confirmation Query */}
            <p className="text-xs text-[#1F3E22]/90 dark:text-[#F8EBE8]/90 leading-relaxed">
              Because the <strong>( ON )</strong> indicator is enabled, this item cannot be deleted directly while it remains on the canvas.
              <br /><br />
              Do you grant permission to delete <strong>"{canvasDeletePermissionItem.name}"</strong> from across all canvas boards, and remove it from your organizer?
            </p>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#709654]/20">
              <button
                type="button"
                onClick={() => setCanvasDeletePermissionItem(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 text-[#1F3E22] dark:text-[#F8EBE8] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const idToDelete = canvasDeletePermissionItem.id;
                  setCanvasDeletePermissionItem(null);
                  if (onDeleteItemFromAllCanvases) {
                    onDeleteItemFromAllCanvases(idToDelete);
                  } else {
                    onDeleteItem?.(idToDelete);
                  }
                }}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-[#DB3A31] hover:bg-[#871201] text-white shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete from Across All Canvas</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
