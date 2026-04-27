import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/AppShell";
import { brl, categorizeProduct, categoriaLabel } from "@/lib/format";
import { Search, Plus, Minus, Trash2, Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pdv")({
  component: PDV,
});

interface Produto {
  id: string;
  codigo: string;
  nome: string;
  preco: number;
}

interface CartItem {
  produto: Produto;
  qtd: number;
}

function PDV() {
  const { user, profile, loading: authLoading } = useAuth();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [busca, setBusca] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [obs, setObs] = useState("");
  const [saving, setSaving] = useState(false);
  const [pickProduto, setPickProduto] = useState<Produto | null>(null);
  const [pickQtd, setPickQtd] = useState(1);

  useEffect(() => {
    supabase
      .from("produtos")
      .select("id,codigo,nome,preco")
      .eq("ativo", true)
      .order("nome")
      .then(({ data, error }) => {
        if (error) toast.error("Erro ao carregar produtos");
        else setProdutos((data ?? []).map((p) => ({ ...p, preco: Number(p.preco) })));
      });
  }, []);

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return produtos.filter((p) => !q || p.nome.toLowerCase().includes(q) || p.codigo.includes(q));
  }, [produtos, busca]);

  const grupos = useMemo(() => {
    const g: Record<string, Produto[]> = { acai: [], salgados: [], outros: [] };
    filtered.forEach((p) => g[categorizeProduct(p.nome)].push(p));
    return g;
  }, [filtered]);

  const total = cart.reduce((s, i) => s + i.produto.preco * i.qtd, 0);

  function openPick(p: Produto) {
    setPickProduto(p);
    setPickQtd(1);
  }

  function addToCart() {
    if (!pickProduto) return;
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.produto.id === pickProduto.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qtd: next[idx].qtd + pickQtd };
        return next;
      }
      return [...prev, { produto: pickProduto, qtd: pickQtd }];
    });
    setPickProduto(null);
  }

  function removeItem(id: string) {
    setCart((prev) => prev.filter((i) => i.produto.id !== id));
  }

  function changeQtd(id: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) => (i.produto.id === id ? { ...i, qtd: i.qtd + delta } : i))
        .filter((i) => i.qtd > 0)
    );
  }

  async function confirmar() {
    if (!user || cart.length === 0) return;
    setSaving(true);
    const { data: venda, error } = await supabase
      .from("vendas")
      .insert({ atendente_id: user.id, total, observacoes: obs || null })
      .select("id")
      .single();
    if (error || !venda) {
      setSaving(false);
      toast.error("Erro ao salvar venda", { description: error?.message });
      return;
    }
    const itens = cart.map((i) => ({
      venda_id: venda.id,
      produto_id: i.produto.id,
      nome_produto: i.produto.nome,
      preco_unitario: i.produto.preco,
      quantidade: i.qtd,
      subtotal: i.produto.preco * i.qtd,
    }));
    const { error: e2 } = await supabase.from("venda_itens").insert(itens);
    setSaving(false);
    if (e2) {
      toast.error("Erro ao salvar itens", { description: e2.message });
      return;
    }
    toast.success(`Venda registrada • ${brl(total)}`, {
      description: `${cart.reduce((s, i) => s + i.qtd, 0)} item(ns) • ${profile?.nome ?? ""}`,
    });
    setCart([]);
    setObs("");
  }

  if (authLoading) return <SplashLoading />;

  return (
    <AppShell title="Ponto de Venda">
      <div className="px-4 pt-4 pb-4 space-y-4">
        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar produto..."
            className="w-full h-11 pl-10 pr-4 rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Catálogo */}
        <div className="space-y-4">
          {(["acai", "salgados", "outros"] as const).map((cat) =>
            grupos[cat].length === 0 ? null : (
              <section key={cat}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                  {categoriaLabel[cat]}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {grupos[cat].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => openPick(p)}
                      className="bg-card rounded-xl p-3 text-left border border-border hover:border-primary hover:shadow-md transition-all active:scale-95"
                    >
                      <div className="text-sm font-semibold leading-tight line-clamp-2 min-h-[2.5rem]">
                        {p.nome}
                      </div>
                      <div className="mt-2 text-base font-bold text-primary">{brl(p.preco)}</div>
                    </button>
                  ))}
                </div>
              </section>
            )
          )}
          {filtered.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">Nenhum produto encontrado.</p>
          )}
        </div>
      </div>

      {/* Carrinho fixo */}
      {cart.length > 0 && (
        <div className="sticky bottom-16 z-20 bg-background border-t border-border shadow-[0_-8px_24px_rgba(0,0,0,0.06)]">
          <div className="max-w-2xl mx-auto px-4 py-3 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">Carrinho ({cart.reduce((s, i) => s + i.qtd, 0)})</h3>
              <span className="text-xs text-muted-foreground">Toque para ajustar</span>
            </div>
            <ul className="max-h-48 overflow-auto space-y-2">
              {cart.map((i) => (
                <li
                  key={i.produto.id}
                  className="flex items-center gap-2 bg-surface rounded-lg p-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{i.produto.nome}</div>
                    <div className="text-xs text-muted-foreground">
                      {brl(i.produto.preco)} • {brl(i.produto.preco * i.qtd)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => changeQtd(i.produto.id, -1)}
                      className="w-8 h-8 rounded-md bg-background border border-border grid place-items-center"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-6 text-center text-sm font-bold">{i.qtd}</span>
                    <button
                      onClick={() => changeQtd(i.produto.id, 1)}
                      className="w-8 h-8 rounded-md bg-background border border-border grid place-items-center"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => removeItem(i.produto.id)}
                      className="w-8 h-8 rounded-md text-destructive grid place-items-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <input
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              placeholder="Observações (opcional)"
              className="w-full h-10 px-3 rounded-lg border border-border bg-card text-sm"
            />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-2xl font-extrabold text-foreground">{brl(total)}</span>
            </div>
            <button
              onClick={confirmar}
              disabled={saving}
              className="w-full h-14 rounded-xl bg-accent text-accent-foreground font-bold text-base flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 active:scale-[0.98] transition"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              Confirmar Venda
            </button>
          </div>
        </div>
      )}

      {/* Modal seletor de quantidade */}
      {pickProduto && (
        <div
          className="fixed inset-0 z-50 bg-black/50 grid place-items-end sm:place-items-center px-4"
          onClick={() => setPickProduto(null)}
        >
          <div
            className="w-full max-w-md bg-card rounded-t-2xl sm:rounded-2xl p-5 space-y-4 animate-in slide-in-from-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-base leading-tight">{pickProduto.nome}</h3>
                <p className="text-primary font-bold mt-1">{brl(pickProduto.preco)}</p>
              </div>
              <button
                onClick={() => setPickProduto(null)}
                className="w-8 h-8 rounded-full bg-surface grid place-items-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center justify-center gap-4 py-2">
              <button
                onClick={() => setPickQtd((q) => Math.max(1, q - 1))}
                className="w-12 h-12 rounded-full bg-surface border border-border grid place-items-center"
              >
                <Minus className="w-5 h-5" />
              </button>
              <span className="text-3xl font-extrabold w-16 text-center">{pickQtd}</span>
              <button
                onClick={() => setPickQtd((q) => q + 1)}
                className="w-12 h-12 rounded-full bg-primary text-primary-foreground grid place-items-center"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-bold text-lg">{brl(pickProduto.preco * pickQtd)}</span>
            </div>
            <button
              onClick={addToCart}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90"
            >
              Adicionar ao carrinho
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function SplashLoading() {
  return (
    <div className="min-h-screen grid place-items-center">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );
}
