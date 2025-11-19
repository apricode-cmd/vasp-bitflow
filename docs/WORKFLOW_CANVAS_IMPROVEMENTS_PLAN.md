# Workflow Canvas Improvements Plan

## 📊 Current State Analysis

### ✅ What Works Well:
1. Basic drag & drop from NodeToolbar
2. Node connections via handles
3. Snap to grid (15x15)
4. Custom node types
5. Selection, delete, pan, zoom
6. MiniMap, Controls, Background

### ⚠️ Areas for Improvement:

## 🎯 Improvement Goals

### 1. **Smart Auto-Layout** 🧠
**Problem:** Nodes drop at cursor position, no automatic organization
**Solution:** 
- Auto-arrange nodes in logical flow (left-to-right)
- Vertical spacing based on branches
- Smart positioning for new dropped nodes
- "Organize Layout" button (Dagre/Elk algorithm)

### 2. **Better Connection UX** 🔗
**Problem:** Basic smooth-step edges, no validation hints
**Solution:**
- Connection validation before allowing
- Visual feedback on hover (valid/invalid handles)
- Smart edge routing (avoid node overlap)
- Connection types (success/error paths for conditions)
- Colored edges based on node types

### 3. **Enhanced Drag & Drop** 🎨
**Problem:** Simple drop, no preview or snap suggestions
**Solution:**
- Ghost preview while dragging
- Snap to existing connections (magnetic)
- Drop zones with visual hints
- Quick connect: drop ON node to auto-connect

### 4. **Node Positioning Helpers** 📐
**Problem:** Manual positioning only
**Solution:**
- Align nodes (left, center, right, top, middle, bottom)
- Distribute evenly (horizontal/vertical)
- Group nodes and move together
- Snap to other nodes for alignment
- Grid overlay toggle

### 5. **Connection Management** 🎯
**Problem:** Hard to manage many connections
**Solution:**
- Edge labels (condition results, order numbers)
- Bezier/Straight/Step edge types selector
- Edge bundling for parallel flows
- Connection ports (multiple outputs from condition)
- Delete edge on click (with confirmation)

### 6. **Visual Enhancements** 🎨
**Problem:** Basic visual style
**Solution:**
- Node shadows on hover/drag
- Animated connection creation
- Execution path highlighting
- Node badges (error/warning/info)
- Connection arrows more prominent

### 7. **Keyboard Shortcuts** ⌨️
**Problem:** Limited keyboard support
**Solution:**
- Delete: Remove selected (✅ exists)
- Ctrl+A: Select all (✅ exists)
- **NEW:**
  - Ctrl+D: Duplicate selected nodes
  - Ctrl+Z/Y: Undo/Redo
  - Ctrl+G: Group selection
  - Arrow keys: Nudge selected nodes
  - Space: Pan mode toggle
  - Ctrl+L: Auto-layout

### 8. **Context Menu** 🖱️
**Problem:** No right-click menu
**Solution:**
- Right-click on node: Edit, Delete, Duplicate, Copy, Disable
- Right-click on canvas: Paste, Auto-layout, Fit view
- Right-click on edge: Delete, Change type, Add label

### 9. **Multi-Node Operations** 🔲
**Problem:** Only single node editing
**Solution:**
- Box selection (Shift+Drag) ✅ exists
- Multi-select delete
- Bulk positioning
- Group/Ungroup
- Copy/Paste multiple nodes

### 10. **Connection Handles** 🎯
**Problem:** Small, hard to click handles
**Problem:** All nodes have single input/output
**Solution:**
- Larger handle hit areas
- **Condition nodes: Multiple outputs** (true/false/error)
- Handle labels on hover
- Directional indicators
- Magnetic snapping to nearby handles

---

## 🚀 Implementation Priority

### Phase 1: Quick Wins (Immediate) ⚡
1. ✅ Better edge styling (colors, arrows)
2. ✅ Hover effects on handles
3. ✅ Connection validation with visual feedback
4. ✅ Snap-to-connect for drop
5. ✅ Context menu (node + canvas)

### Phase 2: Advanced Features (Medium) 🎯
6. Auto-layout algorithm (Dagre)
7. Alignment tools (align, distribute)
8. Edge labels and types
9. Duplicate/Copy/Paste
10. Undo/Redo

### Phase 3: Polish (Nice to have) 💎
11. Node grouping
12. Execution path animation
13. Advanced edge routing
14. Minimap enhancements
15. Performance optimizations

---

## 🏗️ Technical Approach

### Libraries to Use:
- `@xyflow/react` (already integrated) ✅
- `dagre` or `elkjs` for auto-layout
- Custom React hooks for interactions
- CSS transitions for smooth UX

### Files to Modify:
- `WorkflowCanvas.tsx` - main logic
- `nodes/*.tsx` - handle positions, colors
- `workflow-theme.css` - visual polish
- New: `hooks/useAutoLayout.ts`
- New: `hooks/useContextMenu.ts`
- New: `hooks/useNodeAlignment.ts`

---

## 📝 Detailed Features

### 1. Smart Edge Colors
```typescript
const getEdgeStyle = (sourceType: string, targetType: string) => {
  if (sourceType === 'trigger') return { stroke: '#3b82f6' }; // Blue
  if (sourceType === 'condition') {
    // True path: green, False path: red
    return { stroke: '#10b981' };
  }
  if (sourceType === 'action') return { stroke: '#6b7280' }; // Gray
};
```

### 2. Condition Node Multiple Outputs
```typescript
// ConditionNode handles:
<Handle type="source" position={Position.Right} id="true" style={{ top: '30%' }} />
<Handle type="source" position={Position.Right} id="false" style={{ top: '70%' }} />
```

### 3. Connection Validation
```typescript
const isValidConnection = (connection: Connection) => {
  const sourceNode = nodes.find(n => n.id === connection.source);
  const targetNode = nodes.find(n => n.id === connection.target);
  
  // Trigger can only be first
  if (targetNode?.type === 'trigger') return false;
  
  // Prevent cycles
  if (hasCycle(nodes, edges, connection)) return false;
  
  return true;
};
```

### 4. Auto-Layout (Dagre)
```typescript
import dagre from 'dagre';

const getLayoutedElements = (nodes, edges) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: 'LR', ranksep: 100, nodesep: 50 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 280, height: 150 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  return nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - 140,
        y: nodeWithPosition.y - 75,
      },
    };
  });
};
```

---

## 🎨 Visual Examples

### Before:
- Basic connections
- Manual positioning
- No visual feedback
- Hard to connect nodes

### After:
- Smart auto-layout
- Magnetic connections
- Visual validation
- Context menus
- Color-coded edges
- Multiple outputs for conditions
- Smooth animations

---

**Start with Phase 1 for immediate impact! 🚀**

