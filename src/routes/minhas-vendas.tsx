import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/AppShell";
import { brl, hora } from "@/lib/format";
import { Loader2, Receipt } from "lucide-react";

export const Route = createFileRoute("/minhas-vendas")({
  component: MinhasVendas,
});

interface VendaRow {
  id: string;
  total: number;
  observacoes: string | null;
  created_at: string;
  venda_itens: { nome_produto: string; quantidade: number; subtotal: number }[];
}

function MinhasVendas() {
  const { user } = useAuth();
  const [vendas, setVendas] = useState<VendaRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const inicio = new Date();
    inicio.setHours(0, 0, 0, 0);

    // realtime subscription
    const channel = supabase
      .channel("minhas-vendas")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "vendas", filter: `atendente_id=eq.${user.id}` },
        () => fetchData()
      )
      .subscribe();

    async function fetchData() {
      setLoading(true);
      const { data } = await supabase
        .from("vendas")
        .select("id,total,observacoes,created_at,venda_itens(nome_produto,quantidade,subtotal)")
        .eq("atendente_id", user!.id)
        .gte("created_at", inicio.toISOString())
        .order("created_at", { ascending: false });
      setVendas(
        (data ?? []).map((v) => ({
          ...v,
          total: Number(v.total),
          venda_itens: (v.venda_itens ?? []).map((i) => ({
            ...i,
            subtotal: Number(i.subtotal),
          })),
        }))
      );
      setLoading(false);
    }
    fetchData();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const totalDia = vendas.reduce((s, v) => s + v.total, 0);

  return (
    <AppShell title="Minhas vendas hoje">
      <div className="px-4 pt-4 pb-6 space-y-4">
        <div className="bg-gradient-to-br from-primary to-[oklch(0.4_0.22_293)] rounded-2xl p-5 text-primary-foreground shadow-lg">
          <p className="text-xs uppercase tracking-wider opacity-80">Faturamento de hoje</p>
          <p className="text-3xl font-extrabold mt-1">{brl(totalDia)}</p>
          <p className="text-sm opacity-80 mt-1">{vendas.length} venda(s) registrada(s)</p>
        </div>

        {loading ? (
          <div className="grid place-items-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : vendas.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Receipt className="w-10 h-10 mx-auto opacity-40 mb-2" />
            <p className="text-sm">Nenhuma venda registrada hoje.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {vendas.map((v) => (
              <li key={v.id} className="bg-card rounded-xl p-4 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-muted-foreground">{hora(v.created_at)}</span>
                  <span className="text-lg font-extrabold text-primary">{brl(v.total)}</span>
                </div>
                <ul className="text-sm space-y-0.5">
                  {v.venda_itens.map((i, idx) => (
                    <li key={idx} className="flex justify-between text-foreground/80">
                      <span className="truncate pr-2">
                        {i.quantidade}× {i.nome_produto}
                      </span>
                      <span className="text-muted-foreground">{brl(i.subtotal)}</span>
                    </li>
                  ))}
                </ul>
                {v.observacoes && (
                  <p className="mt-2 text-xs text-muted-foreground italic border-t border-border pt-2">
                    {v.observacoes}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
