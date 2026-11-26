export const BOARD_FILE_FORMAT = "bodealer-board";
export const BOARD_FILE_VERSION = 1;

type BoardFile = {
  format: typeof BOARD_FILE_FORMAT;
  version: typeof BOARD_FILE_VERSION;
  values: Record<string, string>;
};

const SIMPLE_FIELDS = new Set([
  "name",
  "description",
  "taskType",
  "contractLevel",
  "contractStrain",
  "contractDeclarer",
  "boardsK",
  "postmortem",
  "hand",
  "combinations",
]);

const RESTRICTION_FIELD =
  /^(partner|lho|rho)\.(hcp|spades|hearts|diamonds|clubs|spadesPoints|heartsPoints|diamondsPoints|clubsPoints)(Min|Max)$/;
const RESTRICTION_FLAG =
  /^(?:(partner|lho|rho)\.noSixCardSuit|(lho|rho)\.noOvercall)$/;

function isSupportedField(name: string) {
  return (
    SIMPLE_FIELDS.has(name) ||
    RESTRICTION_FIELD.test(name) ||
    RESTRICTION_FLAG.test(name)
  );
}

export function createBoardFile(values: Record<string, string>): BoardFile {
  return {
    format: BOARD_FILE_FORMAT,
    version: BOARD_FILE_VERSION,
    values: Object.fromEntries(
      Object.entries(values).filter(
        ([name, value]) => isSupportedField(name) && value !== "",
      ),
    ),
  };
}

export function parseBoardFile(text: string): Record<string, string> {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("This is not a valid JSON board file.");
  }

  if (!data || typeof data !== "object") {
    throw new Error("The board file has an invalid structure.");
  }

  const candidate = data as Partial<BoardFile>;
  if (candidate.format !== BOARD_FILE_FORMAT) {
    throw new Error("This file is not a Bodealer board file.");
  }
  if (candidate.version !== BOARD_FILE_VERSION) {
    throw new Error(
      `Board file version ${String(candidate.version)} is not supported.`,
    );
  }
  if (!candidate.values || typeof candidate.values !== "object") {
    throw new Error("The board file does not contain settings.");
  }

  const values: Record<string, string> = {};
  for (const [name, value] of Object.entries(candidate.values)) {
    if (!isSupportedField(name) || typeof value !== "string") {
      throw new Error(`The board file contains an invalid setting: ${name}.`);
    }
    if (value.length > 10_000) {
      throw new Error(`The setting ${name} is too long.`);
    }
    values[name] = value;
  }

  if (values.combinations) {
    try {
      if (!Array.isArray(JSON.parse(values.combinations))) throw new Error();
    } catch {
      throw new Error("The advanced combinations setting is invalid.");
    }
  }

  return values;
}

export function boardFileName(name?: string) {
  const safeName = (name?.trim() || "board")
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `${safeName || "board"}.bodealer.json`;
}
