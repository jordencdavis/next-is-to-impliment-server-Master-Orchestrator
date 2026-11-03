import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  CanvasBoard, 
  CanvasNode, 
  Connector, 
  OrganizerItem, 
  ItemType, 
  ExecutionLog, 
  NodeStatus,
  SavedProject
} from './types/orchestrator';
import { INITIAL_ORGANIZER_ITEMS, INITIAL_BOARDS } from './data/initialData';
import { 
  ensureItemSerialNumbers, 
  ensureNodeSerialNumbers, 
  compareSerialNumbers, 
  getNextSerialNumber,
  generateCanvasNodeSerialNumber,
  getNextBoardNodeSerialNumber,
  deduplicateBoardNodeSerialNumbers
} from './utils/serialUtils';
import { Header } from './components/Header';
import { OrganizerSidebar } from './components/OrganizerSidebar';
import { CanvasWorkspace } from './components/CanvasWorkspace';
import { OverheadActionBar } from './components/OverheadActionBar';
import { NodeInspectorModal } from './components/NodeInspectorModal';
import { ExecutionConsoleDrawer } from './components/ExecutionConsoleDrawer';
import { NewItemModal } from './components/NewItemModal';
import { BoardModal } from './components/BoardModal';
import { NewProjectModal } from './components/NewProjectModal';
import { SavedProjectsModal } from './components/SavedProjectsModal';
import { SaveBeforeLoadModal } from './components/SaveBeforeLoadModal';
import { GithubSyncModal } from './components/GithubSyncModal';
import { saveProjectToComputer } from './utils/fileSystemUtils';

const ensureUniqueNodeIds = (nodes: CanvasNode[]): CanvasNode[] => {
  const seen = new Set<string>();
  return nodes.map((node, idx) => {
    let id = node.id || `node-${Date.now()}-${idx}`;
    if (seen.has(id)) {
      id = `${id}-dup-${idx}-${Math.random().toString(36).substring(2, 7)}`;
    }
    seen.add(id);
    return { ...node, id };
  });
};

function deduplicateSavedProjects(projects: SavedProject[]): SavedProject[] {
  const map = new Map<string, SavedProject>();
  for (const p of projects) {
    const key = (p.name || '').trim().toLowerCase();
    if (!key) continue;
    if (!map.has(key)) {
      map.set(key, p);
    } else {
      const existing = map.get(key)!;
      const existingTime = new Date(existing.createdAt || 0).getTime();
      const pTime = new Date(p.createdAt || 0).getTime();
      const existingNodes = existing.boards?.reduce((sum, b) => sum + (b.nodes?.length || 0), 0) || 0;
      const pNodes = p.boards?.reduce((sum, b) => sum + (b.nodes?.length || 0), 0) || 0;
      if (pTime > existingTime || (pTime === existingTime && pNodes >= existingNodes)) {
        map.set(key, p);
      }
    }
  }
  return Array.from(map.values());
}

