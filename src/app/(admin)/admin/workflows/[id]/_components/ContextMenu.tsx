/**
 * Context Menu for Workflow Canvas
 * 
 * Right-click menu for nodes, edges, and canvas
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { type Node, type Edge, useReactFlow } from '@xyflow/react';
import {
  Copy,
  Trash2,
  Edit,
  Layout,
  Maximize2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  Clipboard,
  Power,
} from 'lucide-react';

interface ContextMenuProps {
  onClick: (action: string, data?: any) => void;
  onClose: () => void;
  position: { x: number; y: number };
  type: 'node' | 'edge' | 'canvas';
  data?: Node | Edge;
}

export function ContextMenu({ onClick, onClose, position, type, data }: ContextMenuProps) {
  useEffect(() => {
    const handleClickOutside = () => onClose();
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    // Delay to prevent immediate close from the right-click event
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 100);

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleItemClick = (action: string, itemData?: any) => {
    onClick(action, itemData);
    onClose();
  };

  // Node context menu
  if (type === 'node' && data) {
    return (
      <div
        className="fixed bg-popover border border-border rounded-lg shadow-lg py-1 z-50 min-w-[180px]"
        style={{ left: position.x, top: position.y }}
      >
        <MenuItem
          icon={Edit}
          label="Edit Properties"
          onClick={() => handleItemClick('edit', data)}
        />
        <MenuItem
          icon={Copy}
          label="Duplicate"
          onClick={() => handleItemClick('duplicate', data)}
          shortcut="Ctrl+D"
        />
        <MenuItem
          icon={Clipboard}
          label="Copy"
          onClick={() => handleItemClick('copy', data)}
          shortcut="Ctrl+C"
        />
        <MenuDivider />
        <MenuItem
          icon={Power}
          label="Disable"
          onClick={() => handleItemClick('disable', data)}
        />
        <MenuDivider />
        <MenuItem
          icon={Trash2}
          label="Delete"
          onClick={() => handleItemClick('delete', data)}
          shortcut="Del"
          danger
        />
      </div>
    );
  }

  // Edge context menu
  if (type === 'edge' && data) {
    return (
      <div
        className="fixed bg-popover border border-border rounded-lg shadow-lg py-1 z-50 min-w-[180px]"
        style={{ left: position.x, top: position.y }}
      >
        <MenuItem
          icon={Edit}
          label="Edit Label"
          onClick={() => handleItemClick('editEdge', data)}
        />
        <MenuDivider />
        <MenuItem
          icon={Trash2}
          label="Delete Connection"
          onClick={() => handleItemClick('deleteEdge', data)}
          shortcut="Del"
          danger
        />
      </div>
    );
  }

  // Canvas context menu
  return (
    <div
      className="fixed bg-popover border border-border rounded-lg shadow-lg py-1 z-50 min-w-[200px]"
      style={{ left: position.x, top: position.y }}
    >
      <MenuItem
        icon={Clipboard}
        label="Paste"
        onClick={() => handleItemClick('paste')}
        shortcut="Ctrl+V"
        disabled={!data}
      />
      <MenuDivider />
      <MenuItem
        icon={Layout}
        label="Auto Layout"
        onClick={() => handleItemClick('autoLayout')}
        shortcut="Ctrl+L"
      />
      <MenuItem
        icon={Maximize2}
        label="Fit View"
        onClick={() => handleItemClick('fitView')}
        shortcut="Ctrl+0"
      />
      <MenuDivider />
      <MenuGroup label="Align">
        <MenuItem
          icon={AlignLeft}
          label="Align Left"
          onClick={() => handleItemClick('alignLeft')}
        />
        <MenuItem
          icon={AlignCenter}
          label="Align Center"
          onClick={() => handleItemClick('alignCenter')}
        />
        <MenuItem
          icon={AlignRight}
          label="Align Right"
          onClick={() => handleItemClick('alignRight')}
        />
        <MenuItem
          icon={AlignVerticalJustifyStart}
          label="Align Top"
          onClick={() => handleItemClick('alignTop')}
        />
        <MenuItem
          icon={AlignVerticalJustifyCenter}
          label="Align Middle"
          onClick={() => handleItemClick('alignMiddle')}
        />
        <MenuItem
          icon={AlignVerticalJustifyEnd}
          label="Align Bottom"
          onClick={() => handleItemClick('alignBottom')}
        />
      </MenuGroup>
    </div>
  );
}

interface MenuItemProps {
  icon: any;
  label: string;
  onClick: () => void;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
}

function MenuItem({ icon: Icon, label, onClick, shortcut, danger, disabled }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full px-3 py-2 text-sm flex items-center gap-2 transition-colors
        ${danger ? 'text-destructive hover:bg-destructive/10' : 'text-foreground hover:bg-accent'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <Icon className="h-4 w-4" />
      <span className="flex-1 text-left">{label}</span>
      {shortcut && (
        <span className="text-xs text-muted-foreground">{shortcut}</span>
      )}
    </button>
  );
}

function MenuDivider() {
  return <div className="h-px bg-border my-1" />;
}

interface MenuGroupProps {
  label: string;
  children: React.ReactNode;
}

function MenuGroup({ label, children }: MenuGroupProps) {
  return (
    <div className="py-1">
      <div className="px-3 py-1 text-xs font-semibold text-muted-foreground">
        {label}
      </div>
      {children}
    </div>
  );
}

export function useContextMenu() {
  const [menu, setMenu] = useState<{
    show: boolean;
    x: number;
    y: number;
    type: 'node' | 'edge' | 'canvas';
    data?: any;
  }>({ show: false, x: 0, y: 0, type: 'canvas' });

  const showMenu = useCallback((
    event: React.MouseEvent,
    type: 'node' | 'edge' | 'canvas',
    data?: any
  ) => {
    event.preventDefault();
    event.stopPropagation();

    setMenu({
      show: true,
      x: event.clientX,
      y: event.clientY,
      type,
      data,
    });
  }, []);

  const hideMenu = useCallback(() => {
    setMenu(prev => ({ ...prev, show: false }));
  }, []);

  return { menu, showMenu, hideMenu };
}

