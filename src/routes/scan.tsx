import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ScanLine } from "lucide-react";

export const Route = createFileRoute("/scan")({
  component: Scan,
});

function Scan() {
  return (
    <AppShell title="Scan NFC-e">
      <div className="px-4 pt-12 pb-6 grid place-items-center text-center">
        <div className="w-20 h-20 rounded-2xl bg-surface border border-border grid place-items-center mb-4">
          <ScanLine className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-lg font-bold">Em breve</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs">
          Em breve você poderá escanear notas fiscais NFC-e diretamente do app.
        </p>
      </div>
    </AppShell>
  );
}
