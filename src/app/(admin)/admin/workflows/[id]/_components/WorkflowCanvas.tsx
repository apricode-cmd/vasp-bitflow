'use client';

/**
 * Workflow Canvas Component
 * 
 * Main React Flow canvas for visual workflow builder
 */

import { useCallback, useRef, DragEvent } from 'react';
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
import { Save, Play, Eye, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { compileWorkflow, validateWorkflowGraph } from '@/lib/workflows/compiler/graphToJsonLogic';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface WorkflowCanvasProps {
  workflowId: string;
  initialNodes?: Node[];
  initialEdges?: Edge[];
  onSave?: (nodes: Node[], edges: Edge[]) => void;
  onTest?: () => void;
  readOnly?: boolean;
}

export default function WorkflowCanvas({
  workflowId,
  initialNodes = [],
  initialEdges = [],
  onSave,
  onTest,
  readOnly = false,
}: WorkflowCanvasProps) {
  const { theme } = useTheme();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);
  
  const isDarkMode = theme === 'dark';

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

  return (
    <div ref={reactFlowWrapper} className="h-full w-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={(instance) => {
          reactFlowInstance.current = instance;
        }}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
          style: { strokeWidth: 2 },
        }}
        deleteKeyCode="Delete"
        selectionKeyCode="Shift"
        multiSelectionKeyCode="Shift"
        panOnScroll
        panOnDrag={[1, 2]} // Left + middle mouse button
        zoomOnScroll
        zoomOnDoubleClick
        minZoom={0.2}
        maxZoom={2}
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        nodesFocusable={!readOnly}
        edgesFocusable={!readOnly}
        elementsSelectable={!readOnly}
      >
        {/* Background with dots - like n8n */}
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="hsl(var(--border))"
          style={{ opacity: 0.4 }}
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
          <Panel position="top-right" className="space-x-2">
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

