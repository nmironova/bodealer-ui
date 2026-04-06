"use server";

import { redirect } from "next/navigation";
import {
  CalculationType,
  type PlayerRestrictions,
  type RangeConstraint,
  type RelativeSeatRestrictions,
  type Seat,
  type SuitLengthConstraints,
  type TaskConfigDto,
} from "./dto/task-config";

export type NewTaskState = {
  message: string | null;
  errors: {
    name?: string[];
    description?: string[];
    hand?: string[];
    boardsK?: string[];
    general?: string[];
  };
};

function toInt(value: FormDataEntryValue | null): number | null {
  if (value == null) return null;
  const n = Number(String(value));
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function countCardsFromHandText(hand: string): number {
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

function validatePlayerRestrictions(
  player: PlayerRestrictions | undefined,
  label: string
): string[] {
  if (!player) return [];

  const errors: string[] = [];

  const checkRange = (
    range: RangeConstraint | undefined,
    fieldName: string,
    minAllowed: number,
    maxAllowed: number
  ) => {
    if (!range) return;

    if (
      range.min !== undefined &&
      (range.min < minAllowed || range.min > maxAllowed)
    ) {
      errors.push(
        `${label}: ${fieldName} min must be between ${minAllowed} and ${maxAllowed}`
      );
    }

    if (
      range.max !== undefined &&
      (range.max < minAllowed || range.max > maxAllowed)
    ) {
      errors.push(
        `${label}: ${fieldName} max must be between ${minAllowed} and ${maxAllowed}`
      );
    }

    if (
      range.min !== undefined &&
      range.max !== undefined &&
      range.min > range.max
    ) {
      errors.push(`${label}: ${fieldName} min cannot be greater than max`);
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
  key: string
): number | undefined {
  const raw = formData.get(key);
  if (raw === null || raw === "") return undefined;

  const value = Number(raw);
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
  prefix: string
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

function buildRestrictions(
  formData: FormData
): RelativeSeatRestrictions | undefined {
  const partner = buildPlayerRestrictions(formData, "partner");
  const lho = buildPlayerRestrictions(formData, "lho");
  const rho = buildPlayerRestrictions(formData, "rho");

  if (!partner && !lho && !rho) return undefined;

  return { partner, lho, rho };
}

function formDataToTaskConfigDto(
  formData: FormData,
  fixedHand: string
): TaskConfigDto {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const boardsK = Number(formData.get("boardsK"));

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
    },
    calculation: {
      type: CalculationType.CONTRACT_CHANCES,
      targetContract: {
        level: 4,
        strain: "S",
      },
    },
  };
}

function sanitizeFileName(value: string): string {
  return value
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 80);
}

const RELATIVE_TO_ABSOLUTE: Record<
  "partner" | "lho" | "rho",
  Record<Seat, Seat>
> = {
  partner: { N: "S", S: "N", E: "W", W: "E" },
  lho: { N: "E", E: "S", S: "W", W: "N" },
  rho: { N: "W", W: "S", S: "E", E: "N" },
};

function resolveRelativeSeat(
  baseSeat: Seat,
  relative: "partner" | "lho" | "rho"
): Seat {
  return RELATIVE_TO_ABSOLUTE[relative][baseSeat];
}

function normalizeSuitText(suitText: string): string {
  if (suitText === "-") return "";
  return suitText.toUpperCase().replace(/10/g, "T");
}

function buildHandLine(seat: Seat, handText: string): string {
  const parts = handText.trim().split(/\s+/);
  if (parts.length !== 4) {
    throw new Error(`Invalid hand text: "${handText}"`);
  }

  const [spades, hearts, diamonds, clubs] = parts.map(normalizeSuitText);
  return `HAND: ${seat}:${spades}.${hearts}.${diamonds}.${clubs}`;
}

function buildPrimaryScorer(task: TaskConfigDto): string {
  const target = task.calculation.targetContract;
  if (!target) {
    throw new Error("targetContract is required for CONTRACT_CHANCES");
  }

  const declarer = resolveRelativeSeat(task.deal.fixedSeat, "partner");
  const strain = target.strain === "NT" ? "N" : target.strain;

  return `PRIMARY SCORER: V${target.level}${strain} BY ${declarer}`;
}

function pushRangeFilter(
  lines: string[],
  seat: Seat,
  filterName: string,
  range: RangeConstraint | undefined,
  defaults: { min: number; max: number }
): void {
  if (!range) return;

  const min = range.min ?? defaults.min;
  const max = range.max ?? defaults.max;

  lines.push(`    ${seat}: ${filterName}, ${min}, ${max}`);
}

function pushSuitLengthFilters(
  lines: string[],
  seat: Seat,
  suitLengths?: SuitLengthConstraints
): void {
  if (!suitLengths) return;

  pushRangeFilter(lines, seat, "SpadesLen", suitLengths.spades, {
    min: 0,
    max: 13,
  });
  pushRangeFilter(lines, seat, "HeartsLen", suitLengths.hearts, {
    min: 0,
    max: 13,
  });
  pushRangeFilter(lines, seat, "DiamondsLen", suitLengths.diamonds, {
    min: 0,
    max: 13,
  });
  pushRangeFilter(lines, seat, "ClubsLen", suitLengths.clubs, {
    min: 0,
    max: 13,
  });
}

function pushPlayerFilters(
  lines: string[],
  seat: Seat,
  player?: PlayerRestrictions
): void {
  if (!player) return;

  pushRangeFilter(lines, seat, "PointsRange", player.hcp, { min: 0, max: 37 });
  pushSuitLengthFilters(lines, seat, player.suitLengths);

  if (player.shape?.noSixCardSuit) {
    lines.push(`    ${seat}: SpadesLen, 0, 5`);
    lines.push(`    ${seat}: HeartsLen, 0, 5`);
    lines.push(`    ${seat}: DiamondsLen, 0, 5`);
    lines.push(`    ${seat}: ClubsLen, 0, 5`);
  }
}

function buildWalrusConfig(task: TaskConfigDto): string {
  const lines: string[] = [];

  lines.push(`TASK NAME:${task.meta.name}`);

  if (task.meta.description) {
    for (const line of task.meta.description.split(/\r?\n/)) {
      if (line.trim()) {
        lines.push(line.trim());
      }
    }
  }

  lines.push("");
  lines.push("TASK_TYPE:FIXED_ONE_HAND");
  lines.push(buildHandLine(task.deal.fixedSeat, task.deal.fixedHand));
  lines.push(buildPrimaryScorer(task));
  lines.push("POSTMORTEM: AUTO");
  lines.push("");
  lines.push("FILTERS:");

  const fixedSeat = task.deal.fixedSeat;
  const partnerSeat = resolveRelativeSeat(fixedSeat, "partner");
  const lhoSeat = resolveRelativeSeat(fixedSeat, "lho");
  const rhoSeat = resolveRelativeSeat(fixedSeat, "rho");

  pushPlayerFilters(lines, partnerSeat, task.deal.restrictions?.partner);
  pushPlayerFilters(lines, lhoSeat, task.deal.restrictions?.lho);
  pushPlayerFilters(lines, rhoSeat, task.deal.restrictions?.rho);

  lines.push("");
  lines.push(`SCALE: ${task.settings.dealsK}`);

  return lines.join("\n");
}

export async function createBodealerTask(
  _prevState: NewTaskState,
  formData: FormData
): Promise<NewTaskState> {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const hand = String(formData.get("hand") ?? "").trim();
  const boardsK = toInt(formData.get("boardsK"));

  const errors: NewTaskState["errors"] = {};

  if (!name) {
    errors.name = ["Name is required."];
  } else if (name.length > 100) {
    errors.name = ["Name must be at most 100 characters."];
  }

  if (description.length > 1000) {
    errors.description = ["Description must be at most 1000 characters."];
  }

  if (!hand) {
    errors.hand = ["Hand is required."];
  } else if (countCardsFromHandText(hand) !== 13) {
    errors.hand = ["Hand must contain exactly 13 cards."];
  }

  if (boardsK == null) {
    errors.boardsK = ["Boards must be a number."];
  } else if (boardsK < 1 || boardsK > 200) {
    errors.boardsK = ["Boards must be between 1 and 200."];
  }

  const restrictions = buildRestrictions(formData);
  const restrictionErrors = [
    ...validatePlayerRestrictions(restrictions?.partner, "Partner"),
    ...validatePlayerRestrictions(restrictions?.lho, "LHO"),
    ...validatePlayerRestrictions(restrictions?.rho, "RHO"),
  ];

  if (restrictionErrors.length > 0) {
    errors.general = restrictionErrors;
  }

  if (Object.keys(errors).length > 0) {
    return { message: "Please fix the errors.", errors };
  }

  const task = formDataToTaskConfigDto(formData, hand);
  const configText = buildWalrusConfig(task);

  let r: Response;
  try {
    const uploadFormData = new FormData();
    uploadFormData.append(
      "configFile",
      new Blob([configText], { type: "text/plain" }),
      `${sanitizeFileName(task.meta.name || "task")}.txt`
    );

    r = await fetch(`${process.env.BODEALER_URL}/tasks`, {
      method: "POST",
      body: uploadFormData,
    });
  } catch (e) {
    return {
      message: "Failed to reach Bodealer service.",
      errors: { general: [e instanceof Error ? e.message : String(e)] },
    };
  }

  let data: unknown = null;
  try {
    data = await r.json();
  } catch {
    // ignore non-json response
  }

  if (!r.ok) {
    const errorMessage =
      typeof data === "object" && data !== null && "error" in data
        ? String((data as { error?: unknown }).error ?? `HTTP ${r.status}`)
        : `HTTP ${r.status}`;

    return {
      message: "Bodealer service rejected the request.",
      errors: { general: [errorMessage] },
    };
  }

  const taskId =
    typeof data === "object" && data !== null && "id" in data
      ? String((data as { id?: unknown }).id ?? "")
      : "";

  if (!taskId) {
    return {
      message: "Task created but no id returned.",
      errors: { general: ['Missing "id" in response.'] },
    };
  }

  console.log(taskId);
  // TODO redirect(`/boards/${taskId}`);
}
