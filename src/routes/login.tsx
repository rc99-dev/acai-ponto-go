import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("Falha no login", { description: error.message });
      return;
    }
    toast.success("Bem-vindo!");
    router.navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen grid place-items-center px-5 bg-gradient-to-br from-[oklch(0.18_0.06_348)] via-primary to-[oklch(0.42_0.12_348)]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8 text-primary-foreground">
          <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur grid place-items-center mx-auto mb-3 text-2xl font-extrabold">
            P
          </div>
          <h1 className="text-2xl font-bold">Point do Açaí</h1>
          <p className="text-sm opacity-80">d'Amazônia</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-card rounded-2xl p-6 shadow-2xl space-y-4"
        >
          <h2 className="text-lg font-bold text-foreground">Entrar</h2>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 px-4 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="seu@email.com"
              autoComplete="email"
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
              className="w-full h-12 px-4 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Entrar
          </button>

          <p className="text-center text-xs text-muted-foreground pt-2">
            Acesso restrito. Solicite sua conta à gerência.
          </p>
        </form>
      </div>
    </div>
  );
}
