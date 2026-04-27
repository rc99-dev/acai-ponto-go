import { Link, useLocation } from "@tanstack/react-router";
import { ShoppingCart, ListOrdered, ScanLine, User, LayoutDashboard, Users } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const { role } = useAuth();
  const { pathname } = useLocation();

  const items: { to: string; icon: typeof User; label: string; disabled?: boolean }[] =
    role === "gerencia"
      ? [
          { to: "/painel", icon: LayoutDashboard, label: "Painel" },
          { to: "/equipe", icon: Users, label: "Equipe" },
          { to: "/perfil", icon: User, label: "Perfil" },
        ]
      : [
          { to: "/pdv", icon: ShoppingCart, label: "PDV" },
          { to: "/minhas-vendas", icon: ListOrdered, label: "Vendas" },
          { to: "/scan", icon: ScanLine, label: "Scan", disabled: true },
          { to: "/perfil", icon: User, label: "Perfil" },
        ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-background border-t border-border safe-bottom">
      <ul className="flex items-stretch justify-around max-w-2xl mx-auto">
        {items.map((it) => {
          const active = pathname.startsWith(it.to);
          const Icon = it.icon;
          if (it.disabled) {
            return (
              <li key={it.to} className="flex-1">
                <div className="flex flex-col items-center gap-1 py-2.5 text-muted-foreground/50">
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium">{it.label}</span>
                  <span className="text-[8px] uppercase">em breve</span>
                </div>
              </li>
            );
          }
          return (
            <li key={it.to} className="flex-1">
              <Link
                to={it.to}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[11px] font-medium">{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
