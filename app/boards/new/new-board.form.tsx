"use client";

import { useActionState, useState } from "react";
import { Button } from "@/app/ui/button";
import type { NewTaskState } from "@/app/lib/actions";
import { createBodealerTask } from "@/app/lib/actions";
import HandPicker from "@/app/ui/hand-picker";

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-2 text-sm text-red-700">{errors.join(" ")}</p>;
}

function hasSubmittedValues(values: Record<string, string>, prefix: string) {
  return Object.entries(values).some(
    ([key, value]) => key.startsWith(`${prefix}.`) && value !== "",
  );
}

function toDigitsOnly(value: string) {
  return value.replaceAll(/\D/g, "");
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-xl border border-gray-200 bg-gray-50 p-4"
    >
      <summary className="cursor-pointer list-none">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <span className="text-sm text-gray-500 transition-transform group-open:rotate-180">
            ⌄
          </span>
        </div>
      </summary>

      <div className="mt-4">{children}</div>
    </details>
  );
}

const RESTRICTION_RANGES = [
  { key: "hcp", label: "HCP", min: 0, max: 37 },
  { key: "spades", label: "Spades", min: 0, max: 13 },
  { key: "hearts", label: "Hearts", min: 0, max: 13 },
  { key: "diamonds", label: "Diamonds", min: 0, max: 13 },
  { key: "clubs", label: "Clubs", min: 0, max: 13 },
] as const;

const TASK_TYPES = [
  { value: "ONE_SIDED_BIDDING_LEVEL", label: "One-sided bidding level" },
  { value: "SEEK_OPENING_LEAD", label: "Seek opening lead" },
] as const;

const CONTRACT_LEVELS = ["1", "2", "3", "4", "5", "6", "7"] as const;
const CONTRACT_STRAINS = ["S", "H", "D", "C", "NT"] as const;

