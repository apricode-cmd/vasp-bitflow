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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './workflow-theme.css';

import { nodeTypes } from './nodes';
import { Button } from '@/components/ui/button';
import { Save, Play, Eye, AlertCircle, Maximize2, MousePointer2 } from 'lucide-react';
import { toast } from 'sonner';
import { compileWorkflow, validateWorkflowGraph } from '@/lib/workflows/compiler/graphToJsonLogic';
import { Alert, AlertDescription } from '@/components/ui/alert';

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

  // Handle node click
  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (onNodeClick && !readOnly) {
        onNodeClick(node);
      }
    },
    [onNodeClick, readOnly]
  );

  // Handle node double click for quick edit
  const handleNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (onNodeClick && !readOnly) {
        onNodeClick(node);
        toast.info('Editing node', { duration: 1000 });
      }
    },
    [onNodeClick, readOnly]
  );

  // Handle new connections
  const onConnect = useCallback(
    (connection: Connection) => {
      // Validate connection (basic rules)
      if (!connection.source || !connection.target) {
        return;
      }

      // Prevent self-connections
      if (connection.source === connection.target) {
        toast.error('Cannot connect a node to itself');
        return;
      }

      // Add edge
      setEdges((eds) => addEdge(connection, eds));
      toast.success('Connection created');
    },
    [setEdges]
  );

  // Handle drop from NodeToolbar
  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const data = event.dataTransfer.getData('application/reactflow');

      if (!data || !reactFlowBounds || !reactFlowInstance.current) return;

      const { nodeType, nodeData } = JSON.parse(data);
      const position = reactFlowInstance.current.screenToFlowPosition({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

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
        onInit={(instance) => {
          reactFlowInstance.current = instance;
          // Set initial zoom to 75% for better overview (like n8n)
          instance.setViewport({ x: 100, y: 100, zoom: 0.75 });
        }}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        fitView={false} // Disable auto-fit, use custom zoom
        snapToGrid
        snapGrid={[15, 15]}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
          style: { strokeWidth: 2 },
        }}
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
    </div>
  );
}

