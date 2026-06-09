import { useState } from "react";
import { supabase } from "../infrastructure/supabase/client";

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

  const sendMagicLink = async () => {
    setError("");
    setMessage("");
    if (!email) {
      setError("Renseigne ton adresse email.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
        shouldCreateUser: false,
      },
    });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }
    setMessage("Lien de connexion envoyé. Vérifie ta boîte email.");
  };

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 text-foreground">
      <form onSubmit={submit} className="snap-panel w-full max-w-sm p-6 shadow-[var(--shadow-elegant)]">
        <div className="mb-6">
          <div className="mb-2 text-2xl font-semibold">Scovio.io</div>
          <p className="text-sm text-muted">Connexion email et mot de passe.</p>
        </div>
        <label htmlFor="auth-email" className="mb-2 block text-sm font-medium">Email</label>
        <input
          id="auth-email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          required
          className="snap-input mb-3 px-3 py-2"
        />
        <label htmlFor="auth-password" className="mb-2 block text-sm font-medium">Mot de passe</label>
        <input
          id="auth-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          required
          minLength={6}
          className="snap-input mb-3 px-3 py-2"
        />
        <button disabled={loading} className="snap-button w-full disabled:opacity-60">
          {loading ? "Connexion" : mode === "signin" ? "Se connecter" : "Créer le compte"}
        </button>
        {mode === "signin" && (
          <button type="button" disabled={loading} onClick={sendMagicLink} className="snap-button-secondary mt-3 w-full disabled:opacity-60">
            Recevoir un lien de connexion
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError("");
            setMessage("");
          }}
          className="snap-button-secondary mt-3 w-full"
        >
          {mode === "signin" ? "Créer un compte" : "J'ai déjà un compte"}
        </button>
        {message && <p className="mt-3 text-sm text-good">{message}</p>}
        {error && <p className="mt-3 text-sm text-destructive" role="alert">{error}</p>}
      </form>
    </main>
  );
}
