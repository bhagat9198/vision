"use client";

import { Sidebar } from "./sidebar";
import { Header } from "./header";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-64 min-h-screen flex flex-col">
        <Header />
        <div className="container mx-auto p-6 flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}

