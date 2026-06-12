import { describe, expect, it } from "vitest";
import {
  analyzeImportDraft,
  createImportDraft,
  deleteRawText,
  discardImportDraft,
  findDuplicatePersons,
  selectedFieldsToPersonInput,
} from "../src/services/importDraftService";

describe("ImportDraft", () => {
  it("erstellt, analysiert, verwirft und löscht Rohtext", () => {
    const d = createImportDraft({
      sourceType: "Facebook",
      rawText: "Michelle Schuster\nLebt in Gießen",
    });
    expect(d.status).toBe("draft");
    expect(analyzeImportDraft(d).extractedJson).toContain("Michelle");
    expect(discardImportDraft(d).status).toBe("rejected");
    expect(deleteRawText(d).rawText).toBe("");
  });
  it("übernimmt ausgewählte Felder und findet Dubletten", () => {
    const d = createImportDraft({
      sourceType: "Facebook",
      sourceUrl: "https://example.test/p",
      rawText: "Michelle Schuster\nLebt in Gießen",
    });
    const parsed = JSON.parse(d.extractedJson);
    const input = selectedFieldsToPersonInput(parsed.person);
    expect(input.displayName).toBe("Michelle Schuster");
    expect(
      findDuplicatePersons(parsed, [
        { id: "1", displayName: "Michelle Schuster", city: "Gießen" },
      ]),
    ).toHaveLength(1);
    expect(
      findDuplicatePersons(
        parsed,
        [{ id: "2", displayName: "X", sourceUrl: "https://example.test/p" }],
        d.sourceUrl,
      ),
    ).toHaveLength(1);
  });
});
