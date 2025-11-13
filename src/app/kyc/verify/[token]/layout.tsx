import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Identity Verification - BitFlow',
  description: 'Complete your identity verification securely',
  robots: 'noindex, nofollow', // Don't index verification pages
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Disable zoom for better mobile experience
  viewportFit: 'cover', // For iPhone X+ notch
};

export default function VerifyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

