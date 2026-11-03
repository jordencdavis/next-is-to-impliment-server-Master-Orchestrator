import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  CanvasNode, 
  Connector, 
  ConnectorType,
  OrganizerItem, 
  NodeType,
  CanvasGroup 
} from '../types/orchestrator';
import { CanvasNodeComponent } from './CanvasNodeComponent';
import { generateCanvasNodeSerialNumber, getNextBoardNodeSerialNumber } from '../utils/serialUtils';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  RotateCcw, 
  Grid, 
  Plus, 
  StickyNote, 
  Kanban, 
  Sparkles,
  MapPin,
  Trash2,
  Sliders,
  Check,
  X,
  Layers,
  Undo2,
  Redo2,
  Palette,
  Type,
  ListOrdered
} from 'lucide-react';

interface CanvasWorkspaceProps {
  nodes: CanvasNode[];
  connectors: Connector[];
  groups?: CanvasGroup[];
  selectedNodeId: string | null;
  selectedConnectorId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onSelectConnector: (connectorId: string | null) => void;
  onUpdateNode: (node: CanvasNode) => void;
  onAddNode: (node: CanvasNode) => void;
  onDeleteNode: (nodeId: string) => void;
  onAddConnector: (connector: Connector) => void;
  onUpdateConnector: (connector: Connector) => void;
  onDeleteConnector: (connectorId: string) => void;
  onRunNode: (nodeId: string) => void;
  onOpenInspector: (node: CanvasNode) => void;
  pan: { x: number; y: number };
  zoom: number;
  onPanZoomChange: (pan: { x: number; y: number }, zoom: number) => void;
  onClearCanvas?: () => void;
  onArrangeNodesBySerial?: () => void;
  activeBoardName?: string;
  boardIndex?: number;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  connectingFromNodeId?: string | null;
  onCancelConnecting?: () => void;
  canvasBgColor?: string;
  onChangeCanvasBgColor?: (color: string) => void;
}

const CANVAS_BG_SWATCHES = [
  { name: 'Earthy Cream', hex: '#F8EBE8' },
  { name: 'Slate Grid', hex: '#F1F5F9' },
  { name: 'Chalk White', hex: '#FFFFFF' },
  { name: 'Sky Blueprint', hex: '#EBF5FF' },
  { name: 'Mint Sage', hex: '#F0FDF4' },
  { name: 'Warm Sand', hex: '#FEF3C7' },
  { name: 'Lilac Violet', hex: '#F5F3FF' },
  { name: 'Dark Forest', hex: '#122414' },
  { name: 'Obsidian Night', hex: '#0F172A' },
];

