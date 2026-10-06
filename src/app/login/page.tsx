import { loginAction } from "@/app/actions";
import { Shell } from "@/components/ui";
import { getContainer } from "@/lib/container";

export const dynamic = "force-dynamic";

export default async function Login({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const [{ erro }, c] = await Promise.all([searchParams, getContainer()]);
  return (
    <Shell user={null}>
      <div className="mx-auto max-w-sm rounded-xl border border-stone-200 bg-white p-6">
        <h1 className="text-xl font-bold">Entrar</h1>
        {c.auth.kind === "dev" && (
          <p className="mt-2 rounded bg-amber-50 p-2 text-xs text-amber-900">
            Login simulado (desenvolvimento): qualquer e-mail válido entra, sem senha.
          </p>
        )}
        <form action={loginAction} className="mt-4 space-y-3">
          <input name="email" type="email" required placeholder="voce@email.com" className="w-full rounded-lg border border-stone-300 px-3 py-2" />
          {erro && <p className="text-sm text-red-600">E-mail inválido.</p>}
          <button className="w-full rounded-lg bg-brand py-2 font-semibold text-white hover:bg-brand-dark">Continuar</button>
        </form>
      </div>
    </Shell>
  );
}
