import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth-context";
import { Loader2, UserPlus, ShieldCheck, User as UserIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/equipe")({
  component: EquipePage,
});

interface Membro {
  id: string;
  nome: string;
  role: "atendente" | "gerencia";
}

function EquipePage() {
  const { user } = useAuth();
  const [membros, setMembros] = useState<Membro[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"atendente" | "gerencia">("atendente");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data: profiles } = await supabase.from("profiles").select("id,nome");
    const { data: roles } = await supabase.from("user_roles").select("user_id,role");
    const map = new Map((roles ?? []).map((r: any) => [r.user_id, r.role]));
    setMembros(
      (profiles ?? []).map((p: any) => ({
        id: p.id,
        nome: p.nome,
        role: (map.get(p.id) as "atendente" | "gerencia") ?? "atendente",
      })),
    );
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data, error } = await supabase.functions.invoke("criar-atendente", {
      body: { nome, email, password, role },
    });
    setSaving(false);
    if (error || (data as any)?.error) {
      toast.error("Falha ao criar conta", {
        description: (data as any)?.error ?? error?.message,
      });
      return;
    }
    toast.success("Conta criada");
    setOpen(false);
    setNome("");
    setEmail("");
    setPassword("");
    setRole("atendente");
    load();
  }

  async function alterarCargo(membro: Membro, novo: "atendente" | "gerencia") {
    if (membro.id === user?.id) {
      toast.error("Você não pode alterar seu próprio cargo");
      return;
    }
    setUpdatingId(membro.id);
    const { error } = await supabase
      .from("user_roles")
      .update({ role: novo })
      .eq("user_id", membro.id);
    setUpdatingId(null);
    if (error) {
      toast.error("Falha ao alterar cargo", { description: error.message });
      return;
    }
    toast.success(novo === "gerencia" ? "Promovido a gerência" : "Rebaixado a atendente");
    setMembros((prev) => prev.map((p) => (p.id === membro.id ? { ...p, role: novo } : p)));
  }

  return (
    <AppShell title="Equipe">
      <div className="px-4 pt-4 pb-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">Membros ({membros.length})</h2>
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Novo
          </button>
        </div>

        {loading ? (
          <div className="grid place-items-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : (
          <ul className="space-y-2">
            {membros.map((m) => (
              <li
                key={m.id}
                className="bg-card rounded-xl p-3 border border-border flex items-center justify-between"
              >
                <div className="min-w-0">
                  <p className="font-semibold truncate">{m.nome}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {m.role === "gerencia" ? "Gerência" : "Atendente"}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${
                    m.role === "gerencia"
                      ? "bg-primary/10 text-primary"
                      : "bg-accent/10 text-accent"
                  }`}
                >
                  {m.role}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 grid place-items-end sm:place-items-center px-4 pb-4"
          onClick={() => setOpen(false)}
        >
          <form
            onSubmit={criar}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-card rounded-2xl p-5 space-y-3 shadow-2xl"
          >
            <h3 className="text-lg font-bold">Nova conta</h3>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Nome</label>
              <input
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-border bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-border bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Senha (mín 6)</label>
              <input
                type="text"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-border bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Cargo</label>
              <div className="grid grid-cols-2 gap-2">
                {(["atendente", "gerencia"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`h-11 rounded-lg border-2 text-sm font-medium ${
                      role === r
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background"
                    }`}
                  >
                    {r === "gerencia" ? "Gerência" : "Atendente"}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 h-11 rounded-lg border border-border font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 h-11 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Criar
              </button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}
