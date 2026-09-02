import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.resolve(process.cwd(), "supabase/migrations/0001_foundation.sql"),
  "utf8"
);

describe("migration Discord identity", () => {
  it("rejects an update that replaces the Discord identifier", () => {
    expect(migration).toMatch(/create or replace function public\.prevent_discord_id_change\(\)/);
    expect(migration).toMatch(/if new\.discord_id is distinct from old\.discord_id then\s+raise exception/i);
    expect(migration).toMatch(/create trigger profiles_prevent_discord_id_change\s+before update on public\.profiles/i);
  });
});
