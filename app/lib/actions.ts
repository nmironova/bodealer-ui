"use server";

import { redirect } from "next/navigation";
import {
  CalculationType,
  type PlayerRestrictions,
  type RangeConstraint,
  type RelativeSeatRestrictions,
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

  const payload = formDataToTaskConfigDto(formData, hand);
  console.log("payload:", payload);

  let r: Response;
  try {
    r = await fetch(`${process.env.BODEALER_URL}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.BODEALER_API_KEY ?? "",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
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

  redirect(`/boards/${taskId}`);
}
