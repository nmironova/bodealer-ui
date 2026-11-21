"use client";

import { FieldError } from "../../ui/editor-section";

const TASK_TYPES = [
  { value: "FIXED_ONE_HAND", label: "Fixed one hand", enabled: false },
  { value: "FOUR_HANDS_TASK", label: "Four hands task", enabled: false },
  { value: "FILTERING_ONLY", label: "Filtering only", enabled: false },
  {
    value: "ONE_SIDED_BIDDING_LEVEL",
    label: "One-sided bidding level",
    enabled: true,
  },
  {
    value: "ONE_SIDED_DENOMINATION",
    label: "One-sided denomination",
    enabled: false,
  },
  {
    value: "COMPETITIVE_GENERIC",
    label: "Competitive generic",
    enabled: false,
  },
  { value: "SEEK_OPENING_LEAD", label: "Seek opening lead", enabled: true },
] as const;

const CONTRACT_LEVELS = ["1", "2", "3", "4", "5", "6", "7"] as const;
const CONTRACT_STRAINS = ["S", "H", "D", "C", "NT"] as const;
const POSTMORTEM_MODES = ["AUTO", "SUIT"] as const;

const STRAIN_LABELS: Record<(typeof CONTRACT_STRAINS)[number], string> = {
  S: "♠",
  H: "♥",
  D: "♦",
  C: "♣",
  NT: "NT",
};

const STRAIN_COLORS: Record<(typeof CONTRACT_STRAINS)[number], string> = {
  S: "text-gray-950",
  H: "text-red-600",
  D: "text-red-600",
  C: "text-gray-950",
  NT: "text-blue-700",
};

export function calculationSummary(values: Record<string, string>) {
  const strain = values.contractStrain ?? "S";
  const label = STRAIN_LABELS[strain as keyof typeof STRAIN_LABELS] ?? strain;
  const declarer = (values.contractDeclarer ?? "S") === "N" ? "North" : "South";
  const boards = Number(values.boardsK ?? "10") * 1000;
  return `${values.contractLevel ?? "4"}${label} · ${declarer} declares · ${Number.isFinite(boards) ? boards.toLocaleString("en-US") : "—"} deals · ${values.postmortem ?? "AUTO"}`;
}

export default function CalculationEditor({
  values,
  onValueChange: handleValueChange,
  errors,
}: {
  values: Record<string, string>;
  onValueChange: (name: string, value: string) => void;
  errors?: { boardsK?: string[]; calculation?: string[] };
}) {
  const contractLevel = values.contractLevel ?? "4";
  const contractStrain = values.contractStrain ?? "S";
  return (
    <div className="calculation-fields">
      <div className="contents">
        <div>
          <label
            htmlFor="taskType"
            className="block text-sm font-medium text-gray-900"
          >
            Task type
          </label>
          <select
            id="taskType"
            name="taskType"
            value={values.taskType ?? "ONE_SIDED_BIDDING_LEVEL"}
            onChange={(e) => handleValueChange("taskType", e.target.value)}
            className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            {TASK_TYPES.map((taskType) => (
              <option
                key={taskType.value}
                value={taskType.value}
                disabled={!taskType.enabled}
              >
                {taskType.label}
                {taskType.enabled ? "" : " (not available yet)"}
              </option>
            ))}
          </select>
        </div>

        <div>
          <span className="block text-sm font-medium text-gray-900">
            Contract
          </span>
          <input type="hidden" name="contractLevel" value={contractLevel} />
          <input type="hidden" name="contractStrain" value={contractStrain} />

          <div className="contract-options mt-2">
            <div className="grid grid-cols-7 gap-1">
              {CONTRACT_LEVELS.map((level) => {
                const active = contractLevel === level;

                return (
                  <button
                    key={level}
                    type="button"
                    aria-pressed={active}
                    onClick={() => handleValueChange("contractLevel", level)}
                    className={[
                      "h-9 rounded-md border text-sm font-semibold transition",
                      active
                        ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300",
                    ].join(" ")}
                  >
                    {level}
                  </button>
                );
              })}
            </div>

            <div className="contract-strains grid grid-cols-5 gap-1">
              {CONTRACT_STRAINS.map((strain) => {
                const active = contractStrain === strain;

                return (
                  <button
                    key={strain}
                    type="button"
                    aria-pressed={active}
                    onClick={() => handleValueChange("contractStrain", strain)}
                    className={[
                      "h-10 rounded-md border bg-white text-sm font-semibold transition",
                      active
                        ? "border-blue-600 ring-2 ring-blue-100"
                        : "border-gray-200 hover:border-gray-300",
                      STRAIN_COLORS[strain],
                    ].join(" ")}
                  >
                    {STRAIN_LABELS[strain]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="run-settings space-y-3">
        <div>
          <label
            htmlFor="contractDeclarer"
            className="block text-sm font-medium text-gray-900"
          >
            Declarer
          </label>
          <select
            id="contractDeclarer"
            name="contractDeclarer"
            value={values.contractDeclarer ?? "S"}
            onChange={(event) =>
              handleValueChange("contractDeclarer", event.target.value)
            }
            className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="N">We (North)</option>
            <option value="S">Partner (South)</option>
          </select>
        </div>
        <div>
          <label
            htmlFor="boardsK"
            className="block text-sm font-medium text-gray-900"
          >
            Boards
          </label>

          <div className="mt-2 flex items-center gap-3">
            <input
              id="boardsK"
              name="boardsK"
              type="number"
              min={1}
              max={200}
              value={values.boardsK ?? "10"}
              onChange={(e) => handleValueChange("boardsK", e.target.value)}
              className="h-10 w-28 rounded-md border border-gray-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <span className="text-sm text-gray-600">thousands</span>
          </div>
        </div>

        <div>
          <label
            htmlFor="postmortem"
            className="block text-sm font-medium text-gray-900"
          >
            Postmortem
          </label>
          <select
            id="postmortem"
            name="postmortem"
            value={values.postmortem ?? "AUTO"}
            onChange={(e) => handleValueChange("postmortem", e.target.value)}
            className="mt-2 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            {POSTMORTEM_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
        </div>
      </div>

      <FieldError errors={errors?.boardsK} />
      <FieldError errors={errors?.calculation} />
    </div>
  );
}
