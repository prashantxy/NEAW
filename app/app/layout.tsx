import { ReactNode } from 'react';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-900 text-white min-h-screen antialiased">
      {children}
    </div>
  );
}