function RangeInput({
  prefix,
  field,
  bound,
  value,
  onValueChange,
}: {
  prefix: string;
  field: (typeof RESTRICTION_RANGES)[number];
  bound: "Min" | "Max";
  value: string;
  onValueChange: (name: string, value: string) => void;
}) {
  const htmlName = `${prefix}.${field.key}${bound}`;
  const boundLabel = bound.toLowerCase();

  return (
    <div>
      <label
        htmlFor={htmlName}
        className="block text-sm font-medium text-gray-900"
      >
        {field.label} {boundLabel}
      </label>
      <input
        id={htmlName}
        name={htmlName}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        value={value}
        onChange={(e) => onValueChange(htmlName, toDigitsOnly(e.target.value))}
        className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

function RestrictionBlock({
  title,
  prefix,
  values,
  onValueChange,
  defaultOpen = false,
}: {
  title: string;
  prefix: string;
  values: Record<string, string>;
  onValueChange: (name: string, value: string) => void;
  defaultOpen?: boolean;
}) {
  const shouldOpen = defaultOpen || hasSubmittedValues(values, prefix);

  return (
    <details
      open={shouldOpen}
      className="group rounded-xl border border-gray-200 bg-gray-50 p-4"
    >
      <summary className="cursor-pointer list-none">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <span className="text-sm text-gray-500 transition-transform group-open:rotate-180">
            ⌄
          </span>
        </div>
      </summary>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        {RESTRICTION_RANGES.flatMap((field) => [
          <RangeInput
            key={`${field.key}-min`}
            prefix={prefix}
            field={field}
            bound="Min"
            value={values[`${prefix}.${field.key}Min`] ?? ""}
            onValueChange={onValueChange}
          />,
          <RangeInput
            key={`${field.key}-max`}
            prefix={prefix}
            field={field}
            bound="Max"
            value={values[`${prefix}.${field.key}Max`] ?? ""}
            onValueChange={onValueChange}
          />,
        ])}
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm text-gray-900">
        <input
          type="checkbox"
          name={`${prefix}.noSixCardSuit`}
          value="true"
          checked={values[`${prefix}.noSixCardSuit`] === "true"}
          onChange={(e) =>
            onValueChange(
              `${prefix}.noSixCardSuit`,
              e.target.checked ? "true" : "",
            )
          }
          className="rounded border-gray-300"
        />
        No 6+ card suit
      </label>
    </details>
  );
}

export default function NewBoardForm() {
  const initialState: NewTaskState = { message: null, errors: {}, values: {} };
  const [state, formAction, pending] = useActionState(
    createBodealerTask,
    initialState,
  );
  const [values, setValues] = useState<Record<string, string>>({});

  function handleValueChange(name: string, value: string) {
    setValues((currentValues) => {
      if (value === "") {
        const nextValues = { ...currentValues };
        delete nextValues[name];
        return nextValues;
      }

      return { ...currentValues, [name]: value };
    });
  }

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <CollapsibleSection title="Board info" defaultOpen={true}>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-900"
            >
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={values.name ?? ""}
              onChange={(e) => handleValueChange("name", e.target.value)}
              placeholder="For example: 4H slam try after weak two"
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <FieldError errors={state?.errors?.name} />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-900"
            >
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              value={values.description ?? ""}
              onChange={(e) => handleValueChange("description", e.target.value)}
              placeholder="Optional notes about the bidding, lead problem, assumptions, etc."
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <FieldError errors={state?.errors?.description} />
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Our hand" defaultOpen={true}>
        <p className="mt-1 text-sm text-gray-600">
          Click cards to build the hand. Example:{" "}
          <span className="font-mono">102 A1093 KJ2 A982</span>
        </p>

        <div className="mt-3">
          <HandPicker key={values.hand ?? ""} defaultHandText={values.hand} />
        </div>

        <FieldError errors={state?.errors?.hand} />
      </CollapsibleSection>

      <Section title="Calculation">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              {TASK_TYPES.map((taskType) => (
                <option key={taskType.value} value={taskType.value}>
                  {taskType.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="contractLevel"
              className="block text-sm font-medium text-gray-900"
            >
              Contract level
            </label>
            <select
              id="contractLevel"
              name="contractLevel"
              value={values.contractLevel ?? "4"}
              onChange={(e) =>
                handleValueChange("contractLevel", e.target.value)
              }
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CONTRACT_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="contractStrain"
              className="block text-sm font-medium text-gray-900"
            >
              Contract strain
            </label>
            <select
              id="contractStrain"
              name="contractStrain"
              value={values.contractStrain ?? "S"}
              onChange={(e) =>
                handleValueChange("contractStrain", e.target.value)
              }
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CONTRACT_STRAINS.map((strain) => (
                <option key={strain} value={strain}>
                  {strain}
                </option>
              ))}
            </select>
          </div>
        </div>

        <FieldError errors={state?.errors?.calculation} />
      </Section>

      <CollapsibleSection
        title="Restrictions"
        defaultOpen={Boolean(state?.errors?.general)}
      >
        <div className="space-y-4">
          <RestrictionBlock
            title="Partner"
            prefix="partner"
            values={values}
            onValueChange={handleValueChange}
            defaultOpen={Boolean(
              state?.errors?.general?.some((error) =>
                error.startsWith("Partner:"),
              ),
            )}
          />
          <RestrictionBlock
            title="LHO"
            prefix="lho"
            values={values}
            onValueChange={handleValueChange}
            defaultOpen={Boolean(
              state?.errors?.general?.some((error) => error.startsWith("LHO:")),
            )}
          />
          <RestrictionBlock
            title="RHO"
            prefix="rho"
            values={values}
            onValueChange={handleValueChange}
            defaultOpen={Boolean(
              state?.errors?.general?.some((error) => error.startsWith("RHO:")),
            )}
          />
        </div>
      </CollapsibleSection>

      <Section title="Run settings">
        <label
          htmlFor="boardsK"
          className="block text-sm font-medium text-gray-900"
        >
          Boards (thousands)
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
            className="w-32 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-600">e.g. 10 = 10,000</span>
        </div>

        <FieldError errors={state?.errors?.boardsK} />
      </Section>

      {state?.message ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800">
          {state?.message}
          <FieldError errors={state?.errors?.general} />
        </div>
      ) : null}

      <div className="flex items-center justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Starting…" : "Start"}
        </Button>
      </div>
    </form>
  );
}
