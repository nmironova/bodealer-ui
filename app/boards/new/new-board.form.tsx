"use client";

import { useActionState, useCallback, useRef, useState } from "react";
import type { NewTaskState } from "@/app/lib/actions";
import { createBodealerTask } from "@/app/lib/actions";
import {
  boardFileName,
  createBoardFile,
  parseBoardFile,
} from "@/app/lib/board-config-file";
import type {
  AdvancedCombinationFilter,
  AnyInListBelowFilter,
  CombinationRangeFilter,
  CombinationSeat,
  WalrusRangeFilterName,
} from "@/app/lib/dto/task-config";
import {
  TASK_STATUS,
  type TaskStatus,
  type TaskStatusResponse,
} from "@/app/lib/task-status";
import { Button, ButtonVariant } from "@/app/ui/button";
import HandPicker from "@/app/ui/hand-picker";
import ResultsPanel from "./results-panel";

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

function CollapsiblePanel({
  title,
  children,
  defaultOpen = false,
  className = "",
  contentClassName = "",
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <details
      open={defaultOpen}
      className={[
        "setup-section group rounded-lg border border-slate-200 bg-white/60 p-4",
        className,
      ].join(" ")}
    >
      <summary className="cursor-pointer list-none">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
          <span className="text-sm text-gray-400 transition-transform group-open:rotate-180">
            ⌄
          </span>
        </div>
      </summary>

      <div className={["mt-4", contentClassName].join(" ")}>{children}</div>
    </details>
  );
}

const RESTRICTION_RANGES = [
  { key: "hcp", label: "HCP", min: 0, max: 37 },
  { key: "spades", label: "Spades", symbol: "♠", min: 0, max: 13 },
  { key: "hearts", label: "Hearts", symbol: "♥", min: 0, max: 13 },
  { key: "diamonds", label: "Diamonds", symbol: "♦", min: 0, max: 13 },
  { key: "clubs", label: "Clubs", symbol: "♣", min: 0, max: 13 },
] as const;

const SUIT_POINT_RANGES = [
  { key: "spadesPoints", label: "Spades points", symbol: "♠", min: 0, max: 10 },
  { key: "heartsPoints", label: "Hearts points", symbol: "♥", min: 0, max: 10 },
  {
    key: "diamondsPoints",
    label: "Diamonds points",
    symbol: "♦",
    min: 0,
    max: 10,
  },
  { key: "clubsPoints", label: "Clubs points", symbol: "♣", min: 0, max: 10 },
] as const;

type RestrictionRange =
  | (typeof RESTRICTION_RANGES)[number]
  | (typeof SUIT_POINT_RANGES)[number];

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

