import {
  CalculationType,
  type PlayerRestrictions,
  type PostmortemMode,
  type RangeConstraint,
  type RelativeSeatRestrictions,
  type Strain,
  type TaskConfigDto,
} from "./dto/task-config";

export const ENABLED_CALCULATION_TYPES = new Set<CalculationType>([
  CalculationType.ONE_SIDED_BIDDING_LEVEL,
  CalculationType.SEEK_OPENING_LEAD,
]);

export function toInt(value: FormDataEntryValue | null): number | null {
  if (value == null) return null;
  const n = Number(String(value));
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

export function readCalculationType(
  formData: FormData,
): CalculationType | null {
  const raw = String(formData.get("taskType") ?? "");
  return Object.values(CalculationType).includes(raw as CalculationType)
    ? (raw as CalculationType)
    : null;
}

export function isEnabledCalculationType(
  calculationType: CalculationType | null,
): calculationType is CalculationType {
  return Boolean(
    calculationType && ENABLED_CALCULATION_TYPES.has(calculationType),
  );
}

export function readContractLevel(
  formData: FormData,
): NonNullable<TaskConfigDto["calculation"]["targetContract"]>["level"] | null {
  const level = toInt(formData.get("contractLevel"));

  if (
    level === 1 ||
    level === 2 ||
    level === 3 ||
    level === 4 ||
    level === 5 ||
    level === 6 ||
    level === 7
  ) {
    return level;
  }

  return null;
}

export function readContractStrain(formData: FormData): Strain | null {
  const raw = String(formData.get("contractStrain") ?? "");

  if (
    raw === "S" ||
    raw === "H" ||
    raw === "D" ||
    raw === "C" ||
    raw === "NT"
  ) {
    return raw;
  }

  return null;
}

export function readPostmortemMode(formData: FormData): PostmortemMode | null {
  const raw = String(formData.get("postmortem") ?? "");

  if (raw === "AUTO" || raw === "SUIT") {
    return raw;
  }

  return null;
}

export function countCardsFromHandText(hand: string): number {
  const suits = hand.trim().split(/\s+/);
  if (suits.length !== 4) return 0;

  return suits.reduce((sum, suitText) => {
    if (suitText === "-") return sum;

    let i = 0;
    let count = 0;

    while (i < suitText.length) {
      if (suitText.startsWith("10", i)) {
        count += 1;
        i += 2;
      } else {
        count += 1;
        i += 1;
      }
    }

    return sum + count;
  }, 0);
}

export function validatePlayerRestrictions(
  player: PlayerRestrictions | undefined,
  label: string,
): string[] {
  if (!player) return [];

  const errors: string[] = [];

  const checkRange = (
    range: RangeConstraint | undefined,
    fieldName: string,
    minAllowed: number,
    maxAllowed: number,
  ) => {
    if (!range) return;

    if (
      range.min !== undefined &&
      (range.min < minAllowed || range.min > maxAllowed)
    ) {
      errors.push(
        `${label}: ${fieldName} min must be between ${minAllowed} and ${maxAllowed}`,
      );
    }

    if (
      range.max !== undefined &&
      (range.max < minAllowed || range.max > maxAllowed)
    ) {
      errors.push(
        `${label}: ${fieldName} max must be between ${minAllowed} and ${maxAllowed}`,
      );
    }

    if (
      range.min !== undefined &&
      range.max !== undefined &&
      range.min > range.max
    ) {
      errors.push(
        `${label}: ${fieldName} min (${range.min}) cannot be greater than max (${range.max})`,
      );
    }
  };

  checkRange(player.hcp, "HCP", 0, 37);
  checkRange(player.suitLengths?.spades, "spades", 0, 13);
  checkRange(player.suitLengths?.hearts, "hearts", 0, 13);
  checkRange(player.suitLengths?.diamonds, "diamonds", 0, 13);
  checkRange(player.suitLengths?.clubs, "clubs", 0, 13);

  return errors;
}

function readOptionalNumber(
  formData: FormData,
  key: string,
): number | undefined {
  const raw = formData.get(key);
  if (raw === null) return undefined;

  const normalized = String(raw).trim();
  if (normalized === "") return undefined;

  const value = Number(normalized);
  return Number.isFinite(value) ? value : undefined;
}

function readCheckbox(formData: FormData, key: string): boolean | undefined {
  return formData.get(key) === "true" ? true : undefined;
}

function buildRange(min?: number, max?: number): RangeConstraint | undefined {
  if (min === undefined && max === undefined) return undefined;
  return { min, max };
}

function buildPlayerRestrictions(
  formData: FormData,
  prefix: string,
): PlayerRestrictions | undefined {
  const hcpMin = readOptionalNumber(formData, `${prefix}.hcpMin`);
  const hcpMax = readOptionalNumber(formData, `${prefix}.hcpMax`);

  const spadesMin = readOptionalNumber(formData, `${prefix}.spadesMin`);
  const spadesMax = readOptionalNumber(formData, `${prefix}.spadesMax`);
  const heartsMin = readOptionalNumber(formData, `${prefix}.heartsMin`);
  const heartsMax = readOptionalNumber(formData, `${prefix}.heartsMax`);
  const diamondsMin = readOptionalNumber(formData, `${prefix}.diamondsMin`);
  const diamondsMax = readOptionalNumber(formData, `${prefix}.diamondsMax`);
  const clubsMin = readOptionalNumber(formData, `${prefix}.clubsMin`);
  const clubsMax = readOptionalNumber(formData, `${prefix}.clubsMax`);

  const noSixCardSuit = readCheckbox(formData, `${prefix}.noSixCardSuit`);

  const hcp = buildRange(hcpMin, hcpMax);

  const suitLengths = {
    spades: buildRange(spadesMin, spadesMax),
    hearts: buildRange(heartsMin, heartsMax),
    diamonds: buildRange(diamondsMin, diamondsMax),
    clubs: buildRange(clubsMin, clubsMax),
  };

  const hasSuitLengths = Object.values(suitLengths).some(Boolean);
  const shape = noSixCardSuit ? { noSixCardSuit: true } : undefined;

  if (!hcp && !hasSuitLengths && !shape) {
    return undefined;
  }

  return {
    hcp,
    suitLengths: hasSuitLengths ? suitLengths : undefined,
    shape,
  };
}

export function buildRestrictions(
  formData: FormData,
): RelativeSeatRestrictions | undefined {
  const partner = buildPlayerRestrictions(formData, "partner");
  const lho = buildPlayerRestrictions(formData, "lho");
  const rho = buildPlayerRestrictions(formData, "rho");

  if (!partner && !lho && !rho) return undefined;

  return { partner, lho, rho };
}

export function formDataToTaskConfigDto(
  formData: FormData,
  fixedHand: string,
): TaskConfigDto {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const boardsK = Number(formData.get("boardsK"));
  const postmortem = readPostmortemMode(formData) ?? "AUTO";
  const type =
    readCalculationType(formData) ?? CalculationType.ONE_SIDED_BIDDING_LEVEL;
  const level = readContractLevel(formData) ?? 4;
  const strain = readContractStrain(formData) ?? "S";

  return {
    meta: {
      name,
      description: description || undefined,
    },
    deal: {
      fixedSeat: "N",
      fixedHand,
      restrictions: buildRestrictions(formData),
    },
    settings: {
      dealsK: boardsK,
      postmortem,
    },
    calculation: {
      type,
      targetContract: {
        level,
        strain,
      },
    },
  };
}

export function sanitizeFileName(value: string): string {
  return value
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 80);
}
