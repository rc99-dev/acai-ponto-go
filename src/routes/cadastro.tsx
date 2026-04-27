import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/cadastro")({
  component: CadastroPage,
});

function CadastroPage() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"atendente" | "gerencia">("atendente");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { nome, role },
      },
    });
    setLoading(false);
    if (error) {
      toast.error("Falha no cadastro", { description: error.message });
      return;
    }
    toast.success("Conta criada!");
    router.navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen grid place-items-center px-5 py-8 bg-gradient-to-br from-[oklch(0.25_0.12_293)] via-primary to-[oklch(0.35_0.2_293)]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6 text-primary-foreground">
          <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur grid place-items-center mx-auto mb-3 text-xl font-extrabold">
            P
          </div>
          <h1 className="text-xl font-bold">Criar conta</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-card rounded-2xl p-6 shadow-2xl space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Nome</label>
            <input
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full h-12 px-4 rounded-lg border border-border bg-background"
              placeholder="Seu nome"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 px-4 rounded-lg border border-border bg-background"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Senha</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 px-4 rounded-lg border border-border bg-background"
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
                  className={`h-12 rounded-lg border-2 font-medium capitalize transition-colors ${
                    role === r
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground"
                  }`}
                >
                  {r === "gerencia" ? "Gerência" : "Atendente"}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Criar conta
          </button>

          <p className="text-center text-sm text-muted-foreground pt-2">
            Já tem conta?{" "}
            <Link to="/login" className="text-primary font-semibold">
              Entrar
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
