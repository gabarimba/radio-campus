import { describe, expect, it } from "vitest";
import { getPublicSiteOrigin, getVotingUrl } from "./public-url";

describe("URL pública de la votación", () => {
  it("usa el dominio canónico desde cualquier deployment Vercel", () => {
    expect(getPublicSiteOrigin("https://sistema-radio-campus-lmxcp3hui-gab-628d.vercel.app"))
      .toBe("https://sistema-radio-campus.vercel.app");
  });

  it("prefiere el dominio configurado", () => {
    expect(getPublicSiteOrigin("https://preview.vercel.app", "https://radio.example.edu/path"))
      .toBe("https://radio.example.edu");
  });

  it("conserva el host local para desarrollo", () => {
    expect(getPublicSiteOrigin("http://localhost:3000")).toBe("http://localhost:3000");
  });

  it("genera un QR hacia la ruta de votación en el dominio público", () => {
    expect(getVotingUrl("https://sistema-radio-campus-lmxcp3hui-gab-628d.vercel.app", "round-123"))
      .toBe("https://sistema-radio-campus.vercel.app/votar?r=round-123");
  });
});
