"use server";

import { buildWalrusConfig } from "./walrus-config";
import {
  buildRestrictions,
  countCardsFromHandText,
  formDataToTaskConfigDto,
  isEnabledCalculationType,
  readCalculationType,
  readCombinations,
  readContractLevel,
  readContractStrain,
  readPostmortemMode,
  sanitizeFileName,
  toInt,
  validatePlayerRestrictions,
  validateCombinations,
} from "./bodealer-form";

export type NewTaskState = {
  message: string | null;
  errors: Partial<
    Record<
      "name" | "description" | "hand" | "boardsK" | "calculation" | "general",
      string[]
    >
  >;
  values: Record<string, string>;
  taskId?: string;
};

function formDataToValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};

  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") {
      values[key] = value;
    }
  }

  return values;
}

export async function createBodealerTask(
  _prevState: NewTaskState | undefined,
  formData: FormData,
): Promise<NewTaskState> {
  const values = formDataToValues(formData);
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const hand = String(formData.get("hand") ?? "").trim();
  const boardsK = toInt(formData.get("boardsK"));
  const calculationType = readCalculationType(formData);
  const contractLevel = readContractLevel(formData);
  const contractStrain = readContractStrain(formData);
  const postmortem = readPostmortemMode(formData);

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

  if (!calculationType) {
    errors.calculation = ["Task type is required."];
  } else if (!isEnabledCalculationType(calculationType)) {
    errors.calculation = ["This task type is not available yet."];
  } else if (!contractLevel || !contractStrain) {
    errors.calculation = ["Contract level and strain are required."];
  }

  if (!postmortem) {
    errors.general = [
      ...(errors.general ?? []),
      "Postmortem setting is invalid.",
    ];
  }

  const restrictions = buildRestrictions(formData);
  const combinations = readCombinations(formData);
  const restrictionErrors = [
    ...validatePlayerRestrictions(restrictions?.partner, "Partner"),
    ...validatePlayerRestrictions(restrictions?.lho, "LHO"),
    ...validatePlayerRestrictions(restrictions?.rho, "RHO"),
  ];

  if (restrictionErrors.length > 0) {
    errors.general = [...(errors.general ?? []), ...restrictionErrors];
  }
  const combinationErrors = validateCombinations(combinations);
  if (combinationErrors.length > 0) {
    errors.general = [...(errors.general ?? []), ...combinationErrors];
  }

  if (Object.keys(errors).length > 0) {
    return { message: "Please fix the errors.", errors, values };
  }

  const task = formDataToTaskConfigDto(formData, hand);
  const configText = buildWalrusConfig(task);

  console.info(
    `[Bodealer config: ${task.meta.name}]\n${configText}\n[/Bodealer config]`,
  );

  let r: Response;
  try {
    const uploadFormData = new FormData();
    uploadFormData.append(
      "configFile",
      new Blob([configText], { type: "text/plain" }),
      `${sanitizeFileName(task.meta.name || "task")}.txt`,
    );

    r = await fetch(`${process.env.BODEALER_URL}/tasks`, {
      method: "POST",
      body: uploadFormData,
    });
  } catch (e) {
    return {
      message: "Failed to reach Bodealer service.",
      errors: { general: [e instanceof Error ? e.message : String(e)] },
      values,
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
      values,
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
      values,
    };
  }

  return {
    message: "Board started.",
    errors: {},
    values,
    taskId,
  };
}
