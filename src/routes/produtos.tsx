import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { brl } from "@/lib/format";
import { Loader2, Plus, Search, Pencil, Trash2, Eye, EyeOff, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/produtos")({
  component: ProdutosPage,
});

interface Produto {
  id: string;
  codigo: string;
  nome: string;
  preco: number;
  ativo: boolean;
}

interface FormState {
  id?: string;
  codigo: string;
  nome: string;
  preco: string;
}

function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>({ codigo: "", nome: "", preco: "" });
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("produtos")
      .select("id,codigo,nome,preco,ativo")
      .order("nome");
    if (error) toast.error("Erro ao carregar produtos", { description: error.message });
    else setProdutos((data ?? []).map((p) => ({ ...p, preco: Number(p.preco) })));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return produtos;
    return produtos.filter(
      (p) => p.nome.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q),
    );
  }, [produtos, busca]);

  function openNovo() {
    setForm({ codigo: "", nome: "", preco: "" });
    setOpen(true);
  }

  function openEditar(p: Produto) {
    setForm({ id: p.id, codigo: p.codigo, nome: p.nome, preco: String(p.preco).replace(".", ",") });
    setOpen(true);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const preco = Number(form.preco.replace(",", "."));
    if (!form.codigo.trim() || !form.nome.trim() || !Number.isFinite(preco) || preco < 0) {
      toast.error("Preencha todos os campos com valores válidos");
      return;
    }
    setSaving(true);
    if (form.id) {
      const { error } = await supabase
        .from("produtos")
        .update({ nome: form.nome.trim(), preco, codigo: form.codigo.trim() })
        .eq("id", form.id);
      setSaving(false);
      if (error) {
        toast.error("Falha ao salvar", { description: error.message });
        return;
      }
      toast.success("Produto atualizado");
    } else {
      const { error } = await supabase.from("produtos").insert({
        codigo: form.codigo.trim(),
        nome: form.nome.trim(),
        preco,
        ativo: true,
      });
      setSaving(false);
      if (error) {
        toast.error("Falha ao criar", { description: error.message });
        return;
      }
      toast.success("Produto criado");
    }
    setOpen(false);
    load();
  }

  async function toggleAtivo(p: Produto) {
    setUpdatingId(p.id);
    const { error } = await supabase
      .from("produtos")
      .update({ ativo: !p.ativo })
      .eq("id", p.id);
    setUpdatingId(null);
    if (error) {
      toast.error("Falha ao alterar status", { description: error.message });
      return;
    }
    setProdutos((prev) => prev.map((x) => (x.id === p.id ? { ...x, ativo: !x.ativo } : x)));
  }

  async function excluir(p: Produto) {
    if (!confirm(`Excluir "${p.nome}"? Esta ação não pode ser desfeita.`)) return;
    setUpdatingId(p.id);
    const { error } = await supabase.from("produtos").delete().eq("id", p.id);
    setUpdatingId(null);
    if (error) {
      toast.error("Falha ao excluir", {
        description:
          error.message +
          " — produtos com vendas associadas não podem ser excluídos. Use Ocultar.",
      });
      return;
    }
    toast.success("Produto excluído");
    setProdutos((prev) => prev.filter((x) => x.id !== p.id));
  }

  return (
    <AppShell title="Produtos">
      <div className="px-4 pt-4 pb-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou código..."
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            onClick={openNovo}
            className="h-11 px-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center gap-1.5 hover:opacity-90 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Novo
          </button>
        </div>

        {loading ? (
          <div className="grid place-items-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">
            Nenhum produto encontrado.
          </p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((p) => (
              <li
                key={p.id}
                className={`bg-card rounded-xl border p-3 space-y-2 ${
                  p.ativo ? "border-border" : "border-border opacity-60"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono uppercase bg-muted px-1.5 py-0.5 rounded">
                        {p.codigo}
                      </span>
                      {!p.ativo && (
                        <span className="text-[10px] font-bold uppercase bg-destructive/10 text-destructive px-1.5 py-0.5 rounded">
                          Oculto
                        </span>
                      )}
                    </div>
                    <p className="font-semibold mt-1 leading-tight">{p.nome}</p>
                    <p className="text-primary font-bold mt-0.5">{brl(p.preco)}</p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => openEditar(p)}
                    className="flex-1 h-9 rounded-lg border border-border text-xs font-semibold flex items-center justify-center gap-1 hover:bg-muted"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Editar
                  </button>
                  <button
                    onClick={() => toggleAtivo(p)}
                    disabled={updatingId === p.id}
                    className="flex-1 h-9 rounded-lg border border-border text-xs font-semibold flex items-center justify-center gap-1 hover:bg-muted disabled:opacity-50"
                  >
                    {p.ativo ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        Ocultar
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        Mostrar
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => excluir(p)}
                    disabled={updatingId === p.id}
                    className="h-9 px-3 rounded-lg border border-destructive/30 text-destructive text-xs font-semibold flex items-center justify-center hover:bg-destructive/10 disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
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
            onSubmit={salvar}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-card rounded-2xl p-5 space-y-3 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">{form.id ? "Editar produto" : "Novo produto"}</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full bg-surface grid place-items-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Código</label>
              <input
                required
                value={form.codigo}
                onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))}
                className="w-full h-11 px-3 rounded-lg border border-border bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Nome</label>
              <input
                required
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                className="w-full h-11 px-3 rounded-lg border border-border bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Preço (R$)</label>
              <input
                required
                inputMode="decimal"
                value={form.preco}
                onChange={(e) => setForm((f) => ({ ...f, preco: e.target.value }))}
                placeholder="0,00"
                className="w-full h-11 px-3 rounded-lg border border-border bg-background"
              />
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
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}
