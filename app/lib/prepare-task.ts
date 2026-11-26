import { buildWalrusConfig } from "./walrus-config";
import {
  buildRestrictions,
  countCardsFromHandText,
  formDataToTaskConfigDto,
  isEnabledCalculationType,
  readCalculationType,
  readCombinations,
  readContractDeclarer,
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

export function prepareTask(formData: FormData) {
  const values = formDataToValues(formData);
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const hand = String(formData.get("hand") ?? "").trim();
  const boardsK = toInt(formData.get("boardsK"));
  const calculationType = readCalculationType(formData);
  const contractLevel = readContractLevel(formData);
  const contractStrain = readContractStrain(formData);
  const contractDeclarer = readContractDeclarer(formData);
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
    errors.hand = ["Your hand must contain exactly 13 valid, distinct cards."];
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
  } else if (!contractDeclarer) {
    errors.calculation = ["Declarer must be We (North) or Partner (South)."];
  }

  if (!postmortem) {
    errors.general = [
      ...(errors.general ?? []),
      "Postmortem setting is invalid.",
    ];
  }

  for (const [key, value] of Object.entries(values)) {
    if (
      (key === "boardsK" ||
        key === "contractLevel" ||
        /(?:Min|Max)$/.test(key)) &&
      value !== "" &&
      !Number.isInteger(Number(value))
    ) {
      errors.general = [
        ...(errors.general ?? []),
        `${key} must be a whole number.`,
      ];
    }
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
  return {
    values,
    errors,
    configText,
    fileName: `${sanitizeFileName(task.meta.name || "task")}.txt`,
  };
}
