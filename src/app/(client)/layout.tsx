/**
 * Client Layout
 * 
 * Enhanced layout for authenticated client pages with ScrollArea
 */

import { Header } from '@/components/layouts/Header';
import { Footer } from '@/components/layouts/Footer';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function ClientLayout({
  children
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <ScrollArea className="flex-1">
        <main className="container mx-auto px-4 py-8 max-w-7xl">
          {children}
        </main>
      </ScrollArea>
      <Footer />
    </div>
  );
}

