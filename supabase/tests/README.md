# Tests de base de données

Avec la CLI Supabase et la stack locale démarrée, exécuter le test d’identité Discord :

```sh
supabase start
bun run test:db
```

`bun run test:db` lance `supabase test db supabase/tests/discord_identity.sql`. Le test pgTAP est transactionnel : ses utilisateurs et profils de fixture sont annulés à la fin.
