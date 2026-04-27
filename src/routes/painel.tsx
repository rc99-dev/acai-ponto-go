import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { brl, dataHora } from "@/lib/format";
import { ChevronDown, Download, Loader2, TrendingUp, Users as UsersIcon } from "lucide-react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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

interface DiaPonto {
  dia: string;
  data: string;
  total: number;
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
  const [serie7d, setSerie7d] = useState<DiaPonto[]>([]);

  useEffect(() => {
    const channel = supabase
      .channel("painel-vendas")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "vendas" }, () => fetchAll())
      .subscribe();

    async function fetchAll() {
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

      // Faturamento do mês
      const inicioMes = startOf("mes");
      const { data: m } = await supabase
        .from("vendas")
        .select("total")
        .gte("created_at", inicioMes.toISOString());
      setMesTotal((m ?? []).reduce((s, v: any) => s + Number(v.total), 0));

      // Série dos últimos 7 dias
      const seteAtras = new Date();
      seteAtras.setHours(0, 0, 0, 0);
      seteAtras.setDate(seteAtras.getDate() - 6);
      const { data: d7 } = await supabase
        .from("vendas")
        .select("total,created_at")
        .gte("created_at", seteAtras.toISOString());
      const buckets = new Map<string, number>();
      for (let i = 0; i < 7; i++) {
        const d = new Date(seteAtras);
        d.setDate(seteAtras.getDate() + i);
        buckets.set(d.toISOString().slice(0, 10), 0);
      }
      (d7 ?? []).forEach((v: any) => {
        const k = new Date(v.created_at).toISOString().slice(0, 10);
        buckets.set(k, (buckets.get(k) ?? 0) + Number(v.total));
      });
      const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
      setSerie7d(
        Array.from(buckets.entries()).map(([data, total]) => ({
          data,
          dia: dias[new Date(data + "T00:00:00").getDay()],
          total,
        }))
      );

      setLoading(false);
    }
    fetchAll();

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
  const ticketMedio = qtdHoje > 0 ? faturamentoHoje / qtdHoje : 0;

  // Faturamento por hora (hoje)
  const porHora = useMemo(() => {
    const buckets: { hora: string; total: number }[] = Array.from({ length: 24 }, (_, h) => ({
      hora: String(h).padStart(2, "0") + "h",
      total: 0,
    }));
    hojeVendas.forEach((v) => {
      const h = new Date(v.created_at).getHours();
      buckets[h].total += v.total;
    });
    // Limitar visualização ao intervalo com vendas + 1h margem
    const ativos = buckets.findIndex((b) => b.total > 0);
    if (ativos === -1) return buckets.slice(8, 22);
    const lastIdx = 24 - [...buckets].reverse().findIndex((b) => b.total > 0);
    const start = Math.max(0, ativos - 1);
    const end = Math.min(24, lastIdx + 1);
    return buckets.slice(start, end);
  }, [hojeVendas]);

  // Ranking por quantidade (hoje)
  const rankingQtd = useMemo(() => {
    const map = new Map<string, number>();
    hojeVendas.forEach((v) =>
      v.venda_itens.forEach((i) => map.set(i.nome_produto, (map.get(i.nome_produto) ?? 0) + i.quantidade))
    );
    return [...map.entries()]
      .map(([nome, qtd]) => ({ nome, qtd }))
      .sort((a, b) => b.qtd - a.qtd)
      .slice(0, 5);
  }, [hojeVendas]);

  // Ranking por valor (hoje)
  const rankingValor = useMemo(() => {
    const map = new Map<string, number>();
    hojeVendas.forEach((v) =>
      v.venda_itens.forEach((i) =>
        map.set(i.nome_produto, (map.get(i.nome_produto) ?? 0) + i.subtotal),
      ),
    );
    return [...map.entries()]
      .map(([nome, valor]) => ({ nome, valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);
  }, [hojeVendas]);

  // Por atendente (hoje)
  const porAtendente = useMemo(() => {
    const map = new Map<string, { nome: string; qtd: number; total: number }>();
    hojeVendas.forEach((v) => {
      const nome = v.profiles?.nome ?? "—";
      const cur = map.get(v.atendente_id) ?? { nome, qtd: 0, total: 0 };
      cur.qtd += 1;
      cur.total += v.total;
      map.set(v.atendente_id, cur);
    });
    return [...map.values()].sort((a, b) => b.total - a.total);
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
          ].join(";"),
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
          <SummaryCard label="Ticket médio hoje" value={brl(ticketMedio)} />
          <SummaryCard label="Faturamento hoje" value={brl(faturamentoHoje)} accent />
          <SummaryCard label="Faturamento do mês" value={brl(mesTotal)} primary />
        </div>

        {/* Gráfico por hora */}
        <section className="bg-card rounded-xl p-4 border border-border">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Faturamento por hora (hoje)
          </h3>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porHora} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="hora" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  formatter={(v: any) => brl(Number(v))}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  cursor={{ fill: "oklch(0.9 0.02 348 / 0.3)" }}
                />
                <Bar dataKey="total" fill="oklch(0.32 0.12 348)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Gráfico 7 dias */}
        <section className="bg-card rounded-xl p-4 border border-border">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Últimos 7 dias
          </h3>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={serie7d} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="dia" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  formatter={(v: any) => brl(Number(v))}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="oklch(0.32 0.12 348)"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "oklch(0.32 0.12 348)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Rankings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <RankingCard title="Top por quantidade" items={rankingQtd.map((r) => ({ nome: r.nome, valor: `${r.qtd}×` }))} />
          <RankingCard title="Top por valor" items={rankingValor.map((r) => ({ nome: r.nome, valor: brl(r.valor) }))} />
        </div>

        {/* Por atendente */}
        {porAtendente.length > 0 && (
          <section className="bg-card rounded-xl p-4 border border-border">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-3">
              <UsersIcon className="w-3.5 h-3.5" />
              Por atendente (hoje)
            </h3>
            <ul className="space-y-2">
              {porAtendente.map((a, idx) => (
                <li
                  key={idx}
                  className="flex items-center justify-between gap-2 text-sm border-b border-border last:border-0 pb-2 last:pb-0"
                >
                  <span className="font-semibold truncate">{a.nome}</span>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-muted-foreground">{a.qtd} venda(s)</span>
                    <span className="font-bold text-primary">{brl(a.total)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Filtro + export */}
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
                {p === "hoje" ? "Hoje" : p === "semana" ? "Esta semana" : "Este mês"}
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

        {/* Lista de vendas */}
        <section>
          <div className="flex items-center justify-between mb-2 px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
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
                        <div className="text-[11px] text-muted-foreground">
                          {v.venda_itens.reduce((s, i) => s + i.quantidade, 0)} item(ns)
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
    ? "bg-gradient-to-br from-primary to-[oklch(0.42_0.12_348)] text-primary-foreground"
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

function RankingCard({
  title,
  items,
}: {
  title: string;
  items: { nome: string; valor: string }[];
}) {
  return (
    <section className="bg-card rounded-xl p-4 border border-border">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sem dados.</p>
      ) : (
        <ol className="space-y-2">
          {items.map((r, idx) => (
            <li key={r.nome} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 min-w-0">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold grid place-items-center shrink-0">
                  {idx + 1}
                </span>
                <span className="truncate">{r.nome}</span>
              </span>
              <span className="font-bold text-accent shrink-0 ml-2">{r.valor}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