function TextField({
  id,
  name,
  value,
  onValueChange,
  label,
  placeholder,
}: {
  id: string;
  name: string;
  value: string;
  onValueChange: (name: string, value: string) => void;
  label: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-900">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type="text"
        value={value}
        onChange={(e) => onValueChange(name, e.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}

function RangeRow({
  prefix,
  field,
  minValue,
  maxValue,
  onValueChange,
}: {
  prefix: string;
  field: RestrictionRange;
  minValue: string;
  maxValue: string;
  onValueChange: (name: string, value: string) => void;
}) {
  const minName = `${prefix}.${field.key}Min`;
  const maxName = `${prefix}.${field.key}Max`;
  const labelId = `${prefix}.${field.key}.label`;

  return (
    <div className="grid grid-cols-[minmax(76px,1fr)_minmax(0,82px)_auto_minmax(0,82px)] items-center gap-2">
      <div
        id={labelId}
        className="flex items-center gap-2 text-sm text-gray-800"
      >
        {"symbol" in field ? (
          <span
            className={[
              "w-4 text-center text-base leading-none",
              field.key.startsWith("hearts") || field.key.startsWith("diamonds")
                ? "text-red-600"
                : "text-gray-950",
            ].join(" ")}
          >
            {field.symbol}
          </span>
        ) : null}
        <span className="truncate">{field.label}</span>
      </div>

      <input
        aria-labelledby={labelId}
        aria-label={`${field.label} min`}
        name={minName}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        placeholder="min"
        value={minValue}
        onChange={(e) => onValueChange(minName, toDigitsOnly(e.target.value))}
        className="h-9 w-full rounded-md border border-gray-300 bg-white px-2 text-center text-sm outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
      <span className="text-sm text-gray-400">-</span>
      <input
        aria-labelledby={labelId}
        aria-label={`${field.label} max`}
        name={maxName}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        placeholder="max"
        value={maxValue}
        onChange={(e) => onValueChange(maxName, toDigitsOnly(e.target.value))}
        className="h-9 w-full rounded-md border border-gray-300 bg-white px-2 text-center text-sm outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}

function getRangeSummary(
  values: Record<string, string>,
  prefix: string,
  key: string,
) {
  const min = values[`${prefix}.${key}Min`];
  const max = values[`${prefix}.${key}Max`];

  if (min && max) return `${min}-${max}`;
  if (min) return `${min}+`;
  if (max) return `0-${max}`;
  return null;
}

function restrictionSummary(values: Record<string, string>, prefix: string) {
  const chips: string[] = [];

  for (const field of RESTRICTION_RANGES) {
    const summary = getRangeSummary(values, prefix, field.key);
    if (summary) chips.push(`${field.label} ${summary}`);
  }

  for (const field of SUIT_POINT_RANGES) {
    const summary = getRangeSummary(values, prefix, field.key);
    if (summary) chips.push(`${field.symbol} points ${summary}`);
  }

  if (values[`${prefix}.noSixCardSuit`] === "true") {
    chips.push("No 6+ suit");
  }

  return chips;
}

function hasSuitPointValues(values: Record<string, string>, prefix: string) {
  return SUIT_POINT_RANGES.some(
    (field) =>
      values[`${prefix}.${field.key}Min`] ||
      values[`${prefix}.${field.key}Max`],
  );
}

function RestrictionBlock({
  title,
  prefix,
  values,
  onValueChange,
  onClear,
  defaultOpen = false,
}: {
  title: string;
  prefix: string;
  values: Record<string, string>;
  onValueChange: (name: string, value: string) => void;
  onClear: (prefix: string) => void;
  defaultOpen?: boolean;
}) {
  const shouldOpen = defaultOpen;
  const summary = restrictionSummary(values, prefix);

  return (
    <details
      open={shouldOpen}
      className="restriction-row group rounded-lg border border-gray-200 bg-gray-50/80"
    >
      <summary className="cursor-pointer list-none p-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-950">{title}</h3>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {summary.length > 0 ? (
                summary.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs font-medium text-gray-700"
                  >
                    {item}
                  </span>
                ))
              ) : (
                <span className="text-xs text-gray-500">No restrictions</span>
              )}
            </div>
          </div>
          <span className="mt-0.5 text-sm text-gray-400 transition-transform group-open:rotate-180">
            ⌄
          </span>
        </div>
      </summary>

      <div className="border-t border-gray-200 p-4 pt-3">
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={() => onClear(prefix)}
            disabled={!hasSubmittedValues(values, prefix)}
            className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Clear restrictions
          </button>
        </div>

        <div className="space-y-2.5">
          {RESTRICTION_RANGES.map((field) => (
            <RangeRow
              key={field.key}
              prefix={prefix}
              field={field}
              minValue={values[`${prefix}.${field.key}Min`] ?? ""}
              maxValue={values[`${prefix}.${field.key}Max`] ?? ""}
              onValueChange={onValueChange}
            />
          ))}
        </div>

        <details
          open={hasSuitPointValues(values, prefix)}
          className="group/suit-points mt-4 rounded-md border border-gray-200 bg-white"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Points in suit
            <span className="text-sm text-gray-400 transition-transform group-open/suit-points:rotate-180">
              ⌄
            </span>
          </summary>
          <div className="space-y-2.5 border-t border-gray-200 p-3">
            {SUIT_POINT_RANGES.map((field) => (
              <RangeRow
                key={field.key}
                prefix={prefix}
                field={field}
                minValue={values[`${prefix}.${field.key}Min`] ?? ""}
                maxValue={values[`${prefix}.${field.key}Max`] ?? ""}
                onValueChange={onValueChange}
              />
            ))}
          </div>
        </details>

        <label className="mt-4 flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900">
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
            className="rounded border-gray-300 text-blue-600"
          />
          No 6+ card suit
        </label>
      </div>
    </details>
  );
}

const COMBINATION_SEAT_OPTIONS: Array<{
  value: CombinationSeat;
  label: string;
}> = [
  { value: "partner", label: "Partner" },
  { value: "lho", label: "LHO" },
  { value: "rho", label: "RHO" },
];
const COMBINATION_FILTER_OPTIONS: Array<{
  value: WalrusRangeFilterName;
  label: string;
}> = [
  { value: "PointsRange", label: "HCP" },
  { value: "ControlsRange", label: "Controls" },
  { value: "SpadesLen", label: "Spades length" },
  { value: "HeartsLen", label: "Hearts length" },
  { value: "DiamondsLen", label: "Diamonds length" },
  { value: "ClubsLen", label: "Clubs length" },
];

function newCombinationRange(): CombinationRangeFilter {
  return {
    type: "range",
    seat: "partner",
    filter: "PointsRange",
    min: 0,
    max: 37,
  };
}

function parseCombinationValue(value?: string): AdvancedCombinationFilter[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as AdvancedCombinationFilter[]) : [];
  } catch {
    return [];
  }
}

function TopLevelAnyEditor({
  value,
  onChange,
  onRemove,
}: {
  value: AnyInListBelowFilter;
  onChange: (value: AnyInListBelowFilter) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-blue-900">
          Any in list below for
          <select
            value={value.seat}
            onChange={(event) =>
              onChange({
                ...value,
                seat: event.target.value as CombinationSeat,
              })
            }
            className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm font-normal normal-case tracking-normal text-gray-900"
          >
            {COMBINATION_SEAT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={onRemove}
          className="text-xs font-medium text-red-700 hover:underline"
        >
          Remove any group
        </button>
      </div>
      <div className="mt-3 space-y-2">
        {value.filters.map((filter, index) => (
          <CombinationRangeRow
            key={index}
            value={filter}
            onChange={(nextFilter) =>
              onChange({
                ...value,
                filters: value.filters.map((item, itemIndex) =>
                  itemIndex === index ? nextFilter : item,
                ),
              })
            }
            onRemove={() =>
              onChange({
                ...value,
                filters: value.filters.filter(
                  (_, itemIndex) => itemIndex !== index,
                ),
              })
            }
          />
        ))}
      </div>
      <button
        type="button"
        onClick={() =>
          onChange({
            ...value,
            filters: [
              ...value.filters,
              { ...newCombinationRange(), seat: value.seat },
            ],
          })
        }
        className="mt-2 text-xs font-medium text-blue-800"
      >
        + Add alternative
      </button>
    </div>
  );
}

function CombinationRangeRow({
  value,
  onChange,
  onRemove,
}: {
  value: CombinationRangeFilter;
  onChange: (value: CombinationRangeFilter) => void;
  onRemove: () => void;
}) {
  return (
    <div className="grid gap-2 rounded-md border border-gray-200 bg-white p-2 sm:grid-cols-[1fr_1.35fr_70px_70px_auto]">
      <select
        aria-label="Seat"
        value={value.seat}
        onChange={(event) =>
          onChange({ ...value, seat: event.target.value as CombinationSeat })
        }
        className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm"
      >
        {COMBINATION_SEAT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <select
        aria-label="Filter"
        value={value.filter}
        onChange={(event) =>
          onChange({
            ...value,
            filter: event.target.value as WalrusRangeFilterName,
          })
        }
        className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm"
      >
        {COMBINATION_FILTER_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <input
        aria-label="Minimum"
        type="number"
        min={0}
        value={value.min}
        onChange={(event) =>
          onChange({ ...value, min: Number(event.target.value) })
        }
        className="h-9 rounded-md border border-gray-300 px-2 text-sm"
      />
      <input
        aria-label="Maximum"
        type="number"
        min={0}
        value={value.max}
        onChange={(event) =>
          onChange({ ...value, max: Number(event.target.value) })
        }
        className="h-9 rounded-md border border-gray-300 px-2 text-sm"
      />
      <button
        type="button"
        onClick={onRemove}
        className="h-9 rounded-md px-2 text-sm text-red-700 hover:bg-red-50"
        aria-label="Remove condition"
      >
        ×
      </button>
    </div>
  );
}

function CombinationEditor({
  combinations,
  onChange,
}: {
  combinations: AdvancedCombinationFilter[];
  onChange: (value: AdvancedCombinationFilter[]) => void;
}) {
  const update = (index: number, value: AdvancedCombinationFilter) =>
    onChange(
      combinations.map((item, itemIndex) =>
        itemIndex === index ? value : item,
      ),
    );

  return (
    <div className="mt-4 border-t border-gray-200 pt-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-950">
            Advanced combinations
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            Reject a deal when every condition matches. An “any” group matches
            when one of its conditions does.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() =>
              onChange([
                ...combinations,
                {
                  type: "anyInListBelow",
                  seat: "partner",
                  filters: [newCombinationRange()],
                },
              ])
            }
            className="rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-800 hover:bg-blue-100"
          >
            Add any group
          </button>
          <button
            type="button"
            onClick={() =>
              onChange([
                ...combinations,
                {
                  type: "excludeCombination",
                  seat: "partner",
                  filters: [newCombinationRange()],
                },
              ])
            }
            className="rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100"
          >
            Add exclusion
          </button>
        </div>
      </div>

      <div className="mt-3 space-y-3">
        {combinations.map((combination, combinationIndex) =>
          combination.type === "anyInListBelow" ? (
            <TopLevelAnyEditor
              key={combinationIndex}
              value={combination}
              onChange={(value) => update(combinationIndex, value)}
              onRemove={() =>
                onChange(
                  combinations.filter((_, index) => index !== combinationIndex),
                )
              }
            />
          ) : (
            <div
              key={combinationIndex}
              className="rounded-lg border border-amber-200 bg-amber-50/60 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Exclude owner
                  <select
                    value={combination.seat}
                    onChange={(event) =>
                      update(combinationIndex, {
                        ...combination,
                        seat: event.target.value as CombinationSeat,
                      })
                    }
                    className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm font-normal normal-case tracking-normal text-gray-900"
                  >
                    {COMBINATION_SEAT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() =>
                    onChange(
                      combinations.filter(
                        (_, index) => index !== combinationIndex,
                      ),
                    )
                  }
                  className="text-xs font-medium text-red-700 hover:underline"
                >
                  Remove exclusion
                </button>
              </div>

              <div className="mt-3 space-y-2">
                {combination.filters.map((filter, filterIndex) =>
                  filter.type === "range" ? (
                    <CombinationRangeRow
                      key={filterIndex}
                      value={filter}
                      onChange={(value) =>
                        update(combinationIndex, {
                          ...combination,
                          filters: combination.filters.map((item, index) =>
                            index === filterIndex ? value : item,
                          ),
                        })
                      }
                      onRemove={() =>
                        update(combinationIndex, {
                          ...combination,
                          filters: combination.filters.filter(
                            (_, index) => index !== filterIndex,
                          ),
                        })
                      }
                    />
                  ) : (
                    <div
                      key={filterIndex}
                      className="rounded-md border border-blue-200 bg-blue-50 p-2"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <label className="flex items-center gap-2 text-xs font-semibold text-blue-900">
                          Any in list below
                          <select
                            value={filter.seat}
                            onChange={(event) =>
                              update(combinationIndex, {
                                ...combination,
                                filters: combination.filters.map(
                                  (item, index) =>
                                    index === filterIndex &&
                                    item.type === "anyInListBelow"
                                      ? {
                                          ...item,
                                          seat: event.target
                                            .value as CombinationSeat,
                                        }
                                      : item,
                                ),
                              })
                            }
                            className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm font-normal text-gray-900"
                          >
                            {COMBINATION_SEAT_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            update(combinationIndex, {
                              ...combination,
                              filters: combination.filters.filter(
                                (_, index) => index !== filterIndex,
                              ),
                            })
                          }
                          className="text-xs text-red-700"
                        >
                          Remove group
                        </button>
                      </div>
                      <div className="space-y-2">
                        {filter.filters.map((child, childIndex) => (
                          <CombinationRangeRow
                            key={childIndex}
                            value={child}
                            onChange={(value) =>
                              update(combinationIndex, {
                                ...combination,
                                filters: combination.filters.map(
                                  (item, index) =>
                                    index === filterIndex &&
                                    item.type === "anyInListBelow"
                                      ? {
                                          ...item,
                                          filters: item.filters.map(
                                            (entry, entryIndex) =>
                                              entryIndex === childIndex
                                                ? value
                                                : entry,
                                          ),
                                        }
                                      : item,
                                ),
                              })
                            }
                            onRemove={() =>
                              update(combinationIndex, {
                                ...combination,
                                filters: combination.filters.map(
                                  (item, index) =>
                                    index === filterIndex &&
                                    item.type === "anyInListBelow"
                                      ? {
                                          ...item,
                                          filters: item.filters.filter(
                                            (_, entryIndex) =>
                                              entryIndex !== childIndex,
                                          ),
                                        }
                                      : item,
                                ),
                              })
                            }
                          />
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          update(combinationIndex, {
                            ...combination,
                            filters: combination.filters.map((item, index) =>
                              index === filterIndex &&
                              item.type === "anyInListBelow"
                                ? {
                                    ...item,
                                    filters: [
                                      ...item.filters,
                                      newCombinationRange(),
                                    ],
                                  }
                                : item,
                            ),
                          })
                        }
                        className="mt-2 text-xs font-medium text-blue-800"
                      >
                        + Add alternative
                      </button>
                    </div>
                  ),
                )}
              </div>
              <div className="mt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() =>
                    update(combinationIndex, {
                      ...combination,
                      filters: [...combination.filters, newCombinationRange()],
                    })
                  }
                  className="text-xs font-medium text-gray-700"
                >
                  + Add condition
                </button>
                <button
                  type="button"
                  onClick={() =>
                    update(combinationIndex, {
                      ...combination,
                      filters: [
                        ...combination.filters,
                        {
                          type: "anyInListBelow",
                          seat: combination.seat,
                          filters: [newCombinationRange()],
                        },
                      ],
                    })
                  }
                  className="text-xs font-medium text-blue-800"
                >
                  + Add any group
                </button>
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

function configurationSnapshot(values: Record<string, string>) {
  const normalized = {
    taskType: "ONE_SIDED_BIDDING_LEVEL",
    contractLevel: "4",
    contractStrain: "S",
    contractDeclarer: "S",
    boardsK: "10",
    postmortem: "AUTO",
    hand: "- - - -",
    ...values,
  };
  return JSON.stringify(
    Object.entries(normalized)
      .filter(([, value]) => value !== "")
      .sort(([a], [b]) => a.localeCompare(b)),
  );
}

export default function NewBoardForm() {
  const initialState: NewTaskState = { message: null, errors: {}, values: {} };
  const [state, formAction, pending] = useActionState(
    createBodealerTask,
    initialState,
  );
  const [values, setValues] = useState<Record<string, string>>({});
  const [reportedTask, setReportedTask] = useState<{
    taskId: string;
    status: TaskStatus;
  }>();
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string>();
  const [fileMessage, setFileMessage] = useState<{
    kind: "success" | "error";
    text: string;
  }>();
  const [submittedConfiguration, setSubmittedConfiguration] =
    useState<string>();
  const [lastRun, setLastRun] = useState<{
    taskId: string;
    configuration?: string;
  }>();
  if (state?.taskId && state.taskId !== lastRun?.taskId) {
    setLastRun({ taskId: state.taskId, configuration: submittedConfiguration });
  }
  const [handRevision, setHandRevision] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTaskStatusChange = useCallback(
    (taskId: string, status: TaskStatus) => {
      setReportedTask({ taskId, status });
    },
    [],
  );

  const currentTaskStatus =
    state?.taskId && reportedTask?.taskId === state.taskId
      ? reportedTask.status
      : state?.taskId
        ? TASK_STATUS.RUNNING
        : undefined;
  const isTaskRunning = currentTaskStatus === TASK_STATUS.RUNNING;

  async function handleCancelTask() {
    if (!state?.taskId || !isTaskRunning) return;

    setIsCancelling(true);
    setCancelError(undefined);

    try {
      const res = await fetch(`/api/tasks/${state.taskId}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as
        | TaskStatusResponse
        | { error?: string };

      if (!res.ok) {
        throw new Error(
          "error" in data && data.error ? data.error : "Failed to cancel task",
        );
      }

      const status = data as TaskStatusResponse;
      setReportedTask({ taskId: state.taskId, status: status.status });
    } catch (error) {
      setCancelError(
        error instanceof Error ? error.message : "Failed to cancel task",
      );
    } finally {
      setIsCancelling(false);
    }
  }

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

  function clearRestrictions(prefix: string) {
    setValues((currentValues) =>
      Object.fromEntries(
        Object.entries(currentValues).filter(
          ([key]) => !key.startsWith(`${prefix}.`),
        ),
      ),
    );
  }

  function swapOpponentRestrictions() {
    setValues((currentValues) => {
      const nextValues = Object.fromEntries(
        Object.entries(currentValues).filter(
          ([key]) => !key.startsWith("lho.") && !key.startsWith("rho."),
        ),
      );

      for (const [key, value] of Object.entries(currentValues)) {
        if (key.startsWith("lho.")) {
          nextValues[`rho.${key.slice("lho.".length)}`] = value;
        } else if (key.startsWith("rho.")) {
          nextValues[`lho.${key.slice("rho.".length)}`] = value;
        }
      }

      return nextValues;
    });
  }

  function saveBoardFile() {
    if (!formRef.current) return;

    const formData = new FormData(formRef.current);
    const formValues = Object.fromEntries(
      [...formData.entries()].flatMap(([name, value]) =>
        typeof value === "string" ? [[name, value]] : [],
      ),
    );
    const contents = JSON.stringify(createBoardFile(formValues), null, 2);
    const url = URL.createObjectURL(
      new Blob([contents], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = boardFileName(formValues.name);
    link.click();
    URL.revokeObjectURL(url);
    setFileMessage({ kind: "success", text: "Board settings saved." });
  }

  async function loadBoardFile(file: File) {
    try {
      const loadedValues = parseBoardFile(await file.text());
      setValues(loadedValues);
      setHandRevision((revision) => revision + 1);
      setFileMessage({
        kind: "success",
        text: `Loaded settings from ${file.name}.`,
      });
    } catch (error) {
      setFileMessage({
        kind: "error",
        text:
          error instanceof Error ? error.message : "Could not load the file.",
      });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const contractLevel = values.contractLevel ?? "4";
  const contractStrain = values.contractStrain ?? "S";
  const combinations = parseCombinationValue(values.combinations);
  return (
    <>
      <form
        ref={formRef}
        action={formAction}
        className="analysis-grid"
        onSubmit={() => {
          setSubmittedConfiguration(configurationSnapshot(values));
        }}
      >
        <div className="analysis-setup">
          <div className="setup-header mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-gray-950">
                Analysis setup
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Configure your hand and explore the possibilities.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.bodealer.json,application/json"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void loadBoardFile(file);
                }}
              />
              <Button
                type="button"
                variant={ButtonVariant.SECONDARY}
                onClick={() => fileInputRef.current?.click()}
              >
                Load
              </Button>
              <Button
                type="button"
                variant={ButtonVariant.GHOST}
                onClick={saveBoardFile}
              >
                Save
              </Button>
              <Button
                type="button"
                variant={ButtonVariant.GHOST}
                onClick={() => {
                  setValues({});
                  setHandRevision((revision) => revision + 1);
                  setFileMessage(undefined);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              >
                Clear
              </Button>
            </div>
          </div>

          {fileMessage ? (
            <p
              role={fileMessage.kind === "error" ? "alert" : "status"}
              className={[
                "mt-3 text-sm",
                fileMessage.kind === "error"
                  ? "text-red-700"
                  : "text-green-700",
              ].join(" ")}
            >
              {fileMessage.text}
            </p>
          ) : null}

          <div className="setup-controls flex flex-col gap-3">
            <CollapsiblePanel
              title="Board information"
              className="board-information order-1"
              defaultOpen={true}
            >
              <div className="space-y-4">
                <TextField
                  id="name"
                  name="name"
                  value={values.name ?? ""}
                  onValueChange={handleValueChange}
                  label="Name"
                  placeholder="For example: 4H slam try after weak two"
                />
                <FieldError errors={state?.errors?.name} />

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
                    rows={1}
                    value={values.description ?? ""}
                    onChange={(e) =>
                      handleValueChange("description", e.target.value)
                    }
                    placeholder="Optional notes…"
                    className="mt-2 w-full resize-y rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                  <FieldError errors={state?.errors?.description} />
                </div>
              </div>
            </CollapsiblePanel>
            <CollapsiblePanel
              title="Your hand (North)"
              defaultOpen={true}
              className="hand-section order-2"
            >
              <HandPicker
                key={handRevision}
                defaultHandText={values.hand}
                onHandChange={(hand) => handleValueChange("hand", hand)}
              />
              <FieldError errors={state?.errors?.hand} />
            </CollapsiblePanel>
            <CollapsiblePanel
              title="Restrictions"
              className="restrictions-section order-3"
              defaultOpen={true}
            >
              <div className="space-y-3">
                <input
                  type="hidden"
                  name="combinations"
                  value={values.combinations ?? ""}
                />
                <div className="restriction-tools flex justify-end">
                  <button
                    type="button"
                    onClick={swapOpponentRestrictions}
                    disabled={
                      !hasSubmittedValues(values, "lho") &&
                      !hasSubmittedValues(values, "rho")
                    }
                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Swap LHO ↔ RHO
                  </button>
                </div>
                <RestrictionBlock
                  title="Partner (South)"
                  prefix="partner"
                  values={values}
                  onValueChange={handleValueChange}
                  onClear={clearRestrictions}
                  defaultOpen={Boolean(
                    state?.errors?.general?.some((error) =>
                      error.startsWith("Partner:"),
                    ),
                  )}
                />
                <RestrictionBlock
                  title="East (LHO)"
                  prefix="lho"
                  values={values}
                  onValueChange={handleValueChange}
                  onClear={clearRestrictions}
                  defaultOpen={Boolean(
                    state?.errors?.general?.some((error) =>
                      error.startsWith("LHO:"),
                    ),
                  )}
                />
                <RestrictionBlock
                  title="West (RHO)"
                  prefix="rho"
                  values={values}
                  onValueChange={handleValueChange}
                  onClear={clearRestrictions}
                  defaultOpen={Boolean(
                    state?.errors?.general?.some((error) =>
                      error.startsWith("RHO:"),
                    ),
                  )}
                />
                <details
                  open={combinations.length > 0}
                  className="advanced-editor text-sm"
                >
                  <summary className="cursor-pointer text-slate-600">
                    Advanced combinations
                    {combinations.length > 0 ? ` (${combinations.length})` : ""}
                  </summary>
                  <CombinationEditor
                    combinations={combinations}
                    onChange={(nextCombinations) =>
                      handleValueChange(
                        "combinations",
                        nextCombinations.length > 0
                          ? JSON.stringify(nextCombinations)
                          : "",
                      )
                    }
                  />{" "}
                </details>
              </div>
            </CollapsiblePanel>
            <CollapsiblePanel
              title="Calculation"
              defaultOpen={true}
              className="calculation-section order-4"
            >
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
                    onChange={(e) =>
                      handleValueChange("taskType", e.target.value)
                    }
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
                  <input
                    type="hidden"
                    name="contractLevel"
                    value={contractLevel}
                  />
                  <input
                    type="hidden"
                    name="contractStrain"
                    value={contractStrain}
                  />

                  <div className="contract-options mt-2">
                    <div className="grid grid-cols-7 gap-1">
                      {CONTRACT_LEVELS.map((level) => {
                        const active = contractLevel === level;

                        return (
                          <button
                            key={level}
                            type="button"
                            aria-pressed={active}
                            onClick={() =>
                              handleValueChange("contractLevel", level)
                            }
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
                            onClick={() =>
                              handleValueChange("contractStrain", strain)
                            }
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
                      onChange={(e) =>
                        handleValueChange("boardsK", e.target.value)
                      }
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
                    onChange={(e) =>
                      handleValueChange("postmortem", e.target.value)
                    }
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

              <FieldError errors={state?.errors?.boardsK} />
              <FieldError errors={state?.errors?.calculation} />
            </CollapsiblePanel>
          </div>

          {state?.message && !state.taskId ? (
            <div className="mt-5 rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-800 shadow-sm">
              {state?.message}
              <FieldError errors={state?.errors?.general} />
            </div>
          ) : null}

          {cancelError ? (
            <p className="mt-3 text-sm text-red-700">{cancelError}</p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4">
            {state?.taskId && isTaskRunning ? (
              <Button
                type="button"
                variant={ButtonVariant.SECONDARY}
                disabled={isCancelling}
                onClick={handleCancelTask}
                className="rounded-md px-5 py-2.5"
              >
                {isCancelling ? "Cancelling…" : "Cancel task"}
              </Button>
            ) : null}
            <Button
              type="submit"
              disabled={pending || isTaskRunning || isCancelling}
              className="flex-1 rounded-lg bg-gradient-to-b from-blue-500 to-blue-600 px-5 py-3 enabled:cursor-pointer"
            >
              {pending
                ? "Starting…"
                : state?.taskId
                  ? "Run again"
                  : "▶ Run analysis"}
            </Button>
          </div>
        </div>
        <aside className="results-column min-w-0" aria-label="Analysis results">
          <ResultsPanel
            taskId={lastRun?.taskId}
            starting={pending}
            onStatusChange={handleTaskStatusChange}
            stale={Boolean(
              lastRun &&
              lastRun.configuration !== configurationSnapshot(values),
            )}
          />
        </aside>
      </form>
    </>
  );
}
