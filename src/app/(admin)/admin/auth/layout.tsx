/**
 * Admin Auth Layout
 * 
 * Public layout for admin authentication pages
 * No session check required
 */

export default function AdminAuthLayout({
  children
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return <>{children}</>;
}

