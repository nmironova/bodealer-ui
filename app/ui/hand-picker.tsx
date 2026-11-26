"use client";

import { useMemo, useState } from "react";
import EditorSection from "./editor-section";

const SUITS = [
  { key: "S", symbol: "♠", name: "Spades", color: "suit-black" },
  { key: "H", symbol: "♥", name: "Hearts", color: "suit-red" },
  { key: "D", symbol: "♦", name: "Diamonds", color: "suit-red" },
  { key: "C", symbol: "♣", name: "Clubs", color: "suit-black" },
] as const;

const RANKS = [
  "A",
  "K",
  "Q",
  "J",
  "10",
  "9",
  "8",
  "7",
  "6",
  "5",
  "4",
  "3",
  "2",
] as const;
const HAND_ORDER: SuitKey[] = ["S", "H", "D", "C"];

type SuitKey = (typeof SUITS)[number]["key"];
type Rank = (typeof RANKS)[number];
type HandState = Record<SuitKey, Rank[]>;

function isRank(value: string): value is Rank {
  return (RANKS as readonly string[]).includes(value);
}

const INITIAL_HAND: HandState = {
  S: [],
  H: [],
  D: [],
  C: [],
};

function sortRanks(ranks: Rank[]) {
  return [...ranks].sort((a, b) => RANKS.indexOf(a) - RANKS.indexOf(b));
}

function handToText(hand: HandState): string {
  return HAND_ORDER.map((suit) => {
    const cards = sortRanks(hand[suit]);
    return cards.length ? cards.join("") : "-";
  }).join(" ");
}

function parseSuitText(suitText: string): Rank[] | null {
  if (suitText === "-") return [];

  const result: Rank[] = [];
  let i = 0;

  while (i < suitText.length) {
    if (suitText.startsWith("10", i)) {
      result.push("10");
      i += 2;
      continue;
    }

    const char = suitText[i];

    if (!isRank(char)) {
      return null;
    }

    result.push(char);
    i += 1;
  }

  const unique = new Set(result);
  if (unique.size !== result.length) return null;

  return sortRanks(result);
}

function parseHandText(text: string): HandState | null {
  const parts = text.trim().toUpperCase().split(/\s+/);
  if (parts.length !== 4) return null;

  const spades = parseSuitText(parts[0]);
  const hearts = parseSuitText(parts[1]);
  const diamonds = parseSuitText(parts[2]);
  const clubs = parseSuitText(parts[3]);

  if (!spades || !hearts || !diamonds || !clubs) return null;

  const total = spades.length + hearts.length + diamonds.length + clubs.length;
  if (total > 13) return null;

  return {
    S: spades,
    H: hearts,
    D: diamonds,
    C: clubs,
  };
}

export function isCompleteHandText(text: string) {
  const parsed = parseHandText(text);
  return Boolean(
    parsed &&
    Object.values(parsed).reduce((sum, cards) => sum + cards.length, 0) === 13,
  );
}

export default function HandPicker({
  defaultHandText,
  onHandChange,
  compact = false,
}: {
  defaultHandText?: string;
  onHandChange?: (value: string) => void;
  compact?: boolean;
}) {
  const initialHand = parseHandText(defaultHandText ?? "") ?? INITIAL_HAND;
  const initialHandText = defaultHandText ?? handToText(INITIAL_HAND);
  const [hand, setHand] = useState<HandState>(initialHand);
  const [handTextInput, setHandTextInput] = useState(initialHandText);
  const [textError, setTextError] = useState<string | null>(null);
  const selectedCount = useMemo(
    () => Object.values(hand).reduce((sum, cards) => sum + cards.length, 0),
    [hand],
  );

  function syncFromHand(nextHand: HandState) {
    const nextText = handToText(nextHand);
    setHand(nextHand);
    setHandTextInput(nextText);
    onHandChange?.(nextText);
    setTextError(null);
  }

  function toggleCard(suit: SuitKey, rank: Rank) {
    const isSelected = hand[suit].includes(rank);

    if (isSelected) {
      const nextHand = {
        ...hand,
        [suit]: hand[suit].filter((card) => card !== rank),
      };
      syncFromHand(nextHand);
      return;
    }

    if (selectedCount >= 13) {
      return;
    }

    const nextHand = {
      ...hand,
      [suit]: sortRanks([...hand[suit], rank]),
    };
    syncFromHand(nextHand);
  }

  function clearHand() {
    syncFromHand({
      S: [],
      H: [],
      D: [],
      C: [],
    });
  }

  function handleTextChange(value: string) {
    setHandTextInput(value);
    onHandChange?.(value);

    const parsed = parseHandText(value);
    if (!parsed) {
      setTextError("Use format like: 102 A1093 KJ2 A982");
      return;
    }

    setHand(parsed);
    setTextError(null);
  }

  return (
    <EditorSection
      title="North"
      compact={compact}
      editLabel="Edit hand"
      className="hand-section"
      collapseOnLeave={isCompleteHandText(handTextInput)}
      hideLabel="Hide cards"
      keepSummaryInline
      badge={
        <span
          className={`hand-count ${selectedCount === 13 ? "complete" : ""}`}
        >
          {selectedCount} / 13 cards
        </span>
      }
      summary={(open, expanded, id) => (
        <button
          type="button"
          aria-label="Edit displayed hand"
          aria-controls={id}
          aria-expanded={expanded}
          onClick={open}
          className="hand-summary"
        >
          {SUITS.map((suit) => (
            <span key={suit.key} className="suit-summary-row">
              <span className={`suit-symbol ${suit.color}`} aria-hidden="true">
                {suit.symbol}
              </span>
              <span>{hand[suit.key].join(" ") || "—"}</span>
            </span>
          ))}
        </button>
      )}
    >
      <input
        type="hidden"
        name="hand"
        value={handTextInput.trim().toUpperCase()}
      />
      <div className="card-grid" aria-label="Choose your North hand">
        {SUITS.map((suit) => (
          <div
            key={suit.key}
            className="card-suit"
            role="group"
            aria-label={suit.name}
          >
            <span className={`suit-symbol ${suit.color}`} aria-hidden="true">
              {suit.symbol}
            </span>
            <div className="card-ranks">
              {RANKS.map((rank) => {
                const selected = hand[suit.key].includes(rank);
                return (
                  <button
                    key={`${suit.key}-${rank}`}
                    type="button"
                    aria-label={`${suit.name} ${rank}`}
                    aria-pressed={selected}
                    onClick={() => toggleCard(suit.key, rank)}
                    disabled={!selected && selectedCount >= 13}
                    className={`rank-card ${selected ? "selected" : ""}`}
                  >
                    {rank}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="hand-text-editor">
        <label htmlFor="selected-hand">Selected hand</label>
        <div>
          <input
            id="selected-hand"
            type="text"
            value={handTextInput}
            onChange={(event) => handleTextChange(event.target.value)}
            aria-invalid={Boolean(textError)}
            aria-describedby="hand-format"
          />
          <button type="button" className="edit-action" onClick={clearHand}>
            Clear hand
          </button>
        </div>
        <p
          id="hand-format"
          className={textError ? "field-error" : "field-hint"}
        >
          {textError ??
            "Text format: spades hearts diamonds clubs. Use - for an empty suit."}
        </p>
      </div>
    </EditorSection>
  );
}
