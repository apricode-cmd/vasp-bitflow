/**
 * Admin Layout
 * 
 * CRM layout with resizable sidebar navigation
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { AdminSidebar } from '@/components/layouts/AdminSidebar';
import { AdminFooter } from '@/components/layouts/AdminFooter';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import type { ImperativePanelHandle } from 'react-resizable-panels';

interface AdminLayoutClientProps {
  children: React.ReactNode;
}

const SIDEBAR_WIDTH_KEY = 'admin-sidebar-width';
const DEFAULT_SIDEBAR_SIZE = 9;

export function AdminLayoutClient({ children }: AdminLayoutClientProps): React.ReactElement {
  const [sidebarSize, setSidebarSize] = useState(DEFAULT_SIDEBAR_SIZE);
  const [mounted, setMounted] = useState(false);
  const sidebarPanelRef = useRef<ImperativePanelHandle>(null);

  // Load saved sidebar width from localStorage
  useEffect(() => {
    const savedSize = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    
    if (savedSize) {
      const parsedSize = parseFloat(savedSize);
      if (!isNaN(parsedSize) && parsedSize >= 15 && parsedSize <= 30) {
        setSidebarSize(parsedSize);
      }
    }
    setMounted(true);
  }, []);

  // Save sidebar width to localStorage
  const handleResize = (size: number) => {
    setSidebarSize(size);
    localStorage.setItem(SIDEBAR_WIDTH_KEY, size.toString());
  };

  if (!mounted) {
    // Prevent hydration mismatch
    return (
      <div className="h-screen overflow-hidden bg-background">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          <ResizablePanel defaultSize={DEFAULT_SIDEBAR_SIZE} minSize={15} maxSize={30} className="min-w-[300px]">
            <AdminSidebar />
          </ResizablePanel>
          <ResizableHandle className="w-px bg-transparent hover:bg-primary/30 transition-all duration-200 group relative">
            <div className="absolute inset-y-0 -left-px w-[3px] bg-gradient-to-r from-transparent via-border/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </ResizableHandle>
          <ResizablePanel defaultSize={91} minSize={50}>
            <div className="flex flex-col h-full overflow-auto bg-background">
              <main className="flex-1">
                <div className="container mx-auto p-6 max-w-[1600px]">
                  {children}
                </div>
              </main>
              <AdminFooter />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-background">
      <ResizablePanelGroup
        direction="horizontal"
        className="h-full"
      >
        {/* Sidebar Panel */}
        <ResizablePanel
          ref={sidebarPanelRef}
          defaultSize={sidebarSize}
          minSize={15}
          maxSize={30}
          onResize={handleResize}
          className="min-w-[300px]"
        >
          <AdminSidebar />
        </ResizablePanel>

        {/* Elegant Resize Handle */}
        <ResizableHandle className="w-px bg-transparent hover:bg-primary/30 transition-all duration-200 group relative">
          <div className="absolute inset-y-0 -left-px w-[3px] bg-gradient-to-r from-transparent via-border/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </ResizableHandle>

        {/* Main Content Panel */}
        <ResizablePanel defaultSize={100 - sidebarSize} minSize={50}>
          <div className="flex flex-col h-full overflow-auto bg-background">
            <main className="flex-1">
              <div className="container mx-auto p-6 max-w-[1600px]">
                {children}
              </div>
            </main>
            <AdminFooter />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

