export const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

export const dataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });

export function categorizeProduct(nome: string): "acai" | "salgados" | "outros" {
  const n = nome.toUpperCase();
  if (n.includes("ACAI") || n.includes("BACABA") || n.includes("MILKSHAKE")) return "acai";
  if (
    n.includes("PASTEL") || n.includes("BOLINHO") || n.includes("ISCA") ||
    n.includes("CAMARAO") || n.includes("CHARQUE") || n.includes("FILE") ||
    n.includes("TACACA") || n.includes("MANICOBA") || n.includes("VATAPA") ||
    n.includes("MIX")
  ) return "salgados";
  return "outros";
}

export const categoriaLabel: Record<string, string> = {
  acai: "Açaí & Bebidas",
  salgados: "Salgados & Pratos",
  outros: "Outros",
};
