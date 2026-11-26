"use client";

import SuitText from "../../ui/suit-text";
import { useState } from "react";
import EditorSection from "../../ui/editor-section";
import {
  RestrictionBlock,
  CombinationEditor,
  parseCombinationValue,
  restrictionSummary,
} from "./restriction-editors";

const players = [
  {
    prefix: "partner",
    label: "South (Partner)",
    short: "South",
    error: "Partner:",
  },
  { prefix: "lho", label: "East (LHO)", short: "East", error: "LHO:" },
  { prefix: "rho", label: "West (RHO)", short: "West", error: "RHO:" },
];

type Props = {
  compact: boolean;
  values: Record<string, string>;
  onValueChange: (name: string, value: string) => void;
  onClear: (prefix: string) => void;
  onSwap: () => void;
  errors?: string[];
};

export default function RestrictionsPanel({
  compact,
  values,
  onValueChange,
  onClear,
  onSwap,
  errors,
}: Props) {
  const [selected, setSelected] = useState("partner");
  const combinations = parseCombinationValue(values.combinations);
  return (
    <EditorSection
      title="Restrictions"
      compact={compact}
      editLabel="Edit restrictions"
      className="restrictions-section"
      summary={(open) => (
        <div className="restriction-summaries">
          {players.map((player) => (
            <button
              key={player.prefix}
              type="button"
              className="restriction-summary"
              aria-label={`Edit ${player.label} restrictions`}
              onClick={() => {
                setSelected(player.prefix);
                const details = document.getElementById(
                  `restriction-${player.prefix}`,
                ) as HTMLDetailsElement | null;
                if (details) details.open = true;
                open();
              }}
            >
              <strong>{player.short}</strong>
              <span>
                <SuitText>
                  {restrictionSummary(values, player.prefix).join(" · ") ||
                    "No restrictions"}
                </SuitText>
              </span>
              <span className="summary-arrow" aria-hidden="true">
                ›
              </span>
            </button>
          ))}
          {combinations.length > 0 && (
            <span className="combination-count">
              {combinations.length} advanced{" "}
              {combinations.length === 1 ? "group" : "groups"}
            </span>
          )}
        </div>
      )}
    >
      <input
        type="hidden"
        name="combinations"
        value={values.combinations ?? ""}
      />
      <div className="restriction-toolbar">
        <p>Shape the other three hands.</p>
        <button type="button" onClick={onSwap} className="text-action">
          Swap LHO ↔ RHO
        </button>
      </div>
      <div className="restriction-players">
        {players.map((player) => (
          <RestrictionBlock
            key={player.prefix}
            title={player.label}
            prefix={player.prefix}
            values={values}
            onValueChange={onValueChange}
            onClear={onClear}
            defaultOpen={
              selected === player.prefix ||
              Boolean(errors?.some((error) => error.startsWith(player.error)))
            }
          />
        ))}
      </div>
      <details open={combinations.length > 0} className="advanced-editor">
        <summary>
          Advanced combinations
          {combinations.length > 0 ? ` (${combinations.length})` : ""}
        </summary>
        <CombinationEditor
          combinations={combinations}
          onChange={(next) =>
            onValueChange(
              "combinations",
              next.length ? JSON.stringify(next) : "",
            )
          }
        />
      </details>
    </EditorSection>
  );
}
