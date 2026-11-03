import React, { useState, useEffect } from 'react';
import { OrganizerItem, ItemType } from '../types/orchestrator';
import { getNextSerialNumber } from '../utils/serialUtils';
import { 
  X, 
  Wrench, 
  AppWindow, 
  FolderGit2, 
  Database,
  Plus,
  GitBranch,
  Code2,
  Network,
  ShieldCheck,
  Zap,
  Package
} from 'lucide-react';

interface CategoryOption {
  key: string;
  label: string;
  color: string;
  iconName: string;
}

const DEFAULT_CATEGORY_OPTIONS: CategoryOption[] = [
  { key: 'default', label: 'Default Category', color: '#3B5D37', iconName: 'Package' },
  { key: 'tool', label: 'Tool', color: '#DF9C56', iconName: 'Wrench' },
  { key: 'app', label: 'App', color: '#C61B31', iconName: 'AppWindow' },
  { key: 'project', label: 'Project', color: '#DB3A31', iconName: 'FolderGit2' },
  { key: 'resource', label: 'Resource', color: '#3B5D37', iconName: 'Database' },
  { key: 'pipeline', label: 'Pipeline', color: '#2563EB', iconName: 'GitBranch' },
  { key: 'script', label: 'Script', color: '#9333EA', iconName: 'Code2' },
  { key: 'api', label: 'API Gateway', color: '#0D9488', iconName: 'Network' },
];

interface NewItemModalProps {
  isOpen: boolean;
  defaultType?: ItemType;
  existingItems?: OrganizerItem[];
  onClose: () => void;
  onAddItem: (item: OrganizerItem) => void;
  onAddCategory?: (category: { key: string; title: string; color: string; iconName: string }) => void;
}

