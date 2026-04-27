import { Outlet, Link, createRootRoute, HeadContent, Scripts, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/lib/auth-context";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Ir para o início
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" },
      { title: "Point Scan — Point do Açaí d'Amazônia" },
      { name: "description", content: "PDV mobile para registro e gerenciamento de vendas do Point do Açaí." },
      { name: "theme-color", content: "#7c3aed" },
      { property: "og:title", content: "Point Scan — Point do Açaí d'Amazônia" },
      { name: "twitter:title", content: "Point Scan — Point do Açaí d'Amazônia" },
      { property: "og:description", content: "PDV mobile para registro e gerenciamento de vendas do Point do Açaí." },
      { name: "twitter:description", content: "PDV mobile para registro e gerenciamento de vendas do Point do Açaí." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/7OmEmc9FlwTGqgRXyGmSLvMe2C23/social-images/social-1777319907835-LOGO_POINT.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/7OmEmc9FlwTGqgRXyGmSLvMe2C23/social-images/social-1777319907835-LOGO_POINT.webp" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RouteRedirector() {
  const { loading, session, role } = useAuth();
  const router = useRouter();
  const path = router.state.location.pathname;

  useEffect(() => {
    if (loading) return;
    const isAuthPage = path === "/login" || path === "/cadastro";
    if (!session && !isAuthPage && path !== "/") {
      router.navigate({ to: "/login" });
      return;
    }
    if (session && (path === "/" || isAuthPage)) {
      router.navigate({ to: role === "gerencia" ? "/painel" : "/pdv" });
      return;
    }
    if (session && role === "atendente" && path.startsWith("/painel")) {
      router.navigate({ to: "/pdv" });
    }
    if (session && role === "gerencia" && (path.startsWith("/pdv") || path.startsWith("/minhas-vendas") || path.startsWith("/scan"))) {
      router.navigate({ to: "/painel" });
    }
  }, [loading, session, role, path, router]);

  return null;
}

function RootComponent() {
  return (
    <AuthProvider>
      <RouteRedirector />
      <Outlet />
      <Toaster position="top-center" richColors />
    </AuthProvider>
  );
}
