"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

export function DiscordLoginButton() {
  const [error, setError] = useState<string | null>(null);

  async function signInWithDiscord() {
    setError(null);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    });

    if (signInError) {
      setError("La connexion Discord est indisponible. Réessaie dans un instant.");
    }
  }

  return (
    <div className="auth-action">
      <button className="discord-button" type="button" onClick={signInWithDiscord}>
        Continuer avec Discord
      </button>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </div>
  );
}