export const NewItemModal: React.FC<NewItemModalProps> = ({
  isOpen,
  defaultType = 'tool',
  existingItems = [],
  onClose,
  onAddItem,
  onAddCategory,
}) => {
  const [type, setType] = useState<ItemType>(defaultType || 'default');
  const [serialNumber, setSerialNumber] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [command, setCommand] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [environment, setEnvironment] = useState<'production' | 'staging' | 'development' | 'local'>('development');
  const [tagsInput, setTagsInput] = useState('');

  // Dynamic Categories list synced with current storage & sidebar titles
  const [categoriesList, setCategoriesList] = useState<CategoryOption[]>([]);

  // Function to read latest category definitions and customized titles from localStorage
  const syncCategoriesWithCurrentData = React.useCallback(() => {
    try {
      const savedCats = localStorage.getItem('mo_registered_categories_v2');
      const savedTitlesStr = localStorage.getItem('mo_category_titles');
      let savedTitles: Record<string, string> = {};
      if (savedTitlesStr) {
        try { savedTitles = JSON.parse(savedTitlesStr); } catch (e) { console.error(e); }
      }

      let loadedCats: CategoryOption[] = [];

      if (savedCats !== null) {
        const parsed = JSON.parse(savedCats);
        if (Array.isArray(parsed) && parsed.length > 0) {
          loadedCats = parsed.map((p: any) => ({
            key: p.key,
            label: savedTitles[p.key] || p.title || p.label || p.key,
            color: p.color || '#709654',
            iconName: p.iconName || 'Package',
          }));
        }
      }

      // If no categories exist, auto-create the Default Category as Serial Number 1!
      if (loadedCats.length === 0) {
        const defaultCatOption: CategoryOption = {
          key: 'default',
          label: 'Default Category',
          color: '#3B5D37',
          iconName: 'Package',
        };
        loadedCats = [defaultCatOption];
        try {
          localStorage.setItem('mo_registered_categories_v2', JSON.stringify([
            { key: 'default', title: 'Default Category', color: '#3B5D37', iconName: 'Package' }
          ]));
          const catSerialsStr = localStorage.getItem('mo_category_serials');
          const catSerials = catSerialsStr ? JSON.parse(catSerialsStr) : {};
          catSerials['default'] = '1';
          localStorage.setItem('mo_category_serials', JSON.stringify(catSerials));
          window.dispatchEvent(new CustomEvent('mo_categories_updated'));
        } catch (err) {
          console.error(err);
        }
        setTimeout(() => {
          onAddCategory?.({ key: 'default', title: 'Default Category', color: '#3B5D37', iconName: 'Package' });
        }, 0);
      }

      setCategoriesList(loadedCats);

      // Determine matching category based on defaultType or first loaded category
      const matched = defaultType ? loadedCats.find((c) => c.key === defaultType) : null;
      const targetCat = matched || loadedCats[0];
      setType(targetCat.key as ItemType);
      setCategory(targetCat.label);
    } catch (e) {
      console.error(e);
      setCategoriesList(DEFAULT_CATEGORY_OPTIONS);
      setType(DEFAULT_CATEGORY_OPTIONS[0].key as ItemType);
      setCategory(DEFAULT_CATEGORY_OPTIONS[0].label);
    }
  }, [defaultType, onAddCategory]);

  const handleClose = () => {
    setSerialNumber('');
    setName('');
    setDescription('');
    setCommand('');
    setEndpoint('');
    setTagsInput('');
    setShowInlineAddCat(false);
    setNewCatLabel('');
    onClose();
  };

  // Synchronize categories and serial number when modal opens
  useEffect(() => {
    if (isOpen) {
      // 1. Calculate and set serial number: If no items in list, start at 1!
      const nextSN = existingItems && existingItems.length > 0
        ? getNextSerialNumber(existingItems)
        : '1';
      setSerialNumber(nextSN);

      // 2. Clear previous inputs
      setName('');
      setDescription('');
      setCommand('');
      setEndpoint('');
      setTagsInput('');
      setShowInlineAddCat(false);
      setNewCatLabel('');

      // 3. Sync categories asynchronously after mount/render to avoid updating parent during render phase
      const timer = setTimeout(() => {
        syncCategoriesWithCurrentData();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, syncCategoriesWithCurrentData, existingItems]);

  useEffect(() => {
    const handleUpdate = () => {
      setTimeout(() => {
        syncCategoriesWithCurrentData();
      }, 0);
    };
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('mo_categories_updated', handleUpdate);
    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('mo_categories_updated', handleUpdate);
    };
  }, [syncCategoriesWithCurrentData]);

  // Inline Quick Add Category state
  const [showInlineAddCat, setShowInlineAddCat] = useState(false);
  const [newCatLabel, setNewCatLabel] = useState('');
  const [newCatColor, setNewCatColor] = useState('#2563EB');

  if (!isOpen) return null;

  const renderIcon = (iconName: string, color: string) => {
    switch (iconName) {
      case 'Wrench': return <Wrench className="w-3.5 h-3.5" style={{ color }} />;
      case 'AppWindow': return <AppWindow className="w-3.5 h-3.5" style={{ color }} />;
      case 'FolderGit2': return <FolderGit2 className="w-3.5 h-3.5" style={{ color }} />;
      case 'Database': return <Database className="w-3.5 h-3.5" style={{ color }} />;
      case 'GitBranch': return <GitBranch className="w-3.5 h-3.5" style={{ color }} />;
      case 'Code2': return <Code2 className="w-3.5 h-3.5" style={{ color }} />;
      case 'Network': return <Network className="w-3.5 h-3.5" style={{ color }} />;
      case 'ShieldCheck': return <ShieldCheck className="w-3.5 h-3.5" style={{ color }} />;
      case 'Zap': return <Zap className="w-3.5 h-3.5" style={{ color }} />;
      default: return <Package className="w-3.5 h-3.5" style={{ color }} />;
    }
  };

  const handleCreateInlineCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatLabel.trim()) return;
    const catKey = newCatLabel.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
    const newOption: CategoryOption = {
      key: catKey,
      label: newCatLabel.trim(),
      color: newCatColor,
      iconName: 'Package',
    };
    const updated = [...categoriesList, newOption];
    setCategoriesList(updated);
    try {
      localStorage.setItem('mo_registered_categories_v2', JSON.stringify(
        updated.map((u) => ({ key: u.key, title: u.label, color: u.color, iconName: u.iconName }))
      ));
      window.dispatchEvent(new CustomEvent('mo_categories_updated'));
    } catch (err) {
      console.error(err);
    }
    onAddCategory?.({ key: catKey, title: newCatLabel.trim(), color: newCatColor, iconName: 'Package' });
    setType(catKey as ItemType);
    setCategory(newCatLabel.trim());
    setShowInlineAddCat(false);
    setNewCatLabel('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    let icon = 'Package';
    if (type === 'app') icon = 'Network';
    else if (type === 'project') icon = 'FolderGit2';
    else if (type === 'resource') icon = 'Database';
    else if (type === 'tool') icon = 'Wrench';
    else if (type === 'pipeline') icon = 'GitBranch';
    else if (type === 'script') icon = 'Code2';
    else if (type === 'api') icon = 'Network';
    else if (type === 'default') icon = 'Package';
    else {
      const matchCat = categoriesList.find((c) => c.key === type);
      if (matchCat) icon = matchCat.iconName || 'Package';
    }

    const assignedSN = serialNumber.trim() || (existingItems.length > 0 ? getNextSerialNumber(existingItems) : '1');
    const selectedOption = categoriesList.find((c) => c.key === type);
    const resolvedCategory = category.trim() || selectedOption?.label || 'Default Category';

    const newItem: OrganizerItem = {
      id: `${type}-${Date.now()}`,
      serialNumber: assignedSN,
      name: name.trim(),
      type,
      category: resolvedCategory,
      description: description.trim() || 'Custom registered component',
      status: 'idle',
      icon,
      command: (type === 'tool' || type === 'pipeline' || type === 'script') ? command.trim() : undefined,
      endpoint: (type === 'app' || type === 'resource' || type === 'api') ? endpoint.trim() : undefined,
      environment,
      tags: tags.length > 0 ? tags : ['custom', type],
    };

    onAddItem(newItem);
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1F3E22]/60 backdrop-blur-xs select-none">
      <div 
        className="w-full max-w-lg bg-[#F8EBE8] dark:bg-[#182E1A] rounded-2xl border border-[#AFD1C2]/60 dark:border-[#3B5D37] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[#AFD1C2]/50 dark:border-[#3B5D37] flex items-center justify-between bg-[#F8EBE8]/90 dark:bg-[#1F3E22]/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#3B5D37]/15 dark:bg-[#3B5D37]/40 text-[#1F3E22] dark:text-[#AFD1C2]">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1F3E22] dark:text-[#F8EBE8]">
                Register New Organizer Item
              </h3>
              <p className="text-[11px] text-[#709654] dark:text-[#AFD1C2]/70">
                Add to tools, apps, projects, resources, pipelines, scripts, APIs or next categories
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-[#709654] hover:text-[#1F3E22] dark:hover:text-[#F8EBE8] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
          {/* Type Selector (Supports 1st to 7th+ Categories) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-semibold text-[#1F3E22] dark:text-[#F8EBE8]">
                Item Category ({categoriesList.length} Categories Available)
              </label>
              <button
                type="button"
                onClick={() => setShowInlineAddCat(!showInlineAddCat)}
                className="text-[10px] text-[#709654] hover:text-[#1F3E22] dark:hover:text-[#AFD1C2] font-bold flex items-center gap-1 hover:underline"
              >
                <Plus className="w-3 h-3" />
                <span>Add Next Category (#{categoriesList.length + 1})</span>
              </button>
            </div>

            {/* Inline Quick Add Category Form */}
            {showInlineAddCat && (
              <div className="p-3 mb-2.5 bg-white/70 dark:bg-black/30 rounded-xl border border-[#709654]/40 flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  placeholder="Category Name (e.g. Microservices)"
                  value={newCatLabel}
                  onChange={(e) => setNewCatLabel(e.target.value)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-[#709654]/50 bg-white dark:bg-[#152717] text-[#1F3E22] dark:text-[#F8EBE8] flex-1 min-w-[140px]"
                />
                <input
                  type="color"
                  value={newCatColor}
                  onChange={(e) => setNewCatColor(e.target.value)}
                  className="w-7 h-7 p-0.5 rounded-lg border border-slate-300 cursor-pointer"
                  title="Choose Category Color"
                />
                <button
                  type="button"
                  onClick={handleCreateInlineCategory}
                  className="px-3 py-1 bg-[#3B5D37] text-white rounded-lg font-bold text-xs hover:bg-[#1F3E22]"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowInlineAddCat(false)}
                  className="px-2 py-1 text-[#709654] hover:text-[#1F3E22] text-xs"
                >
                  Cancel
                </button>
              </div>
            )}

            <div className="grid grid-cols-4 gap-2">
              {categoriesList.map((t, idx) => (
                <button
                  type="button"
                  key={t.key}
                  onClick={() => {
                    setType(t.key as ItemType);
                    setCategory(t.label);
                  }}
                  style={{
                    borderColor: type === t.key ? t.color : undefined,
                  }}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                    type === t.key
                      ? 'bg-white/90 dark:bg-[#1F3E22] font-semibold shadow-xs ring-1'
                      : 'border-[#AFD1C2]/60 dark:border-[#3B5D37]/60 text-[#1F3E22]/70 dark:text-[#AFD1C2] hover:bg-white/40 dark:hover:bg-[#1F3E22]/50'
                  }`}
                  title={`${t.label} (#${idx + 1})`}
                >
                  {renderIcon(t.iconName, t.color)}
                  <span className="text-[10px] truncate max-w-full font-bold" style={{ color: type === t.key ? t.color : undefined }}>
                    {t.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Serial Number, Name & Category */}
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="text-[11px] font-semibold text-[#1F3E22] dark:text-[#F8EBE8] block mb-1">
                Serial Number (S/N)
              </label>
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="e.g. 1"
                title="Continuous serial number based on current items"
                className="w-full px-2.5 py-2 bg-white dark:bg-[#152717] border border-[#AFD1C2] dark:border-[#3B5D37] rounded-lg text-[#1F3E22] dark:text-[#F8EBE8] focus:outline-none focus:border-[#3B5D37] font-mono text-[11px] font-bold"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[#1F3E22] dark:text-[#F8EBE8] block mb-1">
                Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Redis Cache Cluster"
                className="w-full px-3 py-2 bg-white dark:bg-[#152717] border border-[#AFD1C2] dark:border-[#3B5D37] rounded-lg text-[#1F3E22] dark:text-[#F8EBE8] focus:outline-none focus:border-[#3B5D37] dark:focus:border-[#AFD1C2]"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[#1F3E22] dark:text-[#F8EBE8] block mb-1">
                Tree Group Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Data Stores, Testing"
                className="w-full px-3 py-2 bg-white dark:bg-[#152717] border border-[#AFD1C2] dark:border-[#3B5D37] rounded-lg text-[#1F3E22] dark:text-[#F8EBE8] focus:outline-none focus:border-[#3B5D37] dark:focus:border-[#AFD1C2]"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-[11px] font-semibold text-[#1F3E22] dark:text-[#F8EBE8] block mb-1">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Operational role and purpose..."
              className="w-full px-3 py-2 bg-white dark:bg-[#152717] border border-[#AFD1C2] dark:border-[#3B5D37] rounded-lg text-[#1F3E22] dark:text-[#F8EBE8] focus:outline-none focus:border-[#3B5D37] dark:focus:border-[#AFD1C2]"
            />
          </div>

          {/* Command if Tool */}
          {type === 'tool' && (
            <div>
              <label className="text-[11px] font-semibold text-[#1F3E22] dark:text-[#F8EBE8] block mb-1">
                Command Line Script
              </label>
              <input
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="e.g. npm run test:unit"
                className="w-full px-3 py-2 bg-[#1F3E22] text-[#AFD1C2] font-mono text-[11px] border border-[#3B5D37] rounded-lg focus:outline-none focus:border-[#DF9C56]"
              />
            </div>
          )}

          {/* Endpoint if App or Resource */}
          {(type === 'app' || type === 'resource') && (
            <div>
              <label className="text-[11px] font-semibold text-[#1F3E22] dark:text-[#F8EBE8] block mb-1">
                Target Endpoint or URI
              </label>
              <input
                type="text"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="e.g. https://api.internal or postgres://..."
                className="w-full px-3 py-2 bg-white dark:bg-[#152717] font-mono text-[11px] border border-[#AFD1C2] dark:border-[#3B5D37] rounded-lg text-[#1F3E22] dark:text-[#F8EBE8] focus:outline-none focus:border-[#3B5D37] dark:focus:border-[#AFD1C2]"
              />
            </div>
          )}

          {/* Environment & Tags */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-[#1F3E22] dark:text-[#F8EBE8] block mb-1">
                Environment
              </label>
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value as any)}
                className="w-full px-3 py-2 bg-white dark:bg-[#152717] border border-[#AFD1C2] dark:border-[#3B5D37] rounded-lg text-[#1F3E22] dark:text-[#F8EBE8] focus:outline-none focus:border-[#3B5D37]"
              >
                <option value="production">Production</option>
                <option value="staging">Staging</option>
                <option value="development">Development</option>
                <option value="local">Local</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[#1F3E22] dark:text-[#F8EBE8] block mb-1">
                Tags (comma separated)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="core, infra, v2"
                className="w-full px-3 py-2 bg-white dark:bg-[#152717] border border-[#AFD1C2] dark:border-[#3B5D37] rounded-lg text-[#1F3E22] dark:text-[#F8EBE8] focus:outline-none focus:border-[#3B5D37] dark:focus:border-[#AFD1C2]"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-[#AFD1C2]/50 dark:border-[#3B5D37] flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-3.5 py-1.5 text-xs text-[#709654] hover:text-[#1F3E22] dark:text-[#AFD1C2] dark:hover:text-[#F8EBE8] rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-[#F8EBE8] bg-[#3B5D37] hover:bg-[#1F3E22] rounded-lg transition-colors shadow-xs"
            >
              Register Item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
