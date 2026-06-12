import { describe, expect, it } from "vitest";
import { parseProfileText } from "../src/services/profileTextParser";

describe("ProfileTextParser", () => {
  it("erkennt Namen, Wohnort und Herkunftsort", () => {
    const p = parseProfileText(
      "Profil von Daniel Becker\nLebt in Gießen\nKommt aus Rodheim-Bieber",
    );
    expect(p.person.find((f) => f.fieldName === "displayName")?.value).toBe(
      "Daniel Becker",
    );
    expect(p.person.find((f) => f.fieldName === "city")?.value).toBe("Gießen");
    expect(p.person.find((f) => f.fieldName === "originCity")?.value).toBe(
      "Rodheim-Bieber",
    );
  });
  it("erkennt Geburtstag mit und ohne Jahreszahl", () => {
    const full = parseProfileText("Michelle Schuster\nGeboren am 12.04.1996");
    expect(
      full.person.find((f) => f.fieldName === "birthDate")?.confidence,
    ).toBe("high");
    const partial = parseProfileText(
      "Michelle Schuster\nGeburtstag: 12. April",
    );
    expect(
      partial.person.find((f) => f.fieldName === "birthDate")?.confidence,
    ).toBe("low");
    expect(partial.warnings.length).toBeGreaterThan(0);
  });
  it("erkennt Beziehungen", () => {
    const p = parseProfileText(
      "Katja Schuster\nBefreundet mit Tom Weber\nSchwester von Daniel Schuster",
    );
    expect(p.relationships).toHaveLength(2);
  });
  it("erkennt Fahrzeuge und Kennzeichen als sensiblen nicht vorausgewählten Vorschlag", () => {
    const p = parseProfileText(
      "Daniel Becker fährt VW Golf\nKennzeichen: GI-XX 123",
    );
    const plate = p.vehicles.find((f) => f.fieldName === "licensePlate");
    expect(p.vehicles.some((f) => f.value.includes("VW Golf"))).toBe(true);
    expect(plate?.sensitive).toBe(true);
    expect(plate?.selectedByDefault).toBe(false);
  });
});
