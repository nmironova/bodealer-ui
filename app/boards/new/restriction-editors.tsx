"use client";

import type {
  AdvancedCombinationFilter,
  AnyInListBelowFilter,
  CombinationRangeFilter,
  CombinationSeat,
  WalrusRangeFilterName,
} from "@/app/lib/dto/task-config";
function hasSubmittedValues(values: Record<string, string>, prefix: string) {
  return Object.entries(values).some(
    ([key, value]) => key.startsWith(`${prefix}.`) && value !== "",
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
  const errorId = `${labelId}.error`;
  const boundsInvalid = [minValue, maxValue].some(
    (value) =>
      value !== "" &&
      (!Number.isInteger(Number(value)) ||
        Number(value) < field.min ||
        Number(value) > field.max),
  );
  const inverted =
    minValue !== "" && maxValue !== "" && Number(minValue) > Number(maxValue);
  const error = boundsInvalid
    ? `Use whole numbers from ${field.min} to ${field.max}.`
    : inverted
      ? "Minimum must not exceed maximum."
      : undefined;

  return (
    <div className="range-row">
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
        aria-label={`${field.label} min`}
        name={minName}
        type="number"
        inputMode="numeric"
        min={field.min}
        max={field.max}
        step={1}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        autoComplete="off"
        placeholder="min"
        value={minValue}
        onChange={(e) => onValueChange(minName, e.target.value)}
        className="h-9 w-full rounded-md border border-gray-300 bg-white px-2 text-center text-sm outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
      <span className="text-sm text-gray-400">-</span>
      <input
        aria-label={`${field.label} max`}
        name={maxName}
        type="number"
        inputMode="numeric"
        min={field.min}
        max={field.max}
        step={1}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        autoComplete="off"
        placeholder="max"
        value={maxValue}
        onChange={(e) => onValueChange(maxName, e.target.value)}
        className="h-9 w-full rounded-md border border-gray-300 bg-white px-2 text-center text-sm outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
      {error && (
        <p id={errorId} className="range-error">
          {error}
        </p>
      )}
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

export function restrictionSummary(
  values: Record<string, string>,
  prefix: string,
) {
  const chips: string[] = [];

  for (const field of RESTRICTION_RANGES) {
    const summary = getRangeSummary(values, prefix, field.key);
    if (summary)
      chips.push(
        `${"symbol" in field ? field.symbol : field.label} ${summary}`,
      );
  }

  for (const field of SUIT_POINT_RANGES) {
    const summary = getRangeSummary(values, prefix, field.key);
    if (summary) chips.push(`${field.symbol} points ${summary}`);
  }

  if (values[`${prefix}.noSixCardSuit`] === "true") {
    chips.push("No 6+ suit");
  }
  if (
    (prefix === "lho" || prefix === "rho") &&
    values[`${prefix}.noOvercall`] === "true"
  ) {
    chips.push("No overcall");
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

export function RestrictionBlock({
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
      id={`restriction-${prefix}`}
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
        {(prefix === "lho" || prefix === "rho") && (
          <label className="opponent-option flex items-center gap-2 text-sm text-gray-900">
            <input
              type="checkbox"
              name={`${prefix}.noOvercall`}
              value="true"
              checked={values[`${prefix}.noOvercall`] === "true"}
              onChange={(event) =>
                onValueChange(
                  `${prefix}.noOvercall`,
                  event.target.checked ? "true" : "",
                )
              }
              className="rounded border-gray-300 text-blue-600"
            />
            No overcall
          </label>
        )}
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

export function parseCombinationValue(
  value?: string,
): AdvancedCombinationFilter[] {
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

export function CombinationEditor({
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
