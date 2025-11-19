'use client';

/**
 * Workflow Canvas Component
 * 
 * Main React Flow canvas for visual workflow builder
 */

import { useCallback, useRef, DragEvent, useEffect } from 'react';
import { useTheme } from 'next-themes';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  useKeyPress,
  type Connection,
  type Node,
  type Edge,
  BackgroundVariant,
  type ReactFlowInstance,
  getConnectedEdges,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './workflow-theme.css';

import { nodeTypes } from './nodes';
import { Button } from '@/components/ui/button';
import { Save, Play, Eye, AlertCircle, Maximize2, MousePointer2, Layout } from 'lucide-react';
import { toast } from 'sonner';
import { compileWorkflow, validateWorkflowGraph } from '@/lib/workflows/compiler/graphToJsonLogic';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ContextMenu, useContextMenu } from './ContextMenu';

interface WorkflowCanvasProps {
  workflowId: string;
  initialNodes?: Node[];
  initialEdges?: Edge[];
  onSave?: (nodes: Node[], edges: Edge[]) => void;
  onTest?: () => void;
  onNodeClick?: (node: Node) => void;
  onNodesChange?: (nodes: Node[]) => void;
  onEdgesChange?: (edges: Edge[]) => void;
  readOnly?: boolean;
}

export default function WorkflowCanvas({
  workflowId,
  initialNodes = [],
  initialEdges = [],
  onSave,
  onTest,
  onNodeClick,
  onNodesChange: onNodesChangeProp,
  onEdgesChange: onEdgesChangeProp,
  readOnly = false,
}: WorkflowCanvasProps) {
  const { theme } = useTheme();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);
  const { menu, showMenu, hideMenu } = useContextMenu();
  
  const isDarkMode = theme === 'dark';

  // Wrap onNodesChange to notify parent
  const handleNodesChange = useCallback(
    (changes: any) => {
      onNodesChange(changes);
      if (onNodesChangeProp) {
        // Get updated nodes after changes
        setTimeout(() => {
          if (reactFlowInstance.current) {
            onNodesChangeProp(reactFlowInstance.current.getNodes());
          }
        }, 0);
      }
    },
    [onNodesChange, onNodesChangeProp]
  );

  // Wrap onEdgesChange to notify parent
  const handleEdgesChange = useCallback(
    (changes: any) => {
      onEdgesChange(changes);
      if (onEdgesChangeProp) {
        // Get updated edges after changes
        setTimeout(() => {
          if (reactFlowInstance.current) {
            onEdgesChangeProp(reactFlowInstance.current.getEdges());
          }
        }, 0);
      }
    },
    [onEdgesChange, onEdgesChangeProp]
  );

  // Handle node click - DO NOT open properties on single click
  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      // Single click just selects the node, doesn't open properties
      // Properties open only on double-click or via context menu
    },
    [readOnly]
  );

  // Handle node double click - open properties
  const handleNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (onNodeClick && !readOnly) {
        onNodeClick(node);
        toast.info('Editing node properties', { duration: 1000 });
      }
    },
    [onNodeClick, readOnly]
  );

  // Validate connection before allowing
  const isValidConnection = useCallback(
    (connection: Connection) => {
      const sourceNode = nodes.find(n => n.id === connection.source);
      const targetNode = nodes.find(n => n.id === connection.target);

      if (!sourceNode || !targetNode) return false;

      // Prevent self-connections
      if (connection.source === connection.target) return false;

      // Trigger nodes cannot be targets (must be at start)
      if (targetNode.type === 'trigger') return false;

      // Check for existing connection
      const existingEdge = edges.find(
        e => e.source === connection.source && 
             e.target === connection.target &&
             e.sourceHandle === connection.sourceHandle &&
             e.targetHandle === connection.targetHandle
      );
      if (existingEdge) return false;

      // Prevent cycles (simple check - walk backwards from target)
      const hasCycle = (targetId: string, visited = new Set<string>()): boolean => {
        if (visited.has(targetId)) return true;
        visited.add(targetId);

        const incomingEdges = edges.filter(e => e.target === targetId);
        for (const edge of incomingEdges) {
          if (edge.source === connection.target) return true; // Would create cycle
          if (hasCycle(edge.source, visited)) return true;
        }
        return false;
      };

      if (hasCycle(targetNode.id)) return false;

      return true;
    },
    [nodes, edges]
  );

  // Handle new connections
  const onConnect = useCallback(
    (connection: Connection) => {
      // Validate connection
      if (!connection.source || !connection.target) {
        return;
      }

      if (connection.source === connection.target) {
        toast.error('Cannot connect a node to itself');
        return;
      }

      if (!isValidConnection(connection)) {
        toast.error('Invalid connection', {
          description: 'This connection would create a cycle or violate workflow rules',
        });
        return;
      }

      // Get source node type for styling
      const sourceNode = nodes.find(n => n.id === connection.source);
      const edgeType = sourceNode?.type === 'condition' ? 'smoothstep' : 'default';
      
      // Determine edge color based on handle and node type
      let edgeColor = '#94a3b8'; // Default gray
      if (sourceNode?.type === 'trigger') edgeColor = '#60a5fa'; // Blue
      else if (sourceNode?.type === 'condition') {
        // Condition edges: green for true, red for false
        edgeColor = connection.sourceHandle === 'true' ? '#34d399' : '#f87171';
      }
      else if (sourceNode?.type === 'action') edgeColor = '#a3a3a3'; // Light gray

      // Add edge with styling (thicker and clearer)
      const newEdge = {
        ...connection,
        type: edgeType,
        animated: sourceNode?.type === 'trigger',
        style: { 
          strokeWidth: 3.5,
          stroke: edgeColor,
        },
        markerEnd: {
          type: 'arrowclosed' as const,
          color: edgeColor,
          width: 22,
          height: 22,
        },
      };

      setEdges((eds) => addEdge(newEdge, eds));
      toast.success('Connection created');
    },
    [setEdges, isValidConnection, nodes]
  );

  // Handle drop from NodeToolbar
  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const data = event.dataTransfer.getData('application/reactflow');

      if (!data || !reactFlowBounds || !reactFlowInstance.current) return;

      const { nodeType, nodeData } = JSON.parse(data);
      
      // Get accurate position in flow coordinates
      let position = reactFlowInstance.current.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // If this is the first node, place it in the center of the viewport
      if (nodes.length === 0) {
        const viewport = reactFlowInstance.current.getViewport();
        const { innerWidth, innerHeight } = window;
        
        // Calculate center of visible area
        const centerX = (innerWidth / 2 - viewport.x) / viewport.zoom;
        const centerY = (innerHeight / 2 - viewport.y) / viewport.zoom;
        
        position = { x: centerX - 140, y: centerY - 75 };
      } else {
        // Regular drop - center under cursor
        position = {
          x: position.x - 140, // Center node horizontally (280px width / 2)
          y: position.y - 75,  // Center node vertically (150px height / 2)
        };
      }

      const newNode: Node = {
        id: `${nodeType}-${Date.now()}`,
        type: nodeType,
        position,
        data: nodeData,
      };

      setNodes((nds) => nds.concat(newNode));
      toast.success('Node added');
    },
    [reactFlowInstance, setNodes]
  );

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle save with validation and compilation
  const handleSave = useCallback(() => {
    // Validate graph
    const validation = validateWorkflowGraph(nodes, edges);
    
    if (!validation.valid) {
      toast.error('Cannot save workflow', {
        description: validation.errors[0],
      });
      return;
    }

    try {
      // Compile to json-logic
      const jsonLogic = compileWorkflow(nodes, edges);
      
      if (onSave) {
        // Pass both visual state and compiled logic
        onSave(nodes, edges);
        toast.success('Workflow saved and compiled');
      }
    } catch (error) {
      toast.error('Compilation failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [nodes, edges, onSave]);

  // Handle test
  const handleTest = useCallback(() => {
    if (onTest) {
      onTest();
    }
  }, [onTest]);

  // Auto-fit view when nodes are first added to empty canvas
  useEffect(() => {
    if (nodes.length === 1 && reactFlowInstance.current) {
      // First node added - center it
      setTimeout(() => {
        reactFlowInstance.current?.fitView({ 
          padding: 0.3,
          minZoom: 0.5,
          maxZoom: 1,
          duration: 300,
        });
      }, 100);
    }
  }, [nodes.length]);

  // Handle select all nodes (Ctrl+A / Cmd+A)
  const selectAllPressed = useKeyPress(['Meta+a', 'Control+a']);
  
  useEffect(() => {
    if (selectAllPressed && !readOnly) {
      setNodes((nds) =>
        nds.map((node) => ({
          ...node,
          selected: true,
        }))
      );
    }
  }, [selectAllPressed, setNodes, readOnly]);

  // Handle select all manually
  const handleSelectAll = useCallback(() => {
    if (!readOnly) {
      setNodes((nds) =>
        nds.map((node) => ({
          ...node,
          selected: true,
        }))
      );
      toast.success('All nodes selected');
    }
  }, [setNodes, readOnly]);

  // Handle fit view
  const handleFitView = useCallback(() => {
    if (reactFlowInstance.current) {
      reactFlowInstance.current.fitView({ padding: 0.2 });
      toast.success('View fitted');
    }
  }, []);

  // Alignment functions (defined BEFORE handleContextMenuAction)
  const alignNodesHorizontally = useCallback((alignment: 'left' | 'center' | 'right') => {
    const selectedNodes = nodes.filter(n => n.selected);
    if (selectedNodes.length < 2) {
      toast.error('Select at least 2 nodes to align');
      return;
    }

    const positions = selectedNodes.map(n => n.position.x + (n.width || 280) / 2);
    let targetX: number;

    switch (alignment) {
      case 'left':
        targetX = Math.min(...selectedNodes.map(n => n.position.x));
        break;
      case 'center':
        targetX = (Math.max(...positions) + Math.min(...positions)) / 2;
        break;
      case 'right':
        targetX = Math.max(...selectedNodes.map(n => n.position.x + (n.width || 280)));
        break;
    }

    setNodes((nds) =>
      nds.map((node) => {
        if (node.selected) {
          return {
            ...node,
            position: {
              ...node.position,
              x: alignment === 'left' ? targetX : 
                 alignment === 'center' ? targetX - (node.width || 280) / 2 :
                 targetX - (node.width || 280),
            },
          };
        }
        return node;
      })
    );
    toast.success(`Nodes aligned ${alignment}`);
  }, [nodes, setNodes]);

  const alignNodesVertically = useCallback((alignment: 'top' | 'middle' | 'bottom') => {
    const selectedNodes = nodes.filter(n => n.selected);
    if (selectedNodes.length < 2) {
      toast.error('Select at least 2 nodes to align');
      return;
    }

    const positions = selectedNodes.map(n => n.position.y + (n.height || 150) / 2);
    let targetY: number;

    switch (alignment) {
      case 'top':
        targetY = Math.min(...selectedNodes.map(n => n.position.y));
        break;
      case 'middle':
        targetY = (Math.max(...positions) + Math.min(...positions)) / 2;
        break;
      case 'bottom':
        targetY = Math.max(...selectedNodes.map(n => n.position.y + (n.height || 150)));
        break;
    }

    setNodes((nds) =>
      nds.map((node) => {
        if (node.selected) {
          return {
            ...node,
            position: {
              ...node.position,
              y: alignment === 'top' ? targetY :
                 alignment === 'middle' ? targetY - (node.height || 150) / 2 :
                 targetY - (node.height || 150),
            },
          };
        }
        return node;
      })
    );
    toast.success(`Nodes aligned ${alignment}`);
  }, [nodes, setNodes]);

  // Handle context menu actions
  const handleContextMenuAction = useCallback((action: string, data?: any) => {
    switch (action) {
      case 'edit':
        // Open properties panel
        if (data && onNodeClick && !readOnly) {
          onNodeClick(data);
          toast.info('Opening node properties', { duration: 1000 });
        }
        break;
      
      case 'duplicate':
        if (data && !readOnly) {
          const newNode: Node = {
            ...data,
            id: `${data.type}-${Date.now()}`,
            position: {
              x: data.position.x + 50,
              y: data.position.y + 50,
            },
            selected: false,
          };
          setNodes((nds) => [...nds, newNode]);
          toast.success('Node duplicated');
        }
        break;
      
      case 'copy':
        // Copy node to clipboard (browser clipboard API)
        if (data && !readOnly) {
          try {
            const nodeCopy = JSON.stringify({
              type: data.type,
              data: data.data,
            });
            navigator.clipboard.writeText(nodeCopy);
            toast.success('Node copied to clipboard');
          } catch (error) {
            toast.error('Failed to copy node');
          }
        }
        break;
      
      case 'paste':
        // Paste from clipboard
        if (!readOnly) {
          try {
            navigator.clipboard.readText().then((text) => {
              const { type, data: nodeData } = JSON.parse(text);
              const newNode: Node = {
                id: `${type}-${Date.now()}`,
                type,
                position: { x: 100, y: 100 }, // Default position
                data: nodeData,
              };
              setNodes((nds) => [...nds, newNode]);
              toast.success('Node pasted');
            });
          } catch (error) {
            toast.error('Nothing to paste or invalid data');
          }
        }
        break;
      
      case 'disable':
        if (data && !readOnly) {
          setNodes((nds) =>
            nds.map((n) =>
              n.id === data.id
                ? { ...n, data: { ...n.data, disabled: !n.data?.disabled } }
                : n
            )
          );
          toast.success(data.data?.disabled ? 'Node enabled' : 'Node disabled');
        }
        break;
      
      case 'delete':
        if (data && !readOnly) {
          setNodes((nds) => nds.filter((n) => n.id !== data.id));
          setEdges((eds) => eds.filter((e) => e.source !== data.id && e.target !== data.id));
          toast.success('Node deleted');
        }
        break;
      
      case 'deleteEdge':
        if (data && !readOnly) {
          setEdges((eds) => eds.filter((e) => e.id !== data.id));
          toast.success('Connection deleted');
        }
        break;
      
      case 'editEdge':
        if (data && !readOnly) {
          // TODO: Implement edge label editing
          toast.info('Edge editing coming soon');
        }
        break;
      
      case 'fitView':
        handleFitView();
        break;
      
      case 'autoLayout':
        // TODO: Implement auto-layout with Dagre
        toast.info('Auto-layout coming soon');
        break;
      
      case 'alignLeft':
      case 'alignCenter':
      case 'alignRight':
        if (!readOnly) {
          alignNodesHorizontally(action.replace('align', '').toLowerCase() as 'left' | 'center' | 'right');
        }
        break;
      
      case 'alignTop':
      case 'alignMiddle':
      case 'alignBottom':
        if (!readOnly) {
          alignNodesVertically(action.replace('align', '').toLowerCase() as 'top' | 'middle' | 'bottom');
        }
        break;
      
      default:
        console.log('Unknown action:', action);
    }
  }, [onNodeClick, setNodes, setEdges, handleFitView, alignNodesHorizontally, alignNodesVertically, readOnly]);

  // Handle context menu
  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (!readOnly) {
        showMenu(event, 'node', node);
      }
    },
    [showMenu, readOnly]
  );

  const handleEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      if (!readOnly) {
        showMenu(event, 'edge', edge);
      }
    },
    [showMenu, readOnly]
  );

  const handlePaneContextMenu = useCallback(
    (event: React.MouseEvent | MouseEvent) => {
      if (!readOnly) {
        showMenu(event as React.MouseEvent, 'canvas');
      }
    },
    [showMenu, readOnly]
  );

  return (
    <div ref={reactFlowWrapper} className="h-full w-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        onNodeContextMenu={handleNodeContextMenu}
        onEdgeContextMenu={handleEdgeContextMenu}
        onPaneContextMenu={handlePaneContextMenu}
        onInit={(instance) => {
          reactFlowInstance.current = instance;
          
          // If there are nodes, fit them to view with padding
          if (initialNodes.length > 0) {
            setTimeout(() => {
              instance.fitView({ 
                padding: 0.2,
                minZoom: 0.5,
                maxZoom: 1,
                duration: 300,
              });
            }, 50);
          } else {
            // Set initial zoom to 75% for empty canvas
            instance.setViewport({ x: 100, y: 100, zoom: 0.75 });
          }
        }}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        fitView={false} // Disable auto-fit, use custom zoom
        snapToGrid
        snapGrid={[15, 15]}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false,
          style: { strokeWidth: 3.5 },
          markerEnd: {
            type: 'arrowclosed',
            width: 22,
            height: 22,
          },
        }}
        connectionLineStyle={{
          strokeWidth: 3.5,
          stroke: '#94a3b8',
          strokeDasharray: '5 5',
        }}
        connectionLineType={'smoothstep' as any}
        isValidConnection={isValidConnection as any}
        defaultViewport={{ x: 100, y: 100, zoom: 0.75 }}
        deleteKeyCode="Delete"
        selectionKeyCode="Shift"
        multiSelectionKeyCode="Shift"
        panOnScroll
        panOnDrag={[1, 2]} // Left + middle mouse button
        zoomOnScroll
        zoomOnDoubleClick
        minZoom={0.1}
        maxZoom={2}
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        nodesFocusable={!readOnly}
        edgesFocusable={!readOnly}
        elementsSelectable={!readOnly}
        selectNodesOnDrag={false} // Better UX: don't select when dragging
      >
        {/* Background with dots - like n8n */}
        <Background
          variant={BackgroundVariant.Dots}
          gap={16}
          size={1.5}
          color={isDarkMode ? '#475569' : '#cbd5e1'}
          style={{ opacity: 0.6 }}
        />

        {/* Controls */}
        <Controls
          showZoom
          showFitView
          showInteractive
          position="bottom-left"
        />

        {/* Mini Map */}
        <MiniMap
          nodeColor={(node) => {
            switch (node.type) {
              case 'trigger':
                return isDarkMode ? '#60a5fa' : '#3b82f6';
              case 'condition':
                return isDarkMode ? '#fbbf24' : '#f59e0b';
              case 'action':
                return isDarkMode ? '#34d399' : '#10b981';
              default:
                return isDarkMode ? '#9ca3af' : '#6b7280';
            }
          }}
          maskColor={isDarkMode ? 'rgba(15, 23, 42, 0.7)' : 'rgba(255, 255, 255, 0.7)'}
          position="bottom-right"
          pannable
          zoomable
          className="!bg-background/95 !border !border-border !rounded-lg !shadow-lg"
        />

        {/* Top Panel (Toolbar) */}
        {!readOnly && (
          <Panel position="top-right" className="flex gap-2">
            <div className="flex gap-2 border-r pr-2">
              <Button
                onClick={handleSelectAll}
                variant="ghost"
                size="sm"
                title="Select All (Ctrl+A)"
                className="gap-2"
              >
                <MousePointer2 className="h-4 w-4" />
                Select All
              </Button>
              <Button
                onClick={handleFitView}
                variant="ghost"
                size="sm"
                title="Fit View"
                className="gap-2"
              >
                <Maximize2 className="h-4 w-4" />
                Fit View
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleTest}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                Test
              </Button>
              <Button
                onClick={handleSave}
                size="sm"
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                Save
              </Button>
            </div>
          </Panel>
        )}

        {/* Read-only indicator */}
        {readOnly && (
          <Panel position="top-right">
            <div className="flex items-center gap-2 bg-muted text-foreground px-3 py-1.5 rounded-lg text-sm font-medium border shadow-sm">
              <Eye className="h-4 w-4" />
              Preview Mode
            </div>
          </Panel>
        )}

        {/* Stats Panel */}
        <Panel position="top-left" className="bg-background/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-md text-sm border border-border">
          <div className="flex items-center gap-4">
            <div>
              <span className="font-semibold text-foreground">{nodes.length}</span>
              <span className="text-muted-foreground ml-1">Nodes</span>
            </div>
            <div className="w-px h-4 bg-border" />
            <div>
              <span className="font-semibold text-foreground">{edges.length}</span>
              <span className="text-muted-foreground ml-1">Connections</span>
            </div>
          </div>
        </Panel>
      </ReactFlow>

      {/* Context Menu */}
      {menu.show && (
        <ContextMenu
          position={{ x: menu.x, y: menu.y }}
          type={menu.type}
          data={menu.data}
          onClick={handleContextMenuAction}
          onClose={hideMenu}
        />
      )}
    </div>
  );
}

