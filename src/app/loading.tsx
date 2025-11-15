/**
 * Global Loading Component
 * 
 * Displayed while pages are loading.
 * Uses branded loader with logo from system settings
 */

import { BrandLoaderPage } from '@/components/ui/brand-loader';

export default function Loading(): React.ReactElement {
  return <BrandLoaderPage text="Loading..." />;
}

