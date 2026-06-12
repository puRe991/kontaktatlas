import {
  Confidence,
  ExtractedField,
  ParsedProfileText,
  SENSITIVE_FIELDS,
} from "../types/domain";

const NAME_RE =
  /(?:Profil von\s+)?([A-ZÄÖÜ][a-zäöüß]+|[A-ZÄÖÜ][a-zäöüß]+\.)\s+([A-ZÄÖÜ][a-zäöüß]+|[A-ZÄÖÜ]\.)/;
const PLATE_RE = /\b[A-ZÄÖÜ]{1,3}-[A-ZÄÖÜ]{1,2}\s?\d{1,4}\b/;
const VEHICLE_RE =
  /(?:fährt|Auto:\s*)\s*([A-ZÄÖÜa-zäöüß]+)\s+([A-Z0-9ÄÖÜa-zäöüß-]+)|\b(schwarzer|schwarze|weißer|weiße|roter|rote|blauer|blaue|grauer|graue)\s+([A-ZÄÖÜa-zäöüß]+)\b/g;

function confidence(value: string, base: Confidence = "high"): Confidence {
  if (!value || value.includes(".")) return "low";
  return base;
}

function field(
  entity: ExtractedField["entity"],
  fieldName: string,
  value: string,
  sourceText: string,
  conf: Confidence = "high",
  warning?: string,
): ExtractedField {
  const sensitive = SENSITIVE_FIELDS.has(fieldName);
  return {
    id: `${entity}:${fieldName}:${sourceText}:${value}`
      .replace(/\s+/g, "-")
      .slice(0, 120),
    entity,
    fieldName,
    value: value.trim(),
    confidence: conf,
    sourceText: sourceText.trim(),
    warning,
    sensitive,
    selectedByDefault: !sensitive && conf !== "low",
  };
}

function findLine(
  lines: string[],
  regex: RegExp,
): RegExpMatchArray | undefined {
  for (const line of lines) {
    const match = line.match(regex);
    if (match) return match;
  }
  return undefined;
}

export function parseProfileText(rawText: string): ParsedProfileText {
  const text = rawText.replace(/\r/g, "").trim();
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const person: ExtractedField[] = [];
  const relationships: ExtractedField[] = [];
  const groups: ExtractedField[] = [];
  const vehicles: ExtractedField[] = [];
  const missingInfo: ParsedProfileText["missingInfo"] = [];
  const warnings: string[] = [];

  const nameMatch =
    findLine(lines, NAME_RE) ?? text.match(NAME_RE) ?? undefined;
  if (nameMatch) {
    const displayName = `${nameMatch[1]} ${nameMatch[2]}`;
    person.push(
      field(
        "person",
        "displayName",
        displayName,
        nameMatch[0],
        confidence(displayName),
      ),
    );
    if (!nameMatch[1].endsWith("."))
      person.push(
        field("person", "firstName", nameMatch[1], nameMatch[0], "high"),
      );
    if (!nameMatch[2].endsWith("."))
      person.push(
        field("person", "lastName", nameMatch[2], nameMatch[0], "high"),
      );
  } else {
    missingInfo.push({
      fieldName: "displayName",
      message: "Kein sicherer Personenname erkannt.",
      severity: "critical",
    });
  }

  const cityMatch = text.match(
    /(?:Lebt in|Wohnt in|Aktueller Wohnort:)\s+([^\n,]+)/i,
  );
  if (cityMatch)
    person.push(field("person", "city", cityMatch[1], cityMatch[0], "high"));
  else
    missingInfo.push({
      fieldName: "city",
      message: "Wohnort fehlt.",
      severity: "warning",
    });

  const originMatch = text.match(/(?:Kommt aus|Geboren in|Aus)\s+([^\n,]+)/i);
  if (originMatch)
    person.push(
      field("person", "originCity", originMatch[1], originMatch[0], "medium"),
    );
  else
    missingInfo.push({
      fieldName: "originCity",
      message: "Herkunftsort fehlt.",
      severity: "info",
    });

  const fullBirth = text.match(
    /(?:Geboren am|Geburtstag:)\s*(\d{1,2}\.\d{1,2}\.\d{4}|\d{1,2}\.\s*[A-ZÄÖÜa-zäöüß]+\s+\d{4})/i,
  );
  const partialBirth = text.match(
    /(?:Geburtstag:|Hat am)\s*(\d{1,2}\.\s*[A-ZÄÖÜa-zäöüß]+)(?:\s+Geburtstag)?/i,
  );
  if (fullBirth)
    person.push(
      field(
        "person",
        "birthDate",
        fullBirth[1],
        fullBirth[0],
        "high",
        "Geburtsdatum ist sensibel und muss bestätigt werden.",
      ),
    );
  else if (partialBirth) {
    const msg =
      "Geburtsdatum ohne Jahreszahl erkannt; Aussagekraft ist begrenzt.";
    warnings.push(msg);
    person.push(
      field(
        "person",
        "birthDate",
        partialBirth[1],
        partialBirth[0],
        "low",
        msg,
      ),
    );
  } else
    missingInfo.push({
      fieldName: "birthDate",
      message: "Geburtstag fehlt.",
      severity: "info",
    });

  const roleMatch =
    text.match(/(?:Arbeitet bei|Mitglied bei|Studiert an)\s+([^\n]+)/i) ??
    text.match(/(Feuerwehr\s+[^\n]+)/i);
  if (roleMatch)
    person.push(field("person", "role", roleMatch[1], roleMatch[0], "medium"));

  const relationPatterns: Array<[RegExp, string]> = [
    [/(Freundin mit|Befreundet mit)\s+([A-ZÄÖÜ][^\n]+)/gi, "Freundschaft"],
    [/(Verheiratet mit)\s+([A-ZÄÖÜ][^\n]+)/gi, "Familie"],
    [
      /(Schwester von|Bruder von|Mutter von|Vater von)\s+([A-ZÄÖÜ][^\n]*)/gi,
      "Familie",
    ],
    [/(Kennt)\s+([A-ZÄÖÜ][^\n]+)/gi, "kennt"],
  ];
  for (const [regex, type] of relationPatterns) {
    for (const match of text.matchAll(regex)) {
      const target = (match[2] || "").trim();
      if (target)
        relationships.push(
          field("relationship", type, target, match[0], "medium"),
        );
    }
  }
  if (!relationships.length)
    missingInfo.push({
      fieldName: "relationships",
      message: "Keine Beziehung erkannt.",
      severity: "warning",
    });

  for (const groupName of [
    "Feuerwehr",
    "Verein",
    "Familie",
    "Arbeit",
    "Nachbarschaft",
  ]) {
    const regex = new RegExp(`\\b${groupName}\\b`, "i");
    const match = text.match(regex);
    if (match)
      groups.push(field("group", "name", groupName, match[0], "medium"));
  }

  for (const match of text.matchAll(VEHICLE_RE)) {
    const value =
      match[1] && match[2]
        ? `${match[1]} ${match[2]}`
        : `${match[3]} ${match[4]}`;
    vehicles.push(field("vehicle", "vehicle", value, match[0], "medium"));
  }
  const plate = text.match(PLATE_RE);
  if (plate) {
    const msg =
      "Kennzeichen ist sensibel und wird nie automatisch vorausgewählt.";
    warnings.push(msg);
    vehicles.push(
      field("vehicle", "licensePlate", plate[0], plate[0], "medium", msg),
    );
  }

  return {
    person,
    relationships,
    groups,
    vehicles,
    missingInfo,
    warnings,
    confidence: person.some((p) => p.confidence === "high") ? "medium" : "low",
  };
}
