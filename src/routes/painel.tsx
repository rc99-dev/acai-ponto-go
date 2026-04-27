import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { brl, dataHora } from "@/lib/format";
import { ChevronDown, Download, Loader2, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/painel")({
  component: Painel,
});

type Periodo = "hoje" | "semana" | "mes";

interface VendaFull {
  id: string;
  total: number;
  observacoes: string | null;
  created_at: string;
  atendente_id: string;
  profiles: { nome: string } | null;
  venda_itens: { nome_produto: string; quantidade: number; subtotal: number; preco_unitario: number }[];
}

function startOf(p: Periodo) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (p === "semana") {
    const day = d.getDay();
    d.setDate(d.getDate() - day);
  } else if (p === "mes") {
    d.setDate(1);
  }
  return d;
}

function Painel() {
  const [periodo, setPeriodo] = useState<Periodo>("hoje");
  const [vendas, setVendas] = useState<VendaFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [mesTotal, setMesTotal] = useState(0);

  useEffect(() => {
    const channel = supabase
      .channel("painel-vendas")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "vendas" }, () => fetch())
      .subscribe();

    async function fetch() {
      setLoading(true);
      const inicio = startOf(periodo);
      const { data } = await supabase
        .from("vendas")
        .select(
          "id,total,observacoes,created_at,atendente_id,profiles(nome),venda_itens(nome_produto,quantidade,subtotal,preco_unitario)"
        )
        .gte("created_at", inicio.toISOString())
        .order("created_at", { ascending: false });

      setVendas(
        (data ?? []).map((v: any) => ({
          ...v,
          total: Number(v.total),
          venda_itens: (v.venda_itens ?? []).map((i: any) => ({
            ...i,
            subtotal: Number(i.subtotal),
            preco_unitario: Number(i.preco_unitario),
          })),
        }))
      );

      // Always fetch month total separately for the top card
      const inicioMes = startOf("mes");
      const { data: m } = await supabase
        .from("vendas")
        .select("total")
        .gte("created_at", inicioMes.toISOString());
      setMesTotal((m ?? []).reduce((s, v: any) => s + Number(v.total), 0));

      setLoading(false);
    }
    fetch();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [periodo]);

  const hojeVendas = useMemo(() => {
    const inicio = startOf("hoje").toISOString();
    return vendas.filter((v) => v.created_at >= inicio);
  }, [vendas]);

  const totalPeriodo = vendas.reduce((s, v) => s + v.total, 0);
  const faturamentoHoje = hojeVendas.reduce((s, v) => s + v.total, 0);
  const qtdHoje = hojeVendas.length;

  const ranking = useMemo(() => {
    const map = new Map<string, number>();
    hojeVendas.forEach((v) =>
      v.venda_itens.forEach((i) => map.set(i.nome_produto, (map.get(i.nome_produto) ?? 0) + i.quantidade))
    );
    return [...map.entries()]
      .map(([nome, qtd]) => ({ nome, qtd }))
      .sort((a, b) => b.qtd - a.qtd)
      .slice(0, 5);
  }, [hojeVendas]);

  function exportCSV() {
    if (vendas.length === 0) {
      toast.error("Nenhuma venda no período");
      return;
    }
    const rows = [
      ["Data/Hora", "Atendente", "Produto", "Qtd", "Preço Unit.", "Subtotal", "Total Venda", "Obs"].join(";"),
    ];
    vendas.forEach((v) => {
      v.venda_itens.forEach((i) => {
        rows.push(
          [
            dataHora(v.created_at),
            v.profiles?.nome ?? "",
            i.nome_produto,
            String(i.quantidade),
            i.preco_unitario.toFixed(2).replace(".", ","),
            i.subtotal.toFixed(2).replace(".", ","),
            v.total.toFixed(2).replace(".", ","),
            (v.observacoes ?? "").replace(/[\n;]/g, " "),
          ].join(";")
        );
      });
    });
    const blob = new Blob(["\uFEFF" + rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vendas-${periodo}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado");
  }

  return (
    <AppShell title="Painel da Gerência">
      <div className="px-4 pt-4 pb-6 space-y-4">
        {/* Cards resumo */}
        <div className="grid grid-cols-2 gap-2">
          <SummaryCard label="Vendas hoje" value={String(qtdHoje)} />
          <SummaryCard label="Faturamento hoje" value={brl(faturamentoHoje)} accent />
          <div className="col-span-2">
            <SummaryCard label="Faturamento do mês" value={brl(mesTotal)} primary />
          </div>
        </div>

        {/* Filtro */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex bg-card rounded-xl p-1 border border-border">
            {(["hoje", "semana", "mes"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  periodo === p ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {p === "hoje" ? "Hoje" : p === "semana" ? "Semana" : "Mês"}
              </button>
            ))}
          </div>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-accent text-accent-foreground text-xs font-bold hover:opacity-90"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
        </div>

        {/* Ranking */}
        {ranking.length > 0 && (
          <section className="bg-card rounded-xl p-4 border border-border">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-3">
              <TrendingUp className="w-3.5 h-3.5" />
              Ranking de hoje
            </h3>
            <ol className="space-y-2">
              {ranking.map((r, idx) => (
                <li key={r.nome} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold grid place-items-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="truncate">{r.nome}</span>
                  </span>
                  <span className="font-bold text-accent shrink-0 ml-2">{r.qtd}×</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Lista de vendas */}
        <section>
          <div className="flex items-center justify-between mb-2 px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Vendas ({vendas.length})
            </h3>
            <span className="text-xs font-bold text-foreground">{brl(totalPeriodo)}</span>
          </div>
          {loading ? (
            <div className="grid place-items-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : vendas.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Sem vendas no período.</p>
          ) : (
            <ul className="space-y-2">
              {vendas.map((v) => {
                const open = expanded === v.id;
                return (
                  <li key={v.id} className="bg-card rounded-xl border border-border overflow-hidden">
                    <button
                      onClick={() => setExpanded(open ? null : v.id)}
                      className="w-full p-3 flex items-center gap-3 text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-muted-foreground">{dataHora(v.created_at)}</div>
                        <div className="text-sm font-semibold truncate">
                          {v.profiles?.nome ?? "—"}
                        </div>
                      </div>
                      <span className="text-base font-extrabold text-primary">{brl(v.total)}</span>
                      <ChevronDown
                        className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
                      />
                    </button>
                    {open && (
                      <div className="px-3 pb-3 border-t border-border pt-2">
                        <ul className="text-sm space-y-1">
                          {v.venda_itens.map((i, idx) => (
                            <li key={idx} className="flex justify-between">
                              <span className="truncate pr-2">
                                {i.quantidade}× {i.nome_produto}
                              </span>
                              <span className="text-muted-foreground">{brl(i.subtotal)}</span>
                            </li>
                          ))}
                        </ul>
                        {v.observacoes && (
                          <p className="mt-2 text-xs italic text-muted-foreground">{v.observacoes}</p>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function SummaryCard({
  label,
  value,
  primary,
  accent,
}: {
  label: string;
  value: string;
  primary?: boolean;
  accent?: boolean;
}) {
  const cls = primary
    ? "bg-gradient-to-br from-primary to-[oklch(0.4_0.22_293)] text-primary-foreground"
    : accent
    ? "bg-accent text-accent-foreground"
    : "bg-card text-foreground border border-border";
  return (
    <div className={`rounded-xl p-3.5 ${cls}`}>
      <p className="text-[10px] uppercase tracking-wider opacity-80 font-bold">{label}</p>
      <p className="text-xl font-extrabold mt-1">{value}</p>
    </div>
  );
}
