import { JSDOM } from "jsdom";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import RootLayout from "../../app/layout";
import HomePage from "../../app/page";

if (typeof document === "undefined") {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost"
  });

  Object.defineProperties(globalThis, {
    document: { configurable: true, value: dom.window.document },
    window: { configurable: true, value: dom.window }
  });
}

const { render, screen } = await import("@testing-library/react");

describe("socle applicatif", () => {
  it("expose le layout racine", () => {
    expect(typeof RootLayout).toBe("function");
  });

  it("affiche le contenu principal et son titre", () => {
    render(createElement(HomePage));

    expect(screen.getByRole("main")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1, name: "SAE Platform" })).toBeTruthy();
  });
});
