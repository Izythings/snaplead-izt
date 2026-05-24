import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    const result =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setLoading(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }

    if (mode === "signup" && !result.data.session) {
      setMessage("Compte créé. Vérifie ton email si la confirmation est activée dans Supabase.");
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-ink px-4 text-paper">
      <form onSubmit={submit} className="w-full max-w-sm rounded border border-white/10 bg-white/[0.04] p-5">
        <div className="mb-6">
          <div className="mb-2 text-2xl font-semibold">Scovio.io</div>
          <p className="text-sm text-paper/60">Connexion email et mot de passe.</p>
        </div>
        <label className="mb-2 block text-sm text-paper/70">Email</label>
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          required
          className="mb-3 w-full rounded border border-white/10 bg-white px-3 py-2 text-ink outline-none focus:border-brick"
        />
        <label className="mb-2 block text-sm text-paper/70">Mot de passe</label>
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          required
          minLength={6}
          className="mb-3 w-full rounded border border-white/10 bg-white px-3 py-2 text-ink outline-none focus:border-brick"
        />
        <button disabled={loading} className="w-full rounded bg-brick px-4 py-2 font-medium text-white disabled:opacity-60">
          {loading ? "Connexion" : mode === "signin" ? "Se connecter" : "Créer le compte"}
        </button>
        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError("");
            setMessage("");
          }}
          className="mt-3 w-full rounded border border-white/10 px-4 py-2 text-sm text-paper/80 hover:bg-white/10"
        >
          {mode === "signin" ? "Créer un compte" : "J'ai déjà un compte"}
        </button>
        {message && <p className="mt-3 text-sm text-good">{message}</p>}
        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
      </form>
    </main>
  );
}