export default function App() {
  // Theme state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Boards state (Area D)
  const [boards, setBoards] = useState<CanvasBoard[]>(() => {
    try {
      const resetDone = localStorage.getItem('mo_workspace_cleared_defaults_v6');
      if (!resetDone) {
        localStorage.setItem('mo_workspace_cleared_defaults_v6', 'true');
        const normalized = INITIAL_BOARDS.map((b, bIdx) => ({
          ...b,
          nodes: deduplicateBoardNodeSerialNumbers(ensureUniqueNodeIds(ensureNodeSerialNumbers(b.nodes, [], bIdx)), bIdx),
        }));
        localStorage.setItem('mo_workspace_boards', JSON.stringify(normalized));
        return normalized;
      }
      const saved = localStorage.getItem('mo_workspace_boards');
      if (saved) {
        const parsed: CanvasBoard[] = JSON.parse(saved);
        if (parsed.length > 0) {
          return parsed.map((b, bIdx) => ({
            ...b,
            nodes: deduplicateBoardNodeSerialNumbers(ensureUniqueNodeIds(ensureNodeSerialNumbers(b.nodes || [], [], bIdx)), bIdx),
          }));
        }
      }
    } catch (e) {
      console.error('Failed to load saved boards', e);
    }
    return INITIAL_BOARDS.map((b, bIdx) => ({
      ...b,
      nodes: deduplicateBoardNodeSerialNumbers(ensureUniqueNodeIds(ensureNodeSerialNumbers(b.nodes, [], bIdx)), bIdx),
    }));
  });

  const [activeBoardId, setActiveBoardId] = useState<string>(() => {
    return boards[0]?.id || INITIAL_BOARDS[0].id;
  });

  // Organizer Items state (Area A)
  const [organizerItems, setOrganizerItems] = useState<OrganizerItem[]>(() => {
    try {
      const saved = localStorage.getItem('mo_organizer_items');
      if (saved !== null) {
        const parsed: OrganizerItem[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          if (parsed.length > 0) {
            const hasExtended = parsed.some((i) => ['pipeline', 'script', 'api'].includes(i.type));
            if (!hasExtended) {
              const extendedInitial = INITIAL_ORGANIZER_ITEMS.filter((i) =>
                ['pipeline', 'script', 'api'].includes(i.type)
              );
              const merged = ensureItemSerialNumbers([...parsed, ...extendedInitial]);
              localStorage.setItem('mo_organizer_items', JSON.stringify(merged));
              return merged;
            }
          }
          return ensureItemSerialNumbers(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to load saved items', e);
    }
    return ensureItemSerialNumbers(INITIAL_ORGANIZER_ITEMS);
  });

  // Selection state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedConnectorId, setSelectedConnectorId] = useState<string | null>(null);
  const [connectingFromNodeId, setConnectingFromNodeId] = useState<string | null>(null);

  // Inspector modal state (Area C "Open" action)
  const [inspectingNode, setInspectingNode] = useState<CanvasNode | null>(null);

  // Modals state
  const [newItemModalOpen, setNewItemModalOpen] = useState(false);
  const [newItemDefaultType, setNewItemDefaultType] = useState<ItemType>('tool');
  const [newBoardModalOpen, setNewBoardModalOpen] = useState(false);
  const [newProjectModalOpen, setNewProjectModalOpen] = useState(false);
  const [projectsManagerModalOpen, setProjectsManagerModalOpen] = useState(false);
  const [saveBeforeLoadModalOpen, setSaveBeforeLoadModalOpen] = useState(false);
  const [githubSyncModalOpen, setGithubSyncModalOpen] = useState(false);
  const [pendingProjectToLoad, setPendingProjectToLoad] = useState<{
    name: string;
    boards: CanvasBoard[];
    organizerItems: OrganizerItem[];
    activeBoardId?: string;
  } | null>(null);

  // Project Workspace State
  const [currentProjectName, setCurrentProjectName] = useState<string>(() => {
    const saved = localStorage.getItem('mo_current_project_name');
    if (!saved || saved.trim() === 'ty') {
      localStorage.setItem('mo_current_project_name', 'Master Orchestrator');
      return 'Master Orchestrator';
    }
    return saved;
  });

  useEffect(() => {
    if (!currentProjectName || currentProjectName.trim() === 'ty') {
      setCurrentProjectName('Master Orchestrator');
    }
  }, [currentProjectName]);

  const [savedProjects, setSavedProjects] = useState<SavedProject[]>(() => {
    try {
      const saved = localStorage.getItem('mo_saved_projects_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const deduped = deduplicateSavedProjects(parsed);
          if (deduped.length !== parsed.length) {
            localStorage.setItem('mo_saved_projects_v1', JSON.stringify(deduped));
          }
          return deduped;
        }
      }
    } catch (e) {
      console.error('Failed to load saved projects', e);
    }
    return [];
  });

  // Automatically clean duplicates when project library modal is opened
  useEffect(() => {
    if (projectsManagerModalOpen) {
      setSavedProjects((prev) => {
        const deduped = deduplicateSavedProjects(prev);
        return deduped.length !== prev.length ? deduped : prev;
      });
    }
  }, [projectsManagerModalOpen]);

  // Execution Console Drawer & Logs state
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);
  const [consoleOpen, setConsoleOpen] = useState(false);

  // Sidebar collapse
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Active Board helper
  const activeBoard = boards.find((b) => b.id === activeBoardId) || boards[0];

  // Save to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem('mo_workspace_boards', JSON.stringify(boards));
    } catch (e) {
      console.error('Failed to persist boards', e);
    }
  }, [boards]);

  useEffect(() => {
    try {
      localStorage.setItem('mo_organizer_items', JSON.stringify(organizerItems));
    } catch (e) {
      console.error('Failed to persist organizer items', e);
    }
  }, [organizerItems]);

  useEffect(() => {
    try {
      localStorage.setItem('mo_current_project_name', currentProjectName);
    } catch (e) {
      console.error('Failed to persist project name', e);
    }
  }, [currentProjectName]);

  useEffect(() => {
    try {
      localStorage.setItem('mo_saved_projects_v1', JSON.stringify(savedProjects));
    } catch (e) {
      console.error('Failed to persist saved projects', e);
    }
  }, [savedProjects]);

  // Update active board utility
  const updateActiveBoard = useCallback(
    (updater: (current: CanvasBoard) => CanvasBoard) => {
      setBoards((prev) =>
        prev.map((b) => (b.id === activeBoardId ? updater(b) : b))
      );
    },
    [activeBoardId]
  );

  const handleChangeCanvasBgColor = useCallback(
    (color: string) => {
      updateActiveBoard((board) => ({
        ...board,
        backgroundColor: color,
      }));
    },
    [updateActiveBoard]
  );

  // Undo / Redo history state for canvas
  const [history, setHistory] = useState<{
    past: { nodes: CanvasNode[]; connectors: Connector[] }[];
    future: { nodes: CanvasNode[]; connectors: Connector[] }[];
  }>({ past: [], future: [] });

  // Reset history on board switch
  useEffect(() => {
    setHistory({ past: [], future: [] });
  }, [activeBoardId]);

  const pushSnapshot = useCallback(() => {
    if (!activeBoard) return;
    setHistory((prev) => ({
      past: [
        ...prev.past.slice(-30),
        {
          nodes: JSON.parse(JSON.stringify(activeBoard.nodes)),
          connectors: JSON.parse(JSON.stringify(activeBoard.connectors)),
        },
      ],
      future: [],
    }));
  }, [activeBoard]);

  const handleUndo = useCallback(() => {
    if (!activeBoard || history.past.length === 0) return;
    const previous = history.past[history.past.length - 1];
    const newPast = history.past.slice(0, -1);
    const currentSnapshot = {
      nodes: JSON.parse(JSON.stringify(activeBoard.nodes)),
      connectors: JSON.parse(JSON.stringify(activeBoard.connectors)),
    };

    setHistory({
      past: newPast,
      future: [currentSnapshot, ...history.future],
    });

    updateActiveBoard((b) => ({
      ...b,
      nodes: previous.nodes,
      connectors: previous.connectors,
    }));
  }, [activeBoard, history, updateActiveBoard]);

  const handleRedo = useCallback(() => {
    if (!activeBoard || history.future.length === 0) return;
    const next = history.future[0];
    const newFuture = history.future.slice(1);
    const currentSnapshot = {
      nodes: JSON.parse(JSON.stringify(activeBoard.nodes)),
      connectors: JSON.parse(JSON.stringify(activeBoard.connectors)),
    };

    setHistory({
      past: [...history.past, currentSnapshot],
      future: newFuture,
    });

    updateActiveBoard((b) => ({
      ...b,
      nodes: next.nodes,
      connectors: next.connectors,
    }));
  }, [activeBoard, history, updateActiveBoard]);

  // Clear Canvas for Active Board or Specific Board
  const handleClearCanvas = useCallback(
    (targetBoardId?: string) => {
      const bId = targetBoardId || activeBoardId;
      pushSnapshot();
      let updatedBoards: CanvasBoard[] = [];
      setBoards((prev) => {
        updatedBoards = prev.map((b) =>
          b.id === bId
            ? { ...b, nodes: [], connectors: [], groups: [] }
            : b
        );
        return updatedBoards;
      });
      setSelectedNodeId(null);
      setSelectedConnectorId(null);
      setInspectingNode(null);

      // Immediately sync with savedProjects so the saved project reflects the cleared canvas
      // and doesn't resurrect cleared data when reloaded
      setSavedProjects((prev) => {
        const curKey = currentProjectName.trim().toLowerCase();
        const existingIdx = prev.findIndex((p) => p.name.trim().toLowerCase() === curKey);
        if (existingIdx >= 0) {
          const next = [...prev];
          next[existingIdx] = {
            ...next[existingIdx],
            boards: next[existingIdx].boards.map((b) =>
              b.id === bId ? { ...b, nodes: [], connectors: [], groups: [] } : b
            ),
            updatedAt: 'Just now',
          };
          return next;
        }
        return prev;
      });
    },
    [activeBoardId, currentProjectName, pushSnapshot]
  );

  // Master Clear Workspace: Clears visual boards canvas, organizer items, and registered categories
  const handleMasterClear = useCallback(() => {
    pushSnapshot();
    // Clear all nodes and connectors across all visual boards
    const clearedBoards = boards.map((b) => ({
      ...b,
      nodes: [],
      connectors: [],
      groups: [],
    }));
    setBoards(clearedBoards);
    // Clear organizer items
    setOrganizerItems([]);
    setSelectedNodeId(null);
    setSelectedConnectorId(null);
    setExecutionLogs([]);
    try {
      localStorage.setItem('mo_registered_categories_v2', JSON.stringify([]));
      localStorage.removeItem('mo_category_titles');
    } catch (e) {
      console.error(e);
    }

    setSavedProjects((prev) => {
      const curKey = currentProjectName.trim().toLowerCase();
      const existingIdx = prev.findIndex((p) => p.name.trim().toLowerCase() === curKey);
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = {
          ...next[existingIdx],
          boards: next[existingIdx].boards.map((b) => ({ ...b, nodes: [], connectors: [], groups: [] })),
          organizerItems: [],
          updatedAt: 'Just now',
        };
        return next;
      }
      return prev;
    });
  }, [boards, currentProjectName, pushSnapshot]);

  // Canvas Node Operations
  const handleAddNode = useCallback(
    (newNode: CanvasNode) => {
      pushSnapshot();
      updateActiveBoard((board) => {
        const boardIdx = Math.max(0, boards.findIndex((b) => b.id === board.id));
        let finalNode = newNode;
        if (board.nodes.some((n) => n.id === newNode.id)) {
          finalNode = {
            ...newNode,
            id: `node-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          };
        }

        // Ensure serial number is valid, synchronized with the board, and unique
        if (
          !finalNode.serialNumber ||
          finalNode.serialNumber === 'SN-01' ||
          board.nodes.some((n) => n.serialNumber?.toLowerCase() === finalNode.serialNumber?.toLowerCase())
        ) {
          finalNode = {
            ...finalNode,
            serialNumber: getNextBoardNodeSerialNumber(finalNode.type, board.nodes, boardIdx),
          };
        }

        const nextNodes = deduplicateBoardNodeSerialNumbers([...board.nodes, finalNode], boardIdx);

        return {
          ...board,
          nodes: nextNodes,
        };
      });
    },
    [pushSnapshot, updateActiveBoard, boards]
  );

  const handleUpdateNode = useCallback(
    (updatedNode: CanvasNode) => {
      const oldNode = activeBoard?.nodes.find((n) => n.id === updatedNode.id);
      if (
        oldNode &&
        (oldNode.customColor !== updatedNode.customColor ||
          oldNode.fontSize !== updatedNode.fontSize ||
          oldNode.title !== updatedNode.title ||
          oldNode.serialNumber !== updatedNode.serialNumber ||
          oldNode.noteContent !== updatedNode.noteContent ||
          oldNode.kanbanColumns !== updatedNode.kanbanColumns)
      ) {
        pushSnapshot();
      }

      updateActiveBoard((board) => ({
        ...board,
        nodes: board.nodes.map((n) => (n.id === updatedNode.id ? updatedNode : n)),
      }));

      // If serial number or name changed on canvas node, sync back to matching organizer item
      if (updatedNode.sourceOrganizerId || updatedNode.title) {
        setOrganizerItems((prev) =>
          prev.map((item) => {
            const isMatch =
              item.id === updatedNode.sourceOrganizerId ||
              (oldNode && item.name.toLowerCase() === oldNode.title.toLowerCase());
            if (isMatch) {
              return {
                ...item,
                serialNumber: updatedNode.serialNumber || item.serialNumber,
                name: updatedNode.title || item.name,
              };
            }
            return item;
          })
        );
      }

      // Keep inspecting node in sync if currently open
      if (inspectingNode && inspectingNode.id === updatedNode.id) {
        setInspectingNode(updatedNode);
      }
    },
    [activeBoard, pushSnapshot, updateActiveBoard, inspectingNode]
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      pushSnapshot();
      updateActiveBoard((board) => ({
        ...board,
        nodes: board.nodes.filter((n) => n.id !== nodeId),
        connectors: board.connectors.filter(
          (c) => c.sourceId !== nodeId && c.targetId !== nodeId
        ),
      }));
      if (selectedNodeId === nodeId) setSelectedNodeId(null);
      if (inspectingNode?.id === nodeId) setInspectingNode(null);
    },
    [pushSnapshot, updateActiveBoard, selectedNodeId, inspectingNode]
  );

  const handleDuplicateNode = useCallback(
    (nodeId: string) => {
      const nodeToDup = activeBoard?.nodes.find((n) => n.id === nodeId);
      if (!nodeToDup) return;

      pushSnapshot();
      const boardIdx = Math.max(0, boards.findIndex((b) => b.id === activeBoardId));
      const nextSN = getNextBoardNodeSerialNumber(nodeToDup.type, activeBoard?.nodes || [], boardIdx);

      const duplicated: CanvasNode = {
        ...nodeToDup,
        id: `node-${Date.now()}`,
        serialNumber: nextSN,
        title: `${nodeToDup.title} (Copy)`,
        x: nodeToDup.x + 30,
        y: nodeToDup.y + 30,
        status: 'idle',
      };

      handleAddNode(duplicated);
      setSelectedNodeId(duplicated.id);
    },
    [activeBoard, pushSnapshot, handleAddNode, boards, activeBoardId]
  );

  // Connector Operations
  const handleAddConnector = useCallback(
    (newConnector: Connector) => {
      pushSnapshot();
      updateActiveBoard((board) => ({
        ...board,
        connectors: [...board.connectors, newConnector],
      }));
      setSelectedConnectorId(newConnector.id);
    },
    [pushSnapshot, updateActiveBoard]
  );

  const handleUpdateConnector = useCallback(
    (updatedConnector: Connector) => {
      pushSnapshot();
      updateActiveBoard((board) => ({
        ...board,
        connectors: board.connectors.map((c) =>
          c.id === updatedConnector.id ? updatedConnector : c
        ),
      }));
    },
    [pushSnapshot, updateActiveBoard]
  );

  const handleDeleteConnector = useCallback(
    (connectorId: string) => {
      pushSnapshot();
      updateActiveBoard((board) => ({
        ...board,
        connectors: board.connectors.filter((c) => c.id !== connectorId),
      }));
      if (selectedConnectorId === connectorId) setSelectedConnectorId(null);
    },
    [pushSnapshot, updateActiveBoard, selectedConnectorId]
  );

  // Pan & Zoom
  const handlePanZoomChange = useCallback(
    (newPan: { x: number; y: number }, newZoom: number) => {
      updateActiveBoard((board) => ({
        ...board,
        pan: newPan,
        zoom: newZoom,
      }));
    },
    [updateActiveBoard]
  );

  // Sidebar collapse toggle with canvas pan compensation
  // When sidebar collapses (304px -> 56px), the space below the sidebar (+248px) is added to the canvas viewport,
  // preventing the canvas from shifting to the left.
  const handleToggleSidebar = useCallback(() => {
    const nextCollapsed = !sidebarCollapsed;
    const delta = sidebarCollapsed ? -248 : 248;

    setSidebarCollapsed(nextCollapsed);

    updateActiveBoard((board) => ({
      ...board,
      pan: {
        ...board.pan,
        x: board.pan.x + delta,
      },
    }));
  }, [sidebarCollapsed, updateActiveBoard]);

  // Area A: Add Organizer Item to Canvas with non-overlapping grid layout
  const handleAddOrganizerItemToCanvas = useCallback(
    (item: OrganizerItem) => {
      if (!activeBoard) return;
      if (activeBoard.nodes.some((n) => n.sourceOrganizerId === item.id)) {
        return;
      }
      const count = activeBoard.nodes.length;
      const cols = 3;
      const col = count % cols;
      const row = Math.floor(count / cols);

      const baseX = Math.round((-activeBoard.pan.x + 60) / 20) * 20;
      const baseY = Math.round((-activeBoard.pan.y + 60) / 20) * 20;
      const posX = baseX + col * 310;
      const posY = baseY + row * 220;

      const activeBoardIndex = Math.max(0, boards.findIndex((b) => b.id === activeBoardId));
      const canvasSN = getNextBoardNodeSerialNumber(item.type, activeBoard.nodes, activeBoardIndex);

      const newNode: CanvasNode = {
        id: `node-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        serialNumber: canvasSN,
        title: item.name,
        type: item.type as any,
        x: posX,
        y: posY,
        width: item.type === 'tool' ? 280 : 270,
        status: item.status || 'idle',
        description: item.description,
        sourceOrganizerId: item.id,
        command: item.command,
        endpoint: item.endpoint,
        environment: item.environment,
        tags: item.tags,
      };

      handleAddNode(newNode);
      setSelectedNodeId(newNode.id);
    },
    [activeBoard, boards, activeBoardId, handleAddNode]
  );

  // Sync missing organizer items onto active board canvas
  const handleSyncOrganizerItemsToCanvas = useCallback(() => {
    if (!activeBoard) return;
    pushSnapshot();
    const existingSourceIds = new Set(
      activeBoard.nodes.map((n) => n.sourceOrganizerId || n.title.toLowerCase())
    );

    const missingItems = organizerItems.filter(
      (item) => !existingSourceIds.has(item.id) && !existingSourceIds.has(item.name.toLowerCase())
    );

    if (missingItems.length === 0) {
      updateActiveBoard((board) => ({
        ...board,
        nodes: board.nodes.map((node) => {
          const orgItem = organizerItems.find(
            (i) => i.id === node.sourceOrganizerId || i.name.toLowerCase() === node.title.toLowerCase()
          );
          if (orgItem) {
            return {
              ...node,
              serialNumber: orgItem.serialNumber || node.serialNumber,
              title: orgItem.name || node.title,
              description: orgItem.description || node.description,
            };
          }
          return node;
        }),
      }));
      return;
    }

    const currentCount = activeBoard.nodes.length;
    const cols = 3;
    const baseX = Math.round((-activeBoard.pan.x + 60) / 20) * 20;
    const baseY = Math.round((-activeBoard.pan.y + 60) / 20) * 20;
    const activeBoardIndex = Math.max(0, boards.findIndex((b) => b.id === activeBoardId));
    let runningNodes = [...activeBoard.nodes];

    const newNodes: CanvasNode[] = missingItems.map((item, idx) => {
      const idxTotal = currentCount + idx;
      const col = idxTotal % cols;
      const row = Math.floor(idxTotal / cols);
      const sn = getNextBoardNodeSerialNumber(item.type, runningNodes, activeBoardIndex);
      const createdNode: CanvasNode = {
        id: `node-sync-${Date.now()}-${idx}`,
        serialNumber: sn,
        title: item.name,
        type: item.type as any,
        x: baseX + col * 310,
        y: baseY + row * 220,
        width: item.type === 'tool' ? 280 : 270,
        status: item.status || 'idle',
        description: item.description,
        sourceOrganizerId: item.id,
        command: item.command,
        endpoint: item.endpoint,
        environment: item.environment,
        tags: item.tags,
      };
      runningNodes.push(createdNode);
      return createdNode;
    });

    updateActiveBoard((board) => ({
      ...board,
      nodes: deduplicateBoardNodeSerialNumbers([...board.nodes, ...newNodes], activeBoardIndex),
    }));
  }, [activeBoard, organizerItems, pushSnapshot, updateActiveBoard, boards, activeBoardId]);

  // Items that exist on ANY canvas board across the workspace
  const allCanvasItemIds = useMemo(() => {
    const ids = new Set<string>();
    boards.forEach((b) => {
      b.nodes?.forEach((n) => {
        const id =
          n.sourceOrganizerId ||
          organizerItems.find((i) => i.name.toLowerCase() === n.title.toLowerCase())?.id;
        if (id) ids.add(id);
      });
    });
    return Array.from(ids);
  }, [boards, organizerItems]);

  // Delete item from across ALL canvas boards and remove from organizer
  const handleDeleteItemFromAllCanvases = useCallback(
    (itemId: string) => {
      pushSnapshot();
      const itemToDelete = organizerItems.find((i) => i.id === itemId);
      const itemNameLower = itemToDelete?.name.toLowerCase();

      // 1. Remove matching nodes and connected connectors from across ALL canvas boards
      setBoards((prevBoards) =>
        prevBoards.map((b) => {
          const nodesToRemove = b.nodes.filter(
            (n) =>
              n.sourceOrganizerId === itemId ||
              (itemNameLower && n.title.toLowerCase() === itemNameLower)
          );
          if (nodesToRemove.length === 0) return b;
          const nodeIdsToRemove = new Set(nodesToRemove.map((n) => n.id));
          return {
            ...b,
            nodes: b.nodes.filter((n) => !nodeIdsToRemove.has(n.id)),
            connectors: b.connectors.filter(
              (c) => !nodeIdsToRemove.has(c.sourceId) && !nodeIdsToRemove.has(c.targetId)
            ),
          };
        })
      );

      // 2. Clear selectedNodeId if deleted
      setSelectedNodeId((prev) => {
        if (!prev) return null;
        const wasDeleted = boards.some((b) =>
          b.nodes.some(
            (n) =>
              n.id === prev &&
              (n.sourceOrganizerId === itemId ||
                (itemNameLower && n.title.toLowerCase() === itemNameLower))
          )
        );
        return wasDeleted ? null : prev;
      });

      // 3. Clear inspectingNode if deleted
      setInspectingNode((prev) => {
        if (!prev) return null;
        if (
          prev.sourceOrganizerId === itemId ||
          (itemNameLower && prev.title.toLowerCase() === itemNameLower)
        ) {
          return null;
        }
        return prev;
      });

      // 4. Delete item from organizer items
      setOrganizerItems((prev) => prev.filter((item) => item.id !== itemId));
    },
    [organizerItems, pushSnapshot, boards]
  );

  // Arrange all canvas nodes sequentially by Serial Number (S/N) in a clean grid
  const handleArrangeNodesBySerial = useCallback(() => {
    if (!activeBoard || activeBoard.nodes.length === 0) return;
    pushSnapshot();

    const sorted = [...activeBoard.nodes].sort((a, b) => {
      const snA = a.serialNumber || `SN-${a.id.slice(-3)}`;
      const snB = b.serialNumber || `SN-${b.id.slice(-3)}`;
      return compareSerialNumbers(snA, snB);
    });

    const cols = 3;
    const baseX = Math.round((-activeBoard.pan.x + 60) / 20) * 20;
    const baseY = Math.round((-activeBoard.pan.y + 60) / 20) * 20;
    const colWidth = 310;
    const rowHeight = 220;

    const rearranged = sorted.map((node, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      return {
        ...node,
        x: baseX + col * colWidth,
        y: baseY + row * rowHeight,
      };
    });

    updateActiveBoard((board) => ({
      ...board,
      nodes: rearranged,
    }));
  }, [activeBoard, pushSnapshot, updateActiveBoard]);

  // Track previous organizer items to ONLY auto-place genuinely new items when user adds them,
  // preventing cleared or deleted canvas nodes from being resurrected
  const prevOrganizerItemIdsRef = useRef<Set<string>>(
    new Set(organizerItems.map((i) => i.id))
  );

  useEffect(() => {
    const prevIds = prevOrganizerItemIdsRef.current;
    const currentIds = new Set(organizerItems.map((i) => i.id));
    prevOrganizerItemIdsRef.current = currentIds;

    // Detect if items were added to organizer (not cleared/deleted)
    const newlyAddedItems = organizerItems.filter((item) => !prevIds.has(item.id));
    if (newlyAddedItems.length > 0 && activeBoard) {
      newlyAddedItems.forEach((item) => {
        handleAddOrganizerItemToCanvas(item);
      });
    }
  }, [organizerItems, activeBoard, handleAddOrganizerItemToCanvas]);

  // Area C: Run / Execute Action with real simulation
  const handleRunNode = useCallback(
    (nodeId: string) => {
      const targetNode = activeBoard?.nodes.find((n) => n.id === nodeId);
      if (!targetNode) return;

      const now = new Date().toLocaleTimeString();
      const nodeTitle = targetNode.title;

      // 1. Set node to running
      handleUpdateNode({
        ...targetNode,
        status: 'running',
        lastExecutedAt: now,
      });

      // 2. Open console drawer & append start log
      setConsoleOpen(true);
      const startLog: ExecutionLog = {
        id: `log-${Date.now()}-1`,
        timestamp: now,
        nodeId,
        nodeTitle,
        level: 'info',
        message: targetNode.command 
          ? `Dispatched runner for command: "${targetNode.command}"`
          : targetNode.endpoint
          ? `Initiated health check & status probe against: ${targetNode.endpoint}`
          : `Initiated orchestration workflow sequence...`,
      };

      setExecutionLogs((prev) => [startLog, ...prev]);

      // Check downstream connected nodes
      const downstreamConnectors = activeBoard.connectors.filter((c) => c.sourceId === nodeId);
      if (downstreamConnectors.length > 0) {
        setTimeout(() => {
          const downstreamTitles = downstreamConnectors
            .map((c) => activeBoard.nodes.find((n) => n.id === c.targetId)?.title)
            .filter(Boolean)
            .join(', ');

          setExecutionLogs((prev) => [
            {
              id: `log-${Date.now()}-2`,
              timestamp: new Date().toLocaleTimeString(),
              nodeId,
              nodeTitle,
              level: 'info',
              message: `Pulsing payload downstream to [${downstreamTitles}] across ${downstreamConnectors.length} connection link(s).`,
            },
            ...prev,
          ]);
        }, 600);
      }

      // 3. Settle after 1.4 seconds with success
      setTimeout(() => {
        const finishTime = new Date().toLocaleTimeString();
        handleUpdateNode({
          ...targetNode,
          status: 'success',
          lastExecutedAt: finishTime,
        });

        setExecutionLogs((prev) => [
          {
            id: `log-${Date.now()}-3`,
            timestamp: finishTime,
            nodeId,
            nodeTitle,
            level: 'success',
            message: `Execution settled successfully with exit code 0. Status: NOMINAL (duration: 1.42s).`,
          },
          ...prev,
        ]);
      }, 1400);
    },
    [activeBoard, handleUpdateNode]
  );

  // Area C: Open Inspector Action
  const handleOpenInspector = useCallback((node: CanvasNode) => {
    setInspectingNode(node);
  }, []);

  // Area D: Canvas List / Boards Operations
  const handleNewBoard = () => {
    setNewBoardModalOpen(true);
  };

  const handleCreateBoardFromModal = (newBoard: CanvasBoard) => {
    setBoards((prev) => [...prev, newBoard]);
    setActiveBoardId(newBoard.id);
  };

  const handleDuplicateBoard = (boardId: string) => {
    const boardToDup = boards.find((b) => b.id === boardId);
    if (!boardToDup) return;

    const nameExists = (n: string) =>
      boards.some((b) => b.name.trim().toLowerCase() === n.trim().toLowerCase());

    let newName = `${boardToDup.name} (Copy)`;
    if (nameExists(newName)) {
      let counter = 2;
      while (nameExists(`${boardToDup.name} (${counter})`)) {
        counter++;
      }
      newName = `${boardToDup.name} (${counter})`;
    }

    const dupBoard: CanvasBoard = {
      ...boardToDup,
      id: `board-${Date.now()}`,
      name: newName,
      updatedAt: 'Just now',
    };

    setBoards((prev) => [...prev, dupBoard]);
    setActiveBoardId(dupBoard.id);
  };

  const handleDeleteBoard = (boardId: string) => {
    if (boards.length <= 1) return;
    const remaining = boards.filter((b) => b.id !== boardId);
    setBoards(remaining);
    if (activeBoardId === boardId) {
      setActiveBoardId(remaining[0].id);
    }
  };

  const handleDeleteMultipleBoards = useCallback(
    (boardIdsToDelete: string[]) => {
      if (boardIdsToDelete.length === 0) return;
      pushSnapshot();
      const deleteSet = new Set(boardIdsToDelete);
      setBoards((prev) => {
        const remaining = prev.filter((b) => !deleteSet.has(b.id));
        if (remaining.length === 0) return prev;
        if (deleteSet.has(activeBoardId)) {
          setActiveBoardId(remaining[0].id);
        }
        return remaining;
      });
    },
    [activeBoardId, pushSnapshot]
  );

  const handleRenameBoard = useCallback((boardId: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setBoards((prev) =>
      prev.map((b) => (b.id === boardId ? { ...b, name: trimmed, updatedAt: 'Just now' } : b))
    );
  }, []);

  const handleDeleteAllBoards = useCallback(() => {
    pushSnapshot();
    const defaultBoard: CanvasBoard = {
      id: `board-${Date.now()}`,
      name: 'Main Board',
      description: 'Primary visual workspace',
      icon: 'layout',
      nodes: [],
      connectors: [],
      groups: [],
      pan: { x: 0, y: 0 },
      zoom: 1,
      updatedAt: 'Just now',
    };
    setBoards([defaultBoard]);
    setActiveBoardId(defaultBoard.id);
    setSelectedNodeId(null);
    setSelectedConnectorId(null);
  }, [pushSnapshot]);

  // Export / Import Workspace (Area D)
  const handleExportWorkspace = async () => {
    const data = {
      projectName: currentProjectName,
      boards,
      organizerItems,
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
    };
    const defaultFileName = `${(currentProjectName || 'orchestrator-project')
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_')}-${new Date().toISOString().slice(0, 10)}.json`;
    await saveProjectToComputer(data, defaultFileName);
  };

  const hasCurrentProjectContent = useMemo(() => {
    const hasNodes = boards.some((b) => b.nodes && b.nodes.length > 0);
    const hasItems = organizerItems.length > 0;
    return hasNodes || hasItems;
  }, [boards, organizerItems]);

  const applyLoadProject = useCallback((target: {
    name: string;
    boards: CanvasBoard[];
    organizerItems: OrganizerItem[];
    activeBoardId?: string;
  }) => {
    setCurrentProjectName(target.name);
    if (target.boards && Array.isArray(target.boards)) {
      setBoards(target.boards.map((b: CanvasBoard, bIdx: number) => ({
        ...b,
        nodes: ensureUniqueNodeIds(ensureNodeSerialNumbers(b.nodes || [], [], bIdx)),
      })));
      if (target.boards[0]) {
        setActiveBoardId(target.activeBoardId || target.boards[0].id);
      }
    }
    if (target.organizerItems && Array.isArray(target.organizerItems)) {
      setOrganizerItems(ensureItemSerialNumbers(target.organizerItems));
    }
    setSelectedNodeId(null);
    setSelectedConnectorId(null);
    setInspectingNode(null);
    setConnectingFromNodeId(null);
    setExecutionLogs([]);
    setHistory({ past: [], future: [] });
  }, []);

  const handleImportWorkspace = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const incomingName = parsed.projectName || parsed.name || file.name.replace(/\.json$/i, '');
        const incomingProject = {
          name: incomingName,
          boards: parsed.boards || [],
          organizerItems: parsed.organizerItems || [],
          activeBoardId: parsed.boards?.[0]?.id,
        };

        // Always ask user whether to save current workspace/canvas before loading
        setPendingProjectToLoad(incomingProject);
        setSaveBeforeLoadModalOpen(true);
      } catch (err) {
        console.error('Invalid workspace JSON file', err);
      }
    };
    reader.readAsText(file);
  };

  // Project Management Operations
  const handleConfirmNewProject = useCallback(
    (params: {
      saveCurrent: boolean;
      currentSaveName: string;
      downloadBackup: boolean;
      newProjectName: string;
      newProjectDescription: string;
      template: 'blank' | 'starter';
    }) => {
      // 1. If user opted to save current project, record into savedProjects list
      if (params.saveCurrent) {
        const targetName = params.currentSaveName.trim() || currentProjectName;
        const projectToSave: SavedProject = {
          id: `proj-${Date.now()}`,
          name: targetName,
          description: `Saved from ${currentProjectName}`,
          createdAt: new Date().toISOString(),
          updatedAt: 'Just now',
          boards: JSON.parse(JSON.stringify(boards)),
          organizerItems: JSON.parse(JSON.stringify(organizerItems)),
          activeBoardId,
        };
        setSavedProjects((prev) => {
          const targetKey = targetName.toLowerCase();
          const existingIdx = prev.findIndex((p) => p.name.trim().toLowerCase() === targetKey);
          if (existingIdx >= 0) {
            const next = [...prev];
            next[existingIdx] = {
              ...next[existingIdx],
              ...projectToSave,
              id: next[existingIdx].id,
            };
            return next;
          }
          return [projectToSave, ...prev];
        });

        // Download JSON backup if requested, prompting user where to save on computer
        if (params.downloadBackup) {
          const data = {
            projectName: targetName,
            boards,
            organizerItems,
            exportedAt: new Date().toISOString(),
            version: '1.0.0',
          };
          const fileName = `${targetName.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}-backup.json`;
          saveProjectToComputer(data, fileName);
        }
      }

      // 2. Set active project name
      setCurrentProjectName(params.newProjectName);

      // 3. Initialize workspace based on selected template
      if (params.template === 'starter') {
        const starterBoards = INITIAL_BOARDS.map((b, bIdx) => ({
          ...b,
          nodes: ensureNodeSerialNumbers(b.nodes, [], bIdx),
        }));
        setBoards(starterBoards);
        setActiveBoardId(starterBoards[0].id);
        setOrganizerItems(ensureItemSerialNumbers(INITIAL_ORGANIZER_ITEMS));
        try {
          localStorage.removeItem('mo_registered_categories_v2');
          localStorage.removeItem('mo_category_titles');
          window.dispatchEvent(new CustomEvent('mo_categories_updated'));
        } catch (e) {
          console.error(e);
        }
      } else {
        // Clean blank slate
        const freshBoard: CanvasBoard = {
          id: `board-${Date.now()}`,
          name: 'Main Canvas',
          description: `${params.newProjectName} - Visual Canvas`,
          icon: 'Network',
          updatedAt: 'Just now',
          nodes: [],
          connectors: [],
          groups: [],
          pan: { x: 50, y: 50 },
          zoom: 1,
        };
        setBoards([freshBoard]);
        setActiveBoardId(freshBoard.id);
        setOrganizerItems([]);

        // "once project starts , don't delete it default category m but items in it can delete"
        const defaultCat = {
          key: 'default',
          title: 'Default Category',
          color: '#3B5D37',
          iconName: 'Package',
        };
        try {
          localStorage.setItem('mo_registered_categories_v2', JSON.stringify([defaultCat]));
          localStorage.setItem('mo_category_serials', JSON.stringify({ default: '1' }));
          localStorage.removeItem('mo_category_titles');
          window.dispatchEvent(new CustomEvent('mo_categories_updated'));
        } catch (e) {
          console.error(e);
        }
      }

      // 4. Reset selections, drawer, and canvas undo/redo history
      setSelectedNodeId(null);
      setSelectedConnectorId(null);
      setInspectingNode(null);
      setConnectingFromNodeId(null);
      setExecutionLogs([]);
      setHistory({ past: [], future: [] });
    },
    [boards, organizerItems, activeBoardId, currentProjectName]
  );

  const handleLoadProject = useCallback(
    (project: SavedProject) => {
      const incoming = {
        name: project.name,
        boards: project.boards,
        organizerItems: project.organizerItems,
        activeBoardId: project.activeBoardId || project.boards[0]?.id,
      };
      // Always prompt user to save current workspace/canvas before loading project
      setPendingProjectToLoad(incoming);
      setSaveBeforeLoadModalOpen(true);
    },
    []
  );

  const handleConfirmSaveAndLoad = useCallback(
    async (params: { saveName: string; saveToComputer: boolean }) => {
      const targetName = params.saveName.trim() || currentProjectName;
      // 1. Save current project to library (update if exists with same name)
      const currentSnapshot: SavedProject = {
        id: `proj-${Date.now()}`,
        name: targetName,
        description: `Saved before loading ${pendingProjectToLoad?.name || 'project'}`,
        createdAt: new Date().toISOString(),
        updatedAt: 'Just now',
        boards: JSON.parse(JSON.stringify(boards)),
        organizerItems: JSON.parse(JSON.stringify(organizerItems)),
        activeBoardId,
      };
      setSavedProjects((prev) => {
        const targetKey = targetName.toLowerCase();
        const existingIdx = prev.findIndex((p) => p.name.trim().toLowerCase() === targetKey);
        if (existingIdx >= 0) {
          const next = [...prev];
          next[existingIdx] = {
            ...next[existingIdx],
            ...currentSnapshot,
            id: next[existingIdx].id,
          };
          return next;
        }
        return [currentSnapshot, ...prev];
      });

      if (params.saveToComputer) {
        const data = {
          projectName: targetName,
          boards,
          organizerItems,
          exportedAt: new Date().toISOString(),
          version: '1.0.0',
        };
        const fileName = `${targetName.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}.json`;
        await saveProjectToComputer(data, fileName);
      }

      // 2. Load incoming project
      if (pendingProjectToLoad) {
        applyLoadProject(pendingProjectToLoad);
        setPendingProjectToLoad(null);
      }
      setSaveBeforeLoadModalOpen(false);
      setProjectsManagerModalOpen(false);
    },
    [boards, organizerItems, activeBoardId, pendingProjectToLoad, applyLoadProject, currentProjectName]
  );

  const handleConfirmLoadWithoutSaving = useCallback(() => {
    // Proceed directly with loading without saving current project
    if (pendingProjectToLoad) {
      applyLoadProject(pendingProjectToLoad);
      setPendingProjectToLoad(null);
    }
    setSaveBeforeLoadModalOpen(false);
    setProjectsManagerModalOpen(false);
  }, [pendingProjectToLoad, applyLoadProject]);

  const handleDeleteSavedProject = useCallback((projectId: string) => {
    setSavedProjects((prev) => prev.filter((p) => p.id !== projectId));
  }, []);

  const handleRenameSavedProject = useCallback((projectId: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setSavedProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, name: trimmed, updatedAt: 'Just now' } : p))
    );
  }, []);

  const handleDeduplicateSavedProjects = useCallback(() => {
    setSavedProjects((prev) => deduplicateSavedProjects(prev));
  }, []);

  const handleExportSavedProject = useCallback((project: SavedProject) => {
    const data = {
      projectName: project.name,
      boards: project.boards,
      organizerItems: project.organizerItems,
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // Quick Node Add from Header
  const handleAddQuickNode = () => {
    if (!activeBoard) return;
    const posX = Math.round((-activeBoard.pan.x + 350) / 20) * 20;
    const posY = Math.round((-activeBoard.pan.y + 220) / 20) * 20;
    const boardIdx = Math.max(0, boards.findIndex((b) => b.id === activeBoardId));
    const nextSN = getNextBoardNodeSerialNumber('app', activeBoard.nodes, boardIdx);

    const newNode: CanvasNode = {
      id: `node-${Date.now()}`,
      serialNumber: nextSN,
      title: 'New Service Node',
      type: 'app',
      x: posX,
      y: posY,
      width: 270,
      status: 'idle',
      description: 'Custom canvas node created via quick adder',
      environment: 'development',
      tags: ['service'],
    };

    handleAddNode(newNode);
    setSelectedNodeId(newNode.id);
  };

  // Ensure active board nodes are synchronized and have continuous, unique serial numbers
  useEffect(() => {
    if (!activeBoard || activeBoard.nodes.length === 0) return;
    const boardIdx = Math.max(0, boards.findIndex((b) => b.id === activeBoardId));
    const seen = new Set<string>();
    let hasConflict = false;

    for (const node of activeBoard.nodes) {
      const sn = node.serialNumber?.trim().toLowerCase();
      if (!sn || sn === 'sn-01' || sn === '1' || seen.has(sn)) {
        hasConflict = true;
        break;
      }
      seen.add(sn);
    }

    if (hasConflict) {
      const cleanNodes = deduplicateBoardNodeSerialNumbers(activeBoard.nodes, boardIdx);
      updateActiveBoard((board) => ({
        ...board,
        nodes: cleanNodes,
      }));
    }
  }, [activeBoardId, activeBoard, boards, updateActiveBoard]);

  // Currently selected node object
  const selectedNode = activeBoard?.nodes.find((n) => n.id === selectedNodeId) || null;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#F8EBE8] dark:bg-[#1F3E22] text-[#1F3E22] dark:text-[#F8EBE8] font-sans antialiased">
      {/* Top Header Bar (Includes Area D: Canvas List & Top Bar Contract) */}
      <Header
        boards={boards}
        activeBoardId={activeBoardId}
        onSelectBoard={(id) => {
          setActiveBoardId(id);
          setSelectedNodeId(null);
          setSelectedConnectorId(null);
        }}
        onNewBoard={handleNewBoard}
        onDuplicateBoard={handleDuplicateBoard}
        onDeleteBoard={handleDeleteBoard}
        onDeleteMultipleBoards={handleDeleteMultipleBoards}
        onDeleteAllBoards={handleDeleteAllBoards}
        onExportBoards={handleExportWorkspace}
        onImportBoards={handleImportWorkspace}
        onAddQuickNode={handleAddQuickNode}
        darkMode={darkMode}
        onToggleTheme={() => setDarkMode(!darkMode)}
        onClearBoard={handleClearCanvas}
        onMasterClear={handleMasterClear}
        onSyncOrganizerItems={handleSyncOrganizerItemsToCanvas}
        currentProjectName={currentProjectName}
        savedProjectsCount={savedProjects.length}
        onNewProject={() => setNewProjectModalOpen(true)}
        onOpenProjectsManager={() => setProjectsManagerModalOpen(true)}
        onRenameProject={setCurrentProjectName}
        onRenameBoard={handleRenameBoard}
        onOpenGithubSync={() => setGithubSyncModalOpen(true)}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Area A: Left Sidebar – Organizer */}
        <OrganizerSidebar
          items={organizerItems}
          onAddToCanvas={handleAddOrganizerItemToCanvas}
          onOpenNewItemModal={(type) => {
            if (type) setNewItemDefaultType(type);
            setNewItemModalOpen(true);
          }}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
          onClearAllItems={() => setOrganizerItems([])}
          onMasterClear={handleMasterClear}
          onResetDefaultItems={() => setOrganizerItems(INITIAL_ORGANIZER_ITEMS)}
          onClearCategoryItems={(type) =>
            setOrganizerItems((prev) => prev.filter((item) => item.type !== type))
          }
          onDeleteItem={(itemId) =>
            setOrganizerItems((prev) => prev.filter((item) => item.id !== itemId))
          }
          onDeleteItemFromAllCanvases={handleDeleteItemFromAllCanvases}
          selectedItemId={
            selectedNode?.sourceOrganizerId ||
            organizerItems.find((i) => i.name.toLowerCase() === selectedNode?.title.toLowerCase())?.id ||
            null
          }
          activeCanvasItemIds={allCanvasItemIds}
          onSelectItem={(item) => {
            const existingNode = activeBoard?.nodes.find(
              (n) => n.sourceOrganizerId === item.id || n.title.toLowerCase() === item.name.toLowerCase()
            );
            if (existingNode) {
              setSelectedNodeId(existingNode.id);
              setSelectedConnectorId(null);
              if (activeBoard) {
                const targetPanX = Math.round(-existingNode.x * activeBoard.zoom + 400);
                const targetPanY = Math.round(-existingNode.y * activeBoard.zoom + 250);
                handlePanZoomChange({ x: targetPanX, y: targetPanY }, activeBoard.zoom);
              }
            } else {
              handleAddOrganizerItemToCanvas(item);
            }
          }}
          onUpdateItemName={(itemId, newName) => {
            setOrganizerItems((prev) =>
              prev.map((i) => (i.id === itemId ? { ...i, name: newName } : i))
            );
            updateActiveBoard((b) => ({
              ...b,
              nodes: b.nodes.map((n) =>
                n.sourceOrganizerId === itemId ? { ...n, title: newName } : n
              ),
            }));
          }}
          onUpdateItemDescription={(itemId, newDesc) => {
            setOrganizerItems((prev) =>
              prev.map((i) => (i.id === itemId ? { ...i, description: newDesc } : i))
            );
            updateActiveBoard((b) => ({
              ...b,
              nodes: b.nodes.map((n) =>
                n.sourceOrganizerId === itemId ? { ...n, description: newDesc } : n
              ),
            }));
          }}
          onUpdateItemCategory={(itemId, newCat) => {
            setOrganizerItems((prev) =>
              prev.map((i) => (i.id === itemId ? { ...i, category: newCat } : i))
            );
          }}
          onUpdateItemSerialNumber={(itemId, newSN) => {
            setOrganizerItems((prev) =>
              prev.map((i) => (i.id === itemId ? { ...i, serialNumber: newSN } : i))
            );
            updateActiveBoard((b) => ({
              ...b,
              nodes: b.nodes.map((n) =>
                n.sourceOrganizerId === itemId ? { ...n, serialNumber: newSN } : n
              ),
            }));
          }}
        />

        {/* Area B: Right Workspace – Canvas */}
        <main className="flex-1 h-full relative overflow-hidden flex flex-col">
          {/* Area C: Overhead Panel – Action Bar (Appears when a canvas node is selected) */}
          <OverheadActionBar
            selectedNode={selectedNode}
            onRunNode={handleRunNode}
            onOpenNodeInspector={handleOpenInspector}
            onDuplicateNode={handleDuplicateNode}
            onDeleteNode={handleDeleteNode}
            onDeselect={() => {
              setSelectedNodeId(null);
              setConnectingFromNodeId(null);
            }}
            onUpdateNode={handleUpdateNode}
            onStartConnectFromNode={(nodeId) => {
              setConnectingFromNodeId(nodeId);
            }}
          />

          {/* Interactive Canvas */}
          {activeBoard ? (
            <CanvasWorkspace
              nodes={activeBoard.nodes}
              connectors={activeBoard.connectors}
              groups={activeBoard.groups || []}
              selectedNodeId={selectedNodeId}
              selectedConnectorId={selectedConnectorId}
              onSelectNode={(id) => setSelectedNodeId(id)}
              onSelectConnector={(id) => setSelectedConnectorId(id)}
              onUpdateNode={handleUpdateNode}
              onAddNode={handleAddNode}
              onDeleteNode={handleDeleteNode}
              onAddConnector={handleAddConnector}
              onUpdateConnector={handleUpdateConnector}
              onDeleteConnector={handleDeleteConnector}
              onRunNode={handleRunNode}
              onOpenInspector={handleOpenInspector}
              pan={activeBoard.pan}
              zoom={activeBoard.zoom}
              onPanZoomChange={handlePanZoomChange}
              onClearCanvas={handleClearCanvas}
              onArrangeNodesBySerial={handleArrangeNodesBySerial}
              activeBoardName={activeBoard.name}
              boardIndex={Math.max(0, boards.findIndex((b) => b.id === activeBoardId))}
              canUndo={history.past.length > 0}
              canRedo={history.future.length > 0}
              onUndo={handleUndo}
              onRedo={handleRedo}
              connectingFromNodeId={connectingFromNodeId}
              onCancelConnecting={() => setConnectingFromNodeId(null)}
              canvasBgColor={activeBoard.backgroundColor}
              onChangeCanvasBgColor={handleChangeCanvasBgColor}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              No active board. Create one to begin.
            </div>
          )}
        </main>
      </div>

      {/* Execution Console Output Drawer */}
      <ExecutionConsoleDrawer
        logs={executionLogs}
        isOpen={consoleOpen}
        onClose={() => setConsoleOpen(false)}
        onClearLogs={() => setExecutionLogs([])}
      />

      {/* Node Inspector Modal (opened by Overhead Action Bar 'Open' action) */}
      <NodeInspectorModal
        node={inspectingNode}
        connectors={activeBoard?.connectors || []}
        allNodes={activeBoard?.nodes || []}
        onClose={() => setInspectingNode(null)}
        onUpdateNode={handleUpdateNode}
        onRunNode={handleRunNode}
        onDeleteNode={handleDeleteNode}
        onSelectNode={(id) => {
          setSelectedNodeId(id);
          const found = activeBoard?.nodes.find((n) => n.id === id);
          if (found) setInspectingNode(found);
        }}
      />

      {/* Register New Organizer Item Modal */}
      <NewItemModal
        isOpen={newItemModalOpen}
        defaultType={newItemDefaultType}
        existingItems={organizerItems}
        onClose={() => setNewItemModalOpen(false)}
        onAddItem={(newItem) => {
          setOrganizerItems((prev) => [...prev, newItem]);
        }}
        onAddCategory={() => {
          try {
            window.dispatchEvent(new CustomEvent('mo_categories_updated'));
          } catch (e) {
            console.error(e);
          }
        }}
      />

      {/* Create New Visual Board Modal */}
      <BoardModal
        isOpen={newBoardModalOpen}
        onClose={() => setNewBoardModalOpen(false)}
        onCreateBoard={handleCreateBoardFromModal}
        existingBoards={boards}
      />

      {/* Start New Project Modal */}
      <NewProjectModal
        isOpen={newProjectModalOpen}
        onClose={() => setNewProjectModalOpen(false)}
        currentProjectName={currentProjectName}
        boards={boards}
        organizerItems={organizerItems}
        onConfirmNewProject={handleConfirmNewProject}
      />

      {/* Saved Projects Library Modal */}
      <SavedProjectsModal
        isOpen={projectsManagerModalOpen}
        onClose={() => setProjectsManagerModalOpen(false)}
        savedProjects={savedProjects}
        currentProjectId={savedProjects.find((p) => p.name.trim().toLowerCase() === currentProjectName.trim().toLowerCase())?.id}
        onLoadProject={handleLoadProject}
        onDeleteProject={handleDeleteSavedProject}
        onExportProject={handleExportSavedProject}
        onRenameProject={handleRenameSavedProject}
        onDeduplicateProjects={handleDeduplicateSavedProjects}
        onStartNewProject={() => {
          setProjectsManagerModalOpen(false);
          setNewProjectModalOpen(true);
        }}
      />

      {/* Save Current Project Before Loading Modal */}
      <SaveBeforeLoadModal
        isOpen={saveBeforeLoadModalOpen}
        onClose={() => {
          setSaveBeforeLoadModalOpen(false);
          setPendingProjectToLoad(null);
        }}
        currentProjectName={currentProjectName}
        incomingProjectName={pendingProjectToLoad?.name || 'Incoming Project'}
        boardsCount={boards.length}
        nodesCount={boards.reduce((acc, b) => acc + (b.nodes?.length || 0), 0)}
        organizerItemsCount={organizerItems.length}
        onConfirmSaveAndLoad={handleConfirmSaveAndLoad}
        onConfirmLoadWithoutSaving={handleConfirmLoadWithoutSaving}
      />

      {/* GitHub Sync Modal */}
      <GithubSyncModal
        isOpen={githubSyncModalOpen}
        onClose={() => setGithubSyncModalOpen(false)}
        currentProjectName={currentProjectName}
        boards={boards}
        organizerItems={organizerItems}
        onLoadProjectFromGithub={applyLoadProject}
      />
    </div>
  );
}
