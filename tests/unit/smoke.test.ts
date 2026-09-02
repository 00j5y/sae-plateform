import { describe, expect, it } from "vitest";
import RootLayout from "../../app/layout";
import HomePage from "../../app/page";

describe("socle applicatif", () => {
  it("expose le layout racine", () => {
    expect(typeof RootLayout).toBe("function");
  });

  it("expose la page d’accueil", () => {
    expect(typeof HomePage).toBe("function");
  });
});
