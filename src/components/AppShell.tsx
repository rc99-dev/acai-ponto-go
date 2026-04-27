import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

export function AppShell({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <div className="min-h-screen bg-surface pb-20">
      <header className="sticky top-0 z-30 bg-background border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground grid place-items-center font-bold">
              P
            </div>
            <div>
              <div className="text-sm font-bold leading-none">Point Scan</div>
              <div className="text-[10px] text-muted-foreground">{title ?? "Point do Açaí"}</div>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-2xl mx-auto">{children}</main>
      <BottomNav />
    </div>
  );
}
