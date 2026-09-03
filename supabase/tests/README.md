# Tests de base de données

Avec la CLI Supabase et la stack locale démarrée, exécuter toute la suite pgTAP :

```sh
supabase start
bun run test:db
```

`bun run test:db` lance `supabase test db supabase/tests` et exécute tous les fichiers SQL de ce dossier, dont les contrôles d’identité Discord et d’accès Kanban. Chaque test pgTAP est transactionnel : ses fixtures sont annulées à la fin.

## OAuth Discord local

1. Créer une application dans le [Discord Developer Portal](https://discord.com/developers/applications), puis ajouter exactement cette URI dans **OAuth2 → Redirects** : `http://localhost:54321/auth/v1/callback`.
2. Copier l’identifiant client et le secret dans le fichier racine `.env` (ignoré par Git), en partant de `.env.example` :

   ```sh
   SUPABASE_AUTH_EXTERNAL_DISCORD_CLIENT_ID=
   SUPABASE_AUTH_EXTERNAL_DISCORD_SECRET=
   ```

3. Pour tester OAuth, remplacer localement `enabled = false` par `enabled = true` dans la section `[auth.external.discord]` de `supabase/config.toml`. Ne pas commiter cette modification.
4. Redémarrer la stack locale pour recharger la configuration : `supabase stop && supabase start`.

La configuration versionnée garde OAuth Discord désactivé : un clone démarre sans variables Discord. Les identifiants sont lus avec `env(...)` uniquement après l’activation locale et ne doivent jamais être commités.
