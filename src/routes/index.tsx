import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { loading } = useAuth();
  const router = useRouter();

  // Redirector in __root handles navigation; show splash here.
  if (!loading) {
    // ensure something visible while router transitions
    void router;
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-primary to-[oklch(0.42_0.12_348)]">
      <div className="text-center text-primary-foreground">
        <div className="w-20 h-20 rounded-2xl bg-white/15 backdrop-blur grid place-items-center mx-auto mb-4 text-3xl font-extrabold">
          P
        </div>
        <h1 className="text-2xl font-bold">Point Scan</h1>
        <p className="text-sm opacity-80">Point do Açaí d'Amazônia</p>
        <div className="mt-6 w-6 h-6 mx-auto border-2 border-white/40 border-t-white rounded-full animate-spin" />
      </div>
    </div>
  );
}
