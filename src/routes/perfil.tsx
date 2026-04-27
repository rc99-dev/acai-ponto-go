import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/AppShell";
import { LogOut, User as UserIcon } from "lucide-react";
import { useEffect } from "react";

export const Route = createFileRoute("/perfil")({
  component: Perfil,
});

function Perfil() {
  const { profile, role, user, signOut, refresh } = useAuth();
  const router = useRouter();

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogout() {
    await signOut();
    router.navigate({ to: "/login" });
  }

  return (
    <AppShell title="Perfil">
      <div className="px-4 pt-4 pb-6 space-y-4">
        <div className="bg-card rounded-2xl p-6 border border-border flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground grid place-items-center text-2xl font-bold">
            {(profile?.nome?.[0] ?? "?").toUpperCase()}
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold truncate">{profile?.nome ?? "Usuário"}</h2>
            <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
            <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent/15 text-accent">
              {role === "gerencia" ? "Gerência" : "Atendente"}
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full h-12 rounded-xl bg-card border border-border text-destructive font-semibold flex items-center justify-center gap-2 hover:bg-surface"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>

        <p className="text-center text-xs text-muted-foreground pt-4">
          Point Scan • Point do Açaí d'Amazônia
        </p>
        <div className="grid place-items-center text-muted-foreground/40">
          <UserIcon className="w-5 h-5" />
        </div>
      </div>
    </AppShell>
  );
}
