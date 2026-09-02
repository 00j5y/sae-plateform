import { DiscordLoginButton } from "@/components/auth/discord-login-button";

export default function LoginPage() {
  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <p className="eyebrow">SAE Platform</p>
        <h1 id="login-title">Espace privé</h1>
        <p>Connecte-toi avec le compte Discord utilisé par ton équipe.</p>
        <DiscordLoginButton />
      </section>
    </main>
  );
}
