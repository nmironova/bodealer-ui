import {
  CalculationType,
  type AdvancedCombinationFilter,
  type CombinationRangeFilter,
  type CombinationSeat,
  type ExcludeCombinationFilter,
  type PlayerRestrictions,
  type PostmortemMode,
  type RangeConstraint,
  type RelativeSeatRestrictions,
  type Strain,
  type TaskConfigDto,
  type WalrusRangeFilterName,
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

export function readContractDeclarer(formData: FormData): "N" | "S" | null {
  // Older boards omit this setting and have always been played by South.
  const raw = formData.get("contractDeclarer") ?? "S";
  return raw === "N" || raw === "S" ? raw : null;
}

export function countCardsFromHandText(hand: string): number {
  const suits = hand.trim().split(/\s+/);
  if (suits.length !== 4) return 0;

  let count = 0;
  for (const suit of suits) {
    if (suit === "-") continue;
    const ranks = suit.toUpperCase().match(/10|[AKQJ2-9]/g);
    if (
      !ranks ||
      ranks.join("") !== suit.toUpperCase() ||
      new Set(ranks).size !== ranks.length
    )
      return 0;
    count += ranks.length;
  }
  return count;
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
  checkRange(player.suitPoints?.spades, "spade points", 0, 10);
  checkRange(player.suitPoints?.hearts, "heart points", 0, 10);
  checkRange(player.suitPoints?.diamonds, "diamond points", 0, 10);
  checkRange(player.suitPoints?.clubs, "club points", 0, 10);

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

  const spadesPointsMin = readOptionalNumber(
    formData,
    `${prefix}.spadesPointsMin`,
  );
  const spadesPointsMax = readOptionalNumber(
    formData,
    `${prefix}.spadesPointsMax`,
  );
  const heartsPointsMin = readOptionalNumber(
    formData,
    `${prefix}.heartsPointsMin`,
  );
  const heartsPointsMax = readOptionalNumber(
    formData,
    `${prefix}.heartsPointsMax`,
  );
  const diamondsPointsMin = readOptionalNumber(
    formData,
    `${prefix}.diamondsPointsMin`,
  );
  const diamondsPointsMax = readOptionalNumber(
    formData,
    `${prefix}.diamondsPointsMax`,
  );
  const clubsPointsMin = readOptionalNumber(
    formData,
    `${prefix}.clubsPointsMin`,
  );
  const clubsPointsMax = readOptionalNumber(
    formData,
    `${prefix}.clubsPointsMax`,
  );

  const noSixCardSuit = readCheckbox(formData, `${prefix}.noSixCardSuit`);
  const noOvercall =
    prefix === "lho" || prefix === "rho"
      ? readCheckbox(formData, `${prefix}.noOvercall`)
      : undefined;

  const hcp = buildRange(hcpMin, hcpMax);

  const suitLengths = {
    spades: buildRange(spadesMin, spadesMax),
    hearts: buildRange(heartsMin, heartsMax),
    diamonds: buildRange(diamondsMin, diamondsMax),
    clubs: buildRange(clubsMin, clubsMax),
  };

  const hasSuitLengths = Object.values(suitLengths).some(Boolean);
  const suitPoints = {
    spades: buildRange(spadesPointsMin, spadesPointsMax),
    hearts: buildRange(heartsPointsMin, heartsPointsMax),
    diamonds: buildRange(diamondsPointsMin, diamondsPointsMax),
    clubs: buildRange(clubsPointsMin, clubsPointsMax),
  };
  const hasSuitPoints = Object.values(suitPoints).some(Boolean);
  const shape = noSixCardSuit ? { noSixCardSuit: true } : undefined;

  if (!hcp && !hasSuitLengths && !hasSuitPoints && !shape && !noOvercall) {
    return undefined;
  }

  return {
    hcp,
    suitLengths: hasSuitLengths ? suitLengths : undefined,
    suitPoints: hasSuitPoints ? suitPoints : undefined,
    shape,
    noOvercall,
  };
}

const COMBINATION_SEATS = new Set<CombinationSeat>(["partner", "lho", "rho"]);
const COMBINATION_FILTERS = new Set<WalrusRangeFilterName>([
  "PointsRange",
  "ControlsRange",
  "SpadesLen",
  "HeartsLen",
  "DiamondsLen",
  "ClubsLen",
]);

function readCombinationRangeFilter(
  value: unknown,
): CombinationRangeFilter | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const seat = candidate.seat as CombinationSeat;
  const filter = candidate.filter as WalrusRangeFilterName;
  const min = Number(candidate.min);
  const max = Number(candidate.max);

  if (
    candidate.type !== "range" ||
    !COMBINATION_SEATS.has(seat) ||
    !COMBINATION_FILTERS.has(filter) ||
    !Number.isInteger(min) ||
    !Number.isInteger(max)
  ) {
    return null;
  }

  return { type: "range", seat, filter, min, max };
}

