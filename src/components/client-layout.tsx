"use client";

import { ThemeProvider } from "next-themes";
import { Sidebar } from "@/components/sidebar";

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-muted/20">
          {children}
        </main>
      </div>
    </ThemeProvider>
  );
}