const COLOR_SWATCHES = [
  { name: 'Daze', hex: '#871201' },
  { name: 'Dusk', hex: '#C61B31' },
  { name: '2 am', hex: '#DB3A31' },
  { name: 'Spring', hex: '#DF9C56' },
  { name: 'Chalkwhite', hex: '#F8EBE8' },
  { name: 'Sunshine', hex: '#AFD1C2' },
  { name: 'Toasted', hex: '#709654' },
  { name: 'Mint', hex: '#3B5D37' },
  { name: 'Basil', hex: '#1F3E22' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Azure', hex: '#2563EB' },
  { name: 'Violet', hex: '#9333EA' },
];

const FONT_SIZES = [11, 12, 14, 16, 18, 20, 24];

export const CanvasWorkspace: React.FC<CanvasWorkspaceProps> = ({
  nodes,
  connectors,
  groups = [],
  selectedNodeId,
  selectedConnectorId,
  onSelectNode,
  onSelectConnector,
  onUpdateNode,
  onAddNode,
  onDeleteNode,
  onAddConnector,
  onUpdateConnector,
  onDeleteConnector,
  onRunNode,
  onOpenInspector,
  pan,
  zoom,
  onPanZoomChange,
  onClearCanvas,
  onArrangeNodesBySerial,
  activeBoardName,
  boardIndex = 0,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  connectingFromNodeId,
  onCancelConnecting,
  canvasBgColor,
  onChangeCanvasBgColor,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Canvas interaction states
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Canvas Node Resizing state
  const [resizingNodeId, setResizingNodeId] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState<{
    width: number;
    height: number;
    mouseX: number;
    mouseY: number;
  }>({ width: 0, height: 0, mouseX: 0, mouseY: 0 });

  const [snapToGrid, setSnapToGrid] = useState(true);
  const [showMinimap, setShowMinimap] = useState(true);

  // Floating controls popover states
  const [showColorPalette, setShowColorPalette] = useState(false);
  const [showFontSizePicker, setShowFontSizePicker] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showClearedToast, setShowClearedToast] = useState(false);
  const [showEmptyToast, setShowEmptyToast] = useState(false);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;

  // Connection drawing state
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectSource, setConnectSource] = useState<{
    nodeId: string;
    handle: 'top' | 'right' | 'bottom' | 'left';
  } | null>(null);
  const [connectMousePos, setConnectMousePos] = useState({ x: 0, y: 0 });

  // Connector Inspector Popover state
  const [editingConnector, setEditingConnector] = useState<Connector | null>(null);

  // Helper to convert screen to canvas coords
  const screenToCanvas = useCallback(
    (screenX: number, screenY: number) => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      const rawX = screenX - rect.left;
      const rawY = screenY - rect.top;
      return {
        x: (rawX - pan.x) / zoom,
        y: (rawY - pan.y) / zoom,
      };
    },
    [pan, zoom]
  );

  // Calculate handle position on canvas
  const getHandlePosition = useCallback(
    (node: CanvasNode, handle: 'top' | 'right' | 'bottom' | 'left') => {
      const width = node.width || (node.type === 'kanban' ? 680 : node.type === 'note' ? 260 : 270);
      let height = node.height || 150;
      if (!node.height) {
        if (node.type === 'kanban') height = 260;
        else if (node.type === 'note') height = 140;
        else if (node.type === 'tool') height = 160;
      }

      switch (handle) {
        case 'top':
          return { x: node.x + width / 2, y: node.y };
        case 'right':
          return { x: node.x + width, y: node.y + height / 2 };
        case 'bottom':
          return { x: node.x + width / 2, y: node.y + height };
        case 'left':
          return { x: node.x, y: node.y + height / 2 };
      }
    },
    []
  );

  // Handle Pan Drag
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only pan if clicking direct canvas background
    if (e.target === containerRef.current || (e.target as HTMLElement).tagName === 'svg') {
      onSelectNode(null);
      onSelectConnector(null);
      setEditingConnector(null);
      setShowColorPalette(false);
      setShowFontSizePicker(false);
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      onPanZoomChange({ x: e.clientX - panStart.x, y: e.clientY - panStart.y }, zoom);
    } else if (draggingNodeId) {
      const targetNode = nodes.find((n) => n.id === draggingNodeId);
      if (targetNode) {
        const mouseCanvas = screenToCanvas(e.clientX, e.clientY);
        let newX = mouseCanvas.x - dragOffset.x;
        let newY = mouseCanvas.y - dragOffset.y;

        if (snapToGrid) {
          const gridSize = 20;
          newX = Math.round(newX / gridSize) * gridSize;
          newY = Math.round(newY / gridSize) * gridSize;
        }

        onUpdateNode({ ...targetNode, x: newX, y: newY });
      }
    } else if (resizingNodeId) {
      const targetNode = nodes.find((n) => n.id === resizingNodeId);
      if (targetNode) {
        const mouseCanvas = screenToCanvas(e.clientX, e.clientY);
        const deltaX = mouseCanvas.x - resizeStart.mouseX;
        const deltaY = mouseCanvas.y - resizeStart.mouseY;
        const minW = targetNode.type === 'kanban' ? 440 : 200;
        const minH = targetNode.type === 'kanban' ? 220 : 120;
        let newW = Math.max(minW, Math.round(resizeStart.width + deltaX));
        let newH = Math.max(minH, Math.round(resizeStart.height + deltaY));

        if (snapToGrid) {
          newW = Math.round(newW / 20) * 20;
          newH = Math.round(newH / 20) * 20;
        }

        onUpdateNode({ ...targetNode, width: newW, height: newH });
      }
    } else if (isConnecting) {
      const mouseCanvas = screenToCanvas(e.clientX, e.clientY);
      setConnectMousePos(mouseCanvas);
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
    setResizingNodeId(null);
    if (isConnecting) {
      setIsConnecting(false);
      setConnectSource(null);
    }
  };

  // Node Drag Initiator
  const handleStartNodeDrag = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (connectingFromNodeId && connectingFromNodeId !== nodeId) {
      onAddConnector({
        id: `conn-${Date.now()}`,
        sourceId: connectingFromNodeId,
        targetId: nodeId,
        sourceHandle: 'right',
        targetHandle: 'left',
        type: 'dependency',
        label: 'Dependency',
      });
      onCancelConnecting?.();
      return;
    }

    onSelectNode(nodeId);
    onSelectConnector(null);
    setEditingConnector(null);

    const node = nodes.find((n) => n.id === nodeId);
    if (node) {
      const mouseCanvas = screenToCanvas(e.clientX, e.clientY);
      setDraggingNodeId(nodeId);
      setDragOffset({
        x: mouseCanvas.x - node.x,
        y: mouseCanvas.y - node.y,
      });
    }
  };

  // Node Resize Initiator (Corner / Edge Drag)
  const handleStartResizeNode = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onSelectNode(nodeId);
    onSelectConnector(null);
    const targetNode = nodes.find((n) => n.id === nodeId);
    if (targetNode) {
      const mouseCanvas = screenToCanvas(e.clientX, e.clientY);
      const defaultW = targetNode.type === 'kanban' ? 680 : targetNode.type === 'note' ? 260 : 270;
      const defaultH = targetNode.type === 'kanban' ? 280 : targetNode.type === 'note' ? 160 : 180;
      setResizingNodeId(nodeId);
      setResizeStart({
        width: targetNode.width || defaultW,
        height: targetNode.height || defaultH,
        mouseX: mouseCanvas.x,
        mouseY: mouseCanvas.y,
      });
    }
  };

  // Start connection drawing
  const handleStartConnector = (
    nodeId: string,
    handle: 'top' | 'right' | 'bottom' | 'left',
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    setIsConnecting(true);
    setConnectSource({ nodeId, handle });
    const mouseCanvas = screenToCanvas(e.clientX, e.clientY);
    setConnectMousePos(mouseCanvas);
  };

  // Drop connection target
  const handleConnectorDropTarget = (
    targetNodeId: string,
    targetHandle: 'top' | 'right' | 'bottom' | 'left'
  ) => {
    if (connectSource && connectSource.nodeId !== targetNodeId) {
      // Create new connector
      const newConnector: Connector = {
        id: `conn-${Date.now()}`,
        sourceId: connectSource.nodeId,
        targetId: targetNodeId,
        sourceHandle: connectSource.handle,
        targetHandle: targetHandle,
        type: 'dependency',
        label: 'Linked',
      };
      onAddConnector(newConnector);
    }
    setIsConnecting(false);
    setConnectSource(null);
  };

  // Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = 1.08;
    const newZoom = e.deltaY < 0 ? zoom * zoomFactor : zoom / zoomFactor;
    // Bound zoom between 0.35 and 2.5
    const boundedZoom = Math.min(Math.max(newZoom, 0.35), 2.5);

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const newPanX = mouseX - ((mouseX - pan.x) / zoom) * boundedZoom;
      const newPanY = mouseY - ((mouseY - pan.y) / zoom) * boundedZoom;

      onPanZoomChange({ x: newPanX, y: newPanY }, boundedZoom);
    }
  };

  // Drag and Drop from Organizer Sidebar
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const itemDataStr = e.dataTransfer.getData('application/json');
    if (!itemDataStr) return;

    try {
      const item: OrganizerItem = JSON.parse(itemDataStr);
      const canvasPos = screenToCanvas(e.clientX, e.clientY);
      let posX = canvasPos.x;
      let posY = canvasPos.y;

      if (snapToGrid) {
        posX = Math.round(posX / 20) * 20;
        posY = Math.round(posY / 20) * 20;
      }

      const newNode: CanvasNode = {
        id: `node-${Date.now()}`,
        serialNumber: getNextBoardNodeSerialNumber(item.type, nodes, boardIndex),
        title: item.name,
        type: item.type as NodeType,
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

      onAddNode(newNode);
      onSelectNode(newNode.id);
    } catch (err) {
      console.error('Failed to parse dropped item', err);
    }
  };

  // Fit View / Center
  const handleFitView = () => {
    if (nodes.length === 0) {
      onPanZoomChange({ x: 50, y: 50 }, 1);
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach((n) => {
      const w = n.width || 270;
      const h = n.type === 'kanban' ? 260 : 160;
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + w);
      maxY = Math.max(maxY, n.y + h);
    });

    const padding = 100;
    const contentW = maxX - minX + padding * 2;
    const contentH = maxY - minY + padding * 2;

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const scaleX = rect.width / contentW;
      const scaleY = rect.height / contentH;
      const fitZoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.4), 1.2);

      const centerPanX = (rect.width - (maxX + minX) * fitZoom) / 2;
      const centerPanY = (rect.height - (maxY + minY) * fitZoom) / 2;

      onPanZoomChange({ x: centerPanX, y: centerPanY }, fitZoom);
    }
  };

  // Keyboard Delete / Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) {
        onDeleteNode(selectedNodeId);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedConnectorId) {
        onDeleteConnector(selectedConnectorId);
        setEditingConnector(null);
      } else if (e.key === 'Escape') {
        onSelectNode(null);
        onSelectConnector(null);
        setEditingConnector(null);
        setShowColorPalette(false);
        setShowFontSizePicker(false);
        setShowClearConfirm(false);
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) {
          onRedo?.();
        } else {
          onUndo?.();
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        onRedo?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, selectedConnectorId, onDeleteNode, onDeleteConnector, onSelectNode, onSelectConnector, onUndo, onRedo]);

  // Quick Nodes additions
  const addStickyNote = () => {
    const center = screenToCanvas(window.innerWidth / 2, window.innerHeight / 2);
    const newNote: CanvasNode = {
      id: `note-${Date.now()}`,
      serialNumber: getNextBoardNodeSerialNumber('note', nodes, boardIndex),
      title: 'Workflow Note',
      type: 'note',
      x: Math.round(center.x / 20) * 20,
      y: Math.round(center.y / 20) * 20,
      width: 250,
      status: 'idle',
      noteColor: 'yellow',
      noteContent: 'Specify key architectural invariants, run orders, or team handoff criteria here.',
    };
    onAddNode(newNote);
    onSelectNode(newNote.id);
  };

  const addKanbanElement = () => {
    const center = screenToCanvas(window.innerWidth / 2, window.innerHeight / 2);
    const newKanban: CanvasNode = {
      id: `kanban-${Date.now()}`,
      serialNumber: getNextBoardNodeSerialNumber('kanban', nodes, boardIndex),
      title: 'Sprint Deliverables',
      type: 'kanban',
      x: Math.round(center.x / 20) * 20,
      y: Math.round(center.y / 20) * 20,
      width: 680,
      status: 'idle',
      kanbanColumns: [
        { id: `c-backlog-${Date.now()}`, title: 'To Do', cards: [{ id: 'k-1', title: 'Verify failover cluster', tag: 'Infra', priority: 'high', assignee: 'Alex' }] },
        { id: `c-progress-${Date.now()}`, title: 'In Progress', cards: [{ id: 'k-2', title: 'Review API gateway routes', tag: 'API', priority: 'medium', assignee: 'Dev' }] },
        { id: `c-done-${Date.now()}`, title: 'Completed', cards: [{ id: 'k-3', title: 'Rotate secrets in staging', tag: 'Security', priority: 'low', assignee: 'Ops' }] },
      ],
    };
    onAddNode(newKanban);
    onSelectNode(newKanban.id);
  };

  // Helper to generate bezier path between handles
  const computeBezierPath = (
    p1: { x: number; y: number },
    h1: 'top' | 'right' | 'bottom' | 'left',
    p2: { x: number; y: number },
    h2: 'top' | 'right' | 'bottom' | 'left'
  ) => {
    const dx = Math.abs(p2.x - p1.x) * 0.5;
    const dy = Math.abs(p2.y - p1.y) * 0.5;

    let c1x = p1.x;
    let c1y = p1.y;
    let c2x = p2.x;
    let c2y = p2.y;

    if (h1 === 'right') c1x += Math.max(dx, 40);
    else if (h1 === 'left') c1x -= Math.max(dx, 40);
    else if (h1 === 'bottom') c1y += Math.max(dy, 40);
    else if (h1 === 'top') c1y -= Math.max(dy, 40);

    if (h2 === 'right') c2x += Math.max(dx, 40);
    else if (h2 === 'left') c2x -= Math.max(dx, 40);
    else if (h2 === 'bottom') c2y += Math.max(dy, 40);
    else if (h2 === 'top') c2y -= Math.max(dy, 40);

    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;

    return {
      d: `M ${p1.x} ${p1.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`,
      midX,
      midY,
    };
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{ backgroundColor: canvasBgColor || undefined }}
      className="flex-1 h-full w-full relative overflow-hidden bg-slate-100/70 dark:bg-slate-950 canvas-grid-dots cursor-default select-none transition-colors duration-200"
    >
      {/* Visual Transform Layer */}
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
        className="absolute inset-0 pointer-events-none"
      >
        {/* Visual Group Boundaries Layer */}
        {groups.map((grp, gIdx) => (
          <div
            key={`${grp.id}-${gIdx}`}
            style={{
              transform: `translate(${grp.x}px, ${grp.y}px)`,
              width: `${grp.width}px`,
              height: `${grp.height}px`,
              borderColor: grp.color,
              backgroundColor: `${grp.color}0D`,
            }}
            className="absolute pointer-events-none rounded-2xl border-2 border-dashed transition-all"
          >
            {/* Distinct Group Header Pill */}
            <div className="absolute -top-3.5 left-4 flex items-center gap-1.5 shadow-sm">
              <div
                style={{
                  backgroundColor: grp.color,
                }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-md text-[#F8EBE8] text-[11px] font-bold tracking-wide uppercase shadow-xs"
              >
                <Layers className="w-3 h-3 text-[#F8EBE8]" />
                <span>{grp.title}</span>
              </div>
              {grp.description && (
                <span
                  style={{
                    backgroundColor: `${grp.color}25`,
                    color: grp.color,
                    borderColor: `${grp.color}40`,
                  }}
                  className="px-2 py-0.5 rounded text-[10px] font-semibold border backdrop-blur-xs hidden md:inline-block"
                >
                  {grp.description}
                </span>
              )}
            </div>
          </div>
        ))}

        {/* SVG Connectors Layer */}
        <svg
          className="absolute inset-0 overflow-visible pointer-events-auto"
          style={{ width: '100%', height: '100%' }}
        >
          <defs>
            {/* Markers for relationship line arrowheads */}
            <marker
              id="arrow-dependency"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#C61B31" />
            </marker>

            <marker
              id="arrow-dataflow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#3B5D37" />
            </marker>

            <marker
              id="arrow-trigger"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#DF9C56" />
            </marker>

            <marker
              id="arrow-reference"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#709654" />
            </marker>
          </defs>

          {/* Render All Connectors */}
          {connectors.map((conn, idx) => {
            const sourceNode = nodes.find((n) => n.id === conn.sourceId);
            const targetNode = nodes.find((n) => n.id === conn.targetId);
            if (!sourceNode || !targetNode) return null;

            const p1 = getHandlePosition(sourceNode, conn.sourceHandle || 'right');
            const p2 = getHandlePosition(targetNode, conn.targetHandle || 'left');
            const pathInfo = computeBezierPath(p1, conn.sourceHandle || 'right', p2, conn.targetHandle || 'left');
            const isSelected = conn.id === selectedConnectorId;

            let strokeColor = '#C61B31'; // Dusk
            let strokeDash = '';
            let marker = 'url(#arrow-dependency)';

            if (conn.type === 'data_flow') {
              strokeColor = '#3B5D37'; // Mint
              strokeDash = '6,4';
              marker = 'url(#arrow-dataflow)';
            } else if (conn.type === 'trigger') {
              strokeColor = '#DF9C56'; // Spring
              strokeDash = '4,4';
              marker = 'url(#arrow-trigger)';
            } else if (conn.type === 'reference') {
              strokeColor = '#709654'; // Toasted
              strokeDash = '2,4';
              marker = 'url(#arrow-reference)';
            }

            return (
              <g key={`${conn.id}-${idx}`} className="cursor-pointer group/line">
                {/* Fat invisible hit area */}
                <path
                  d={pathInfo.d}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="20"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectConnector(conn.id);
                    onSelectNode(null);
                    setEditingConnector(conn);
                  }}
                />

                {/* Visible Connector line */}
                <path
                  d={pathInfo.d}
                  fill="none"
                  stroke={isSelected ? '#871201' : strokeColor}
                  strokeWidth={isSelected ? '3.5' : '2'}
                  strokeDasharray={strokeDash}
                  markerEnd={marker}
                  className={conn.type === 'data_flow' ? 'animate-pulse' : ''}
                />

                {/* Midpoint Label pill */}
                {conn.label && (
                  <foreignObject
                    x={pathInfo.midX - 60}
                    y={pathInfo.midY - 12}
                    width="120"
                    height="24"
                    className="overflow-visible pointer-events-auto"
                  >
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectConnector(conn.id);
                        setEditingConnector(conn);
                      }}
                      className={`text-center text-[10px] font-medium py-0.5 px-2 rounded-md shadow-2xs border truncate transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#871201] text-[#F8EBE8] border-[#871201]'
                          : 'bg-[#F8EBE8] dark:bg-[#1F3E22] text-[#1F3E22] dark:text-[#F8EBE8] border-[#709654]/40 hover:border-[#DF9C56]'
                      }`}
                    >
                      {conn.label}
                    </div>
                  </foreignObject>
                )}
              </g>
            );
          })}

          {/* Live Drawing Connector */}
          {isConnecting && connectSource && (
            (() => {
              const srcNode = nodes.find((n) => n.id === connectSource.nodeId);
              if (!srcNode) return null;
              const p1 = getHandlePosition(srcNode, connectSource.handle);
              const p2 = connectMousePos;
              const path = computeBezierPath(p1, connectSource.handle, p2, 'left');

              return (
                <path
                  d={path.d}
                  fill="none"
                  stroke="#DF9C56"
                  strokeWidth="2.5"
                  strokeDasharray="4,4"
                  className="animate-pulse"
                />
              );
            })()
          )}
        </svg>

        {/* Nodes Layer */}
        <div className="absolute inset-0 pointer-events-auto">
          {nodes.map((node, index) => (
            <CanvasNodeComponent
              key={`${node.id || 'node'}-${index}`}
              node={node}
              isSelected={node.id === selectedNodeId}
              onSelect={(id, e) => {
                e.stopPropagation();
                if (connectingFromNodeId && connectingFromNodeId !== id) {
                  onAddConnector({
                    id: `conn-${Date.now()}`,
                    sourceId: connectingFromNodeId,
                    targetId: id,
                    sourceHandle: 'right',
                    targetHandle: 'left',
                    type: 'dependency',
                    label: 'Dependency',
                  });
                  onCancelConnecting?.();
                  return;
                }
                onSelectNode(id);
                onSelectConnector(null);
                setEditingConnector(null);
              }}
              onStartDrag={handleStartNodeDrag}
              onStartConnector={handleStartConnector}
              onConnectorDropTarget={handleConnectorDropTarget}
              onUpdateNode={onUpdateNode}
              onRunNode={onRunNode}
              onOpenInspector={onOpenInspector}
              onDeleteNode={onDeleteNode}
              onStartResize={handleStartResizeNode}
            />
          ))}
        </div>
      </div>

      {/* Linking Mode Floating Guide */}
      {connectingFromNodeId && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2 bg-[#871201] text-white rounded-xl shadow-2xl border-2 border-white/20 select-none">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span className="text-xs font-bold">
            Linking mode active: Click any other item to connect them
          </span>
          <button
            onClick={onCancelConnecting}
            className="px-2.5 py-1 text-[11px] bg-white/20 hover:bg-white/30 rounded-lg font-bold transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Empty State Banner when canvas has no windows */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10 p-6">
          <div className="p-6 rounded-2xl bg-white/85 dark:bg-[#182E1A]/85 border border-[#709654]/40 dark:border-[#3B5D37]/70 backdrop-blur-md flex flex-col items-center gap-3 max-w-sm text-center shadow-lg animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-xl bg-[#3B5D37]/15 dark:bg-[#AFD1C2]/15 text-[#3B5D37] dark:text-[#AFD1C2] flex items-center justify-center font-bold shadow-xs">
              <Plus className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#1F3E22] dark:text-[#F8EBE8]">
                Blank Canvas Ready
              </h4>
              <p className="text-xs text-[#1F3E22]/70 dark:text-[#AFD1C2]/80 mt-1 leading-relaxed">
                Drag items from the left organizer or click <span className="font-semibold text-[#3B5D37] dark:text-[#AFD1C2]">+ Add Node</span> in the top header to place windows on the canvas.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Floating Canvas Controls Dock */}
      <div 
        style={{ backgroundColor: '#ffffff' }}
        className="absolute bottom-4 left-4 z-40 flex items-center gap-1.5 p-1.5 backdrop-blur-md rounded-xl border border-[#709654]/30 dark:border-[#3B5D37] shadow-xl text-[#1F3E22] dark:text-[#F8EBE8] select-none overflow-visible"
      >
        {/* Undo & Redo Controls */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`p-1.5 rounded-lg transition-colors ${
            canUndo
              ? 'hover:bg-[#709654]/15 text-[#1F3E22] dark:text-[#F8EBE8]'
              : 'opacity-30 cursor-not-allowed text-[#709654]'
          }`}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={`p-1.5 rounded-lg transition-colors ${
            canRedo
              ? 'hover:bg-[#709654]/15 text-[#1F3E22] dark:text-[#F8EBE8]'
              : 'opacity-30 cursor-not-allowed text-[#709654]'
          }`}
          title="Redo (Ctrl+Y / Cmd+Shift+Z)"
        >
          <Redo2 className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-[#709654]/30 mx-0.5" />

        {/* Zoom & View Controls */}
        <button
          onClick={() => onPanZoomChange(pan, Math.min(zoom * 1.15, 2.5))}
          className="p-1.5 hover:bg-[#709654]/15 rounded-lg transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPanZoomChange(pan, Math.max(zoom / 1.15, 0.35))}
          className="p-1.5 hover:bg-[#709654]/15 rounded-lg transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPanZoomChange({ x: 50, y: 50 }, 1)}
          className="px-2 py-1 text-xs font-mono hover:bg-[#709654]/15 rounded-lg transition-colors"
          title="Reset Zoom to 100%"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          onClick={handleFitView}
          className="p-1.5 hover:bg-[#709654]/15 rounded-lg transition-colors"
          title="Fit to Content"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-[#709654]/30 mx-0.5" />

        <button
          onClick={() => setSnapToGrid(!snapToGrid)}
          className={`p-1.5 rounded-lg transition-colors ${
            snapToGrid
              ? 'bg-[#3B5D37]/25 text-[#3B5D37] dark:text-[#AFD1C2] font-semibold'
              : 'hover:bg-[#709654]/15'
          }`}
          title={snapToGrid ? 'Snap to Grid: ON' : 'Snap to Grid: OFF'}
        >
          <Grid className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-[#709654]/30 mx-0.5" />

        {/* Quick Canvas Node Adders */}
        <button
          onClick={addStickyNote}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium hover:bg-[#DF9C56]/20 text-[#871201] dark:text-[#DF9C56] rounded-lg transition-colors"
          title="Add Note to Canvas"
        >
          <StickyNote className="w-3.5 h-3.5" />
          <span>+ Note</span>
        </button>

        <button
          onClick={addKanbanElement}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium hover:bg-[#709654]/20 text-[#3B5D37] dark:text-[#AFD1C2] rounded-lg transition-colors"
          title="Add Kanban Board to Canvas"
        >
          <Kanban className="w-3.5 h-3.5" />
          <span>+ Kanban</span>
        </button>

        {onArrangeNodesBySerial && (
          <button
            onClick={onArrangeNodesBySerial}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium hover:bg-[#709654]/20 text-[#1F3E22] dark:text-[#F8EBE8] rounded-lg transition-colors cursor-pointer"
            title="Auto-arrange canvas items sequentially by Serial Number (S/N)"
          >
            <ListOrdered className="w-3.5 h-3.5 text-[#DF9C56]" />
            <span className="hidden md:inline font-semibold">Arrange S/N</span>
          </button>
        )}

        <div className="w-px h-4 bg-[#709654]/30 mx-0.5" />

        {/* Colour Palette Selector for Canvas & Item */}
        <div className="relative">
          <button
            onClick={() => {
              setShowColorPalette((v) => !v);
              setShowFontSizePicker(false);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              showColorPalette
                ? 'bg-[#DF9C56]/30 text-[#871201] dark:text-[#DF9C56] font-bold'
                : 'hover:bg-[#709654]/15 text-[#1F3E22] dark:text-[#F8EBE8]'
            }`}
            title="Colour palette selector for Canvas & Selected Items"
          >
            <Palette className="w-3.5 h-3.5 text-[#DF9C56]" />
            <span
              className="w-2.5 h-2.5 rounded-full border border-black/25 shrink-0"
              style={{ backgroundColor: selectedNode?.customColor || canvasBgColor || '#F8EBE8' }}
            />
            <span className="hidden md:inline font-bold">Palette</span>
          </button>

          {/* Palette Popover */}
          {showColorPalette && (
            <>
              <div 
                className="fixed inset-0 z-50 cursor-default" 
                onClick={() => setShowColorPalette(false)} 
              />
              <div className="absolute bottom-full left-0 mb-2 p-3 bg-white dark:bg-[#182E1A] rounded-2xl border border-[#709654]/40 dark:border-[#3B5D37] shadow-2xl w-72 z-[60] text-xs space-y-3">
                <div className="flex items-center justify-between pb-1.5 border-b border-[#709654]/20 font-bold text-[#1F3E22] dark:text-[#F8EBE8]">
                  <span className="flex items-center gap-1.5">
                    <Palette className="w-4 h-4 text-[#DF9C56]" />
                    <span>Canvas & Item Colour Palette</span>
                  </span>
                  <button
                    onClick={() => setShowColorPalette(false)}
                    className="text-[#709654] hover:text-[#1F3E22] cursor-pointer p-0.5 rounded"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Section 1: Canvas Background Palette */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#1F3E22] dark:text-[#F8EBE8]">
                    <span>Canvas Background Palette:</span>
                    <label className="flex items-center gap-1 cursor-pointer text-[10px] text-[#3B5D37] dark:text-[#AFD1C2] hover:underline">
                      <span>Custom:</span>
                      <input
                        type="color"
                        value={canvasBgColor || '#F8EBE8'}
                        onChange={(e) => onChangeCanvasBgColor?.(e.target.value)}
                        className="w-4 h-4 rounded cursor-pointer border-0 p-0"
                        title="Pick custom canvas background color"
                      />
                    </label>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {CANVAS_BG_SWATCHES.map((swatch) => {
                      const isSelected = (canvasBgColor || '#F8EBE8').toLowerCase() === swatch.hex.toLowerCase();
                      return (
                        <button
                          key={swatch.hex}
                          onClick={() => onChangeCanvasBgColor?.(swatch.hex)}
                          style={{ backgroundColor: swatch.hex }}
                          className={`h-6 rounded-lg border flex items-center justify-center transition-all hover:scale-105 shadow-2xs cursor-pointer ${
                            isSelected
                              ? 'ring-2 ring-[#DF9C56] border-[#DF9C56] scale-105'
                              : 'border-black/15'
                          }`}
                          title={`Canvas Background: ${swatch.name}`}
                        >
                          {isSelected && (
                            <Check className={`w-3 h-3 ${['#FFFFFF', '#F8EBE8', '#F1F5F9', '#EBF5FF', '#F0FDF4', '#FEF3C7', '#F5F3FF'].includes(swatch.hex) ? 'text-black' : 'text-white'}`} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {canvasBgColor && (
                    <button
                      onClick={() => onChangeCanvasBgColor?.('')}
                      className="w-full text-[10px] text-[#709654] hover:text-[#1F3E22] dark:hover:text-[#F8EBE8] py-0.5 border border-[#709654]/30 rounded hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer font-medium"
                    >
                      Reset Canvas Theme to Default
                    </button>
                  )}
                </div>

                {/* Section 2: Selected Item Color Palette */}
                <div className="pt-2 border-t border-[#709654]/20 space-y-1.5">
                  <div className="text-[11px] font-bold text-[#1F3E22] dark:text-[#F8EBE8] flex items-center justify-between">
                    <span>Selected Item Fill Colour:</span>
                    {selectedNode && (
                      <span className="text-[10px] text-[#709654] dark:text-[#AFD1C2] truncate max-w-[100px] font-normal">
                        {selectedNode.title}
                      </span>
                    )}
                  </div>

                  {selectedNode ? (
                    <div className="space-y-1.5">
                      <div className="grid grid-cols-6 gap-1">
                        {COLOR_SWATCHES.map((swatch) => (
                          <button
                            key={swatch.hex}
                            onClick={() => {
                              onUpdateNode({ ...selectedNode, customColor: swatch.hex });
                            }}
                            style={{ backgroundColor: swatch.hex }}
                            className={`h-6 rounded-lg border flex items-center justify-center transition-transform hover:scale-110 shadow-2xs cursor-pointer ${
                              selectedNode.customColor === swatch.hex
                                ? 'ring-2 ring-black dark:ring-white scale-105'
                                : 'border-black/15'
                            }`}
                            title={`Item Fill: ${swatch.name}`}
                          >
                            {selectedNode.customColor === swatch.hex && (
                              <Check className={`w-3 h-3 ${['#FFFFFF', '#F8EBE8', '#AFD1C2'].includes(swatch.hex) ? 'text-black' : 'text-white'}`} />
                            )}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => {
                          onUpdateNode({ ...selectedNode, customColor: undefined });
                        }}
                        className="w-full py-0.5 text-[10px] font-semibold text-[#709654] hover:text-[#1F3E22] dark:hover:text-[#F8EBE8] hover:bg-black/5 rounded border border-[#709654]/30 transition-colors cursor-pointer"
                      >
                        Reset Item Color
                      </button>
                    </div>
                  ) : (
                    <p className="text-[10px] text-[#709654] dark:text-[#AFD1C2] italic py-0.5">
                      Click any block on the canvas to set its individual fill color.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Font Size for Selected Item */}
        <div className="relative">
          <button
            onClick={() => {
              setShowFontSizePicker((v) => !v);
              setShowColorPalette(false);
            }}
            className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              showFontSizePicker
                ? 'bg-[#DF9C56]/30 text-[#871201] font-bold'
                : selectedNode
                ? 'hover:bg-[#DF9C56]/20 text-[#871201] dark:text-[#DF9C56]'
                : 'hover:bg-[#709654]/15 text-[#709654]'
            }`}
            title="Font size for selected item"
          >
            <Type className="w-3.5 h-3.5" />
            <span className="font-mono text-[11px] font-bold">
              {selectedNode?.fontSize ? `${selectedNode.fontSize}px` : '14px'}
            </span>
          </button>

          {/* Font Size Popover */}
          {showFontSizePicker && (
            <>
              <div 
                className="fixed inset-0 z-50 cursor-default" 
                onClick={() => setShowFontSizePicker(false)} 
              />
              <div className="absolute bottom-full left-0 mb-2 p-3 bg-white dark:bg-[#182E1A] rounded-xl border border-[#709654]/40 dark:border-[#3B5D37] shadow-2xl w-56 z-[60] text-xs">
                <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-[#709654]/20 font-bold text-[#1F3E22] dark:text-[#F8EBE8]">
                  <span>Font Size</span>
                  <button
                    onClick={() => setShowFontSizePicker(false)}
                    className="text-[#709654] hover:text-[#1F3E22] cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>

                {selectedNode ? (
                  <div className="space-y-2">
                    <div className="text-[10px] text-[#709654] dark:text-[#AFD1C2] truncate">
                      Selected: <span className="font-semibold text-[#1F3E22] dark:text-[#F8EBE8]">{selectedNode.title}</span>
                    </div>
                    {/* Stepper */}
                    <div className="flex items-center justify-between bg-black/5 dark:bg-white/5 p-1 rounded-lg">
                      <button
                        onClick={() => {
                          const cur = selectedNode.fontSize || 14;
                          const next = Math.max(10, cur - 1);
                          onUpdateNode({ ...selectedNode, fontSize: next });
                        }}
                        className="px-2.5 py-1 bg-white dark:bg-[#152717] rounded shadow-2xs font-bold hover:bg-black/5 cursor-pointer"
                      >
                        A-
                      </button>
                      <span className="font-mono font-bold text-xs">
                        {selectedNode.fontSize || 14}px
                      </span>
                      <button
                        onClick={() => {
                          const cur = selectedNode.fontSize || 14;
                          const next = Math.min(28, cur + 1);
                          onUpdateNode({ ...selectedNode, fontSize: next });
                        }}
                        className="px-2.5 py-1 bg-white dark:bg-[#152717] rounded shadow-2xs font-bold hover:bg-black/5 cursor-pointer"
                      >
                        A+
                      </button>
                    </div>
                    {/* Presets */}
                    <div className="grid grid-cols-4 gap-1 pt-1">
                      {FONT_SIZES.map((sz) => (
                        <button
                          key={sz}
                          onClick={() => {
                            onUpdateNode({ ...selectedNode, fontSize: sz });
                          }}
                          className={`py-1 text-[11px] font-mono rounded border transition-colors cursor-pointer ${
                            (selectedNode.fontSize || 14) === sz
                              ? 'bg-[#3B5D37] text-white border-[#3B5D37] font-bold'
                              : 'border-black/10 dark:border-white/10 hover:bg-black/5'
                          }`}
                        >
                          {sz}px
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-[#709654] dark:text-[#AFD1C2] italic py-1">
                    Click an item on the canvas first to adjust its font size.
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        <div className="w-px h-4 bg-[#709654]/30 mx-0.5" />

        {/* Clear Canvas for Selected Canvas */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (nodes.length === 0 && connectors.length === 0) {
              setShowEmptyToast(true);
              setTimeout(() => setShowEmptyToast(false), 2000);
              return;
            }
            if (e.shiftKey) {
              onClearCanvas?.();
              setShowClearedToast(true);
              setTimeout(() => setShowClearedToast(false), 3500);
              return;
            }
            setShowClearConfirm(true);
          }}
          className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg transition-all active:scale-95 cursor-pointer ${
            nodes.length === 0 && connectors.length === 0
              ? 'text-[#709654]/60 hover:bg-[#709654]/10'
              : 'text-[#DB3A31] hover:bg-[#DB3A31]/15 hover:text-[#871201] font-semibold'
          }`}
          title={
            nodes.length === 0 && connectors.length === 0
              ? "Canvas is already empty"
              : "Clear all nodes and connectors from this canvas board (Shift+Click for instant clear)"
          }
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline font-semibold">Clear Canvas</span>
        </button>
      </div>

      {/* Clear Canvas Confirmation Modal */}
      {showClearConfirm && (
        <div 
          className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setShowClearConfirm(false)}
        >
          <div 
            className="bg-[#F8EBE8] dark:bg-[#1A331C] border-2 border-[#DB3A31] rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 text-[#DB3A31]">
              <div className="p-2 rounded-xl bg-[#DB3A31]/15 text-[#DB3A31]">
                <Trash2 className="w-5 h-5 shrink-0" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#1F3E22] dark:text-[#F8EBE8]">
                  Clear Active Canvas?
                </h3>
                {activeBoardName && (
                  <p className="text-[11px] text-[#709654] font-mono">
                    Board: {activeBoardName} ({nodes.length} nodes)
                  </p>
                )}
              </div>
            </div>
            <p className="text-xs text-[#709654] dark:text-[#AFD1C2] leading-relaxed">
              Are you sure you want to clear all nodes and relationship lines from this canvas? You can use the <strong>Undo</strong> button (Ctrl+Z) to restore them at any time.
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#709654]/20">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 text-[#1F3E22] dark:text-[#F8EBE8] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onClearCanvas?.();
                  setShowClearConfirm(false);
                  setShowClearedToast(true);
                  setTimeout(() => setShowClearedToast(false), 3500);
                }}
                className="px-4 py-1.5 text-xs font-bold rounded-xl bg-[#DB3A31] hover:bg-[#871201] text-white shadow-xs transition-colors cursor-pointer active:scale-95"
              >
                Confirm Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ephemeral Feedback Toast on Clear */}
      {showClearedToast && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-[250] flex items-center gap-2.5 px-4 py-2 bg-[#1F3E22] text-[#F8EBE8] rounded-xl shadow-2xl border border-[#709654]/40 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 duration-150 select-none">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>Active canvas cleared</span>
          {canUndo && onUndo && (
            <button
              onClick={() => {
                onUndo();
                setShowClearedToast(false);
              }}
              className="ml-2 px-2 py-0.5 rounded bg-[#DF9C56] text-[#871201] text-[10px] font-bold hover:bg-[#DF9C56]/80 cursor-pointer transition-transform active:scale-95"
            >
              Undo (Ctrl+Z)
            </button>
          )}
        </div>
      )}

      {/* Ephemeral Feedback Toast when already empty */}
      {showEmptyToast && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-[250] flex items-center gap-2 px-3 py-1.5 bg-[#1F3E22] text-[#F8EBE8] rounded-xl shadow-xl text-xs font-medium animate-in fade-in duration-150 select-none">
          <span>Active canvas is already empty</span>
        </div>
      )}

      {/* Selected Connector Inspector Modal / Popover */}
      {editingConnector && (
        <div className="absolute bottom-4 right-4 z-40 bg-[#F8EBE8] dark:bg-[#1F3E22] rounded-xl p-3 border border-[#709654]/35 dark:border-[#3B5D37] shadow-xl w-72 text-xs select-none">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#709654]/20">
            <span className="font-bold text-[#1F3E22] dark:text-[#F8EBE8]">
              Relationship Line
            </span>
            <button
              onClick={() => setEditingConnector(null)}
              className="text-[#709654] hover:text-[#1F3E22] dark:hover:text-[#F8EBE8]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            <div>
              <label className="text-[10px] uppercase font-semibold text-[#709654] dark:text-[#AFD1C2] block mb-1">
                Relationship Type
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {(['dependency', 'data_flow', 'trigger', 'reference'] as ConnectorType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      const updated = { ...editingConnector, type };
                      setEditingConnector(updated);
                      onUpdateConnector(updated);
                    }}
                    className={`px-2 py-1 text-[11px] rounded capitalize border transition-all text-left ${
                      editingConnector.type === type
                        ? 'border-[#871201] bg-[#DF9C56]/20 text-[#871201] dark:text-[#DF9C56] font-semibold'
                        : 'border-[#709654]/30 text-[#1F3E22]/80 dark:text-[#F8EBE8]/80'
                    }`}
                  >
                    {type.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-semibold text-[#709654] dark:text-[#AFD1C2] block mb-1">
                Label
              </label>
              <input
                type="text"
                value={editingConnector.label || ''}
                onChange={(e) => {
                  const updated = { ...editingConnector, label: e.target.value };
                  setEditingConnector(updated);
                  onUpdateConnector(updated);
                }}
                placeholder="Connection description..."
                className="w-full px-2.5 py-1.5 text-xs bg-[#EEDFD8] dark:bg-[#182E1A] border border-[#709654]/30 rounded-md focus:outline-none focus:border-[#DF9C56] text-[#1F3E22] dark:text-[#F8EBE8]"
              />
            </div>

            <div className="pt-2 border-t border-[#709654]/20 flex justify-end">
              <button
                onClick={() => {
                  onDeleteConnector(editingConnector.id);
                  setEditingConnector(null);
                }}
                className="flex items-center gap-1 px-2.5 py-1 text-[#DB3A31] hover:bg-[#DB3A31]/15 rounded transition-colors text-[11px]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Line</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