export function readCombinations(
  formData: FormData,
): AdvancedCombinationFilter[] {
  const raw = String(formData.get("combinations") ?? "").trim();
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const combinations: AdvancedCombinationFilter[] = [];
  for (const value of parsed) {
    if (!value || typeof value !== "object") continue;
    const candidate = value as Record<string, unknown>;
    const seat = candidate.seat as CombinationSeat;
    if (!COMBINATION_SEATS.has(seat) || !Array.isArray(candidate.filters))
      continue;

    if (candidate.type === "anyInListBelow") {
      const filters = candidate.filters
        .map(readCombinationRangeFilter)
        .filter((item): item is CombinationRangeFilter => item !== null);
      if (filters.length > 0) {
        combinations.push({ type: "anyInListBelow", seat, filters });
      }
      continue;
    }

    if (candidate.type !== "excludeCombination") continue;

    const filters: ExcludeCombinationFilter["filters"] = [];
    for (const child of candidate.filters) {
      const range = readCombinationRangeFilter(child);
      if (range) {
        filters.push(range);
        continue;
      }
      if (!child || typeof child !== "object") continue;
      const group = child as Record<string, unknown>;
      const groupSeat = group.seat as CombinationSeat;
      if (
        group.type !== "anyInListBelow" ||
        !COMBINATION_SEATS.has(groupSeat) ||
        !Array.isArray(group.filters)
      )
        continue;
      const groupFilters = group.filters
        .map(readCombinationRangeFilter)
        .filter((item): item is CombinationRangeFilter => item !== null);
      if (groupFilters.length > 0) {
        filters.push({
          type: "anyInListBelow",
          seat: groupSeat,
          filters: groupFilters,
        });
      }
    }
    if (filters.length > 0) {
      combinations.push({ type: "excludeCombination", seat, filters });
    }
  }
  return combinations;
}

export function validateCombinations(
  combinations: AdvancedCombinationFilter[],
): string[] {
  const errors: string[] = [];
  const validateRange = (range: CombinationRangeFilter) => {
    const maximum =
      range.filter === "PointsRange"
        ? 37
        : range.filter === "ControlsRange"
          ? 12
          : 13;
    if (range.min < 0 || range.max > maximum || range.min > range.max) {
      errors.push(
        `${range.filter} must be between 0 and ${maximum}, with min no greater than max.`,
      );
    }
  };
  for (const combination of combinations) {
    for (const filter of combination.filters) {
      if (filter.type === "range") validateRange(filter);
      else filter.filters.forEach(validateRange);
    }
  }
  return errors;
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
  const declarer = readContractDeclarer(formData) ?? "S";
  const combinations = readCombinations(formData);

  return {
    meta: {
      name,
      description: description || undefined,
    },
    deal: {
      fixedSeat: "N",
      fixedHand,
      restrictions: buildRestrictions(formData),
      combinations: combinations.length > 0 ? combinations : undefined,
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
        declarer,
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
