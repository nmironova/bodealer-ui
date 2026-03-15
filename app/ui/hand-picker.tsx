"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

const SUITS = [
  { key: "S", icon: "/spades.png", color: "text-gray-900" },
  { key: "H", icon: "/hearts.png", color: "text-red-600" },
  { key: "D", icon: "/diamonds.png", color: "text-red-600" },
  { key: "C", icon: "/clubs.png", color: "text-gray-900" },
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

export default function HandPicker() {
  const [hand, setHand] = useState<HandState>(INITIAL_HAND);
  const [handTextInput, setHandTextInput] = useState(handToText(INITIAL_HAND));
  const [textError, setTextError] = useState<string | null>(null);

  const selectedCount = useMemo(
    () => Object.values(hand).reduce((sum, cards) => sum + cards.length, 0),
    [hand],
  );

  function syncFromHand(nextHand: HandState) {
    const nextText = handToText(nextHand);
    setHand(nextHand);
    setHandTextInput(nextText);
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

    const parsed = parseHandText(value);
    if (!parsed) {
      setTextError("Use format like: 102 A1093 KJ2 A982");
      return;
    }

    setHand(parsed);
    setTextError(null);
  }

  return (
    <div className="space-y-4">
      <input
        type="hidden"
        name="hand"
        value={handTextInput.trim().toUpperCase()}
      />

      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1">
            <label
              htmlFor="selected-hand"
              className="text-sm font-medium text-gray-900"
            >
              Selected hand
            </label>

            <input
              id="selected-hand"
              type="text"
              value={handTextInput}
              onChange={(e) => handleTextChange(e.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />

            {textError ? (
              <p className="mt-2 text-sm text-red-700">{textError}</p>
            ) : (
              <p className="mt-2 text-xs text-gray-500">
                Format:{" "}
                <span className="font-mono">spades hearts diamonds clubs</span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 sm:pt-8">
            <span
              className={`text-sm font-medium ${
                selectedCount === 13 ? "text-green-700" : "text-gray-600"
              }`}
            >
              {selectedCount}/13 cards
            </span>
            <button
              type="button"
              onClick={clearHand}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {SUITS.map((suit) => (
          <div
            key={suit.key}
            className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start gap-5">
              <div className="flex w-8 items-center justify-center pt-2">
                <Image
                  src={suit.icon}
                  alt={suit.key}
                  width={24}
                  height={24}
                  className="opacity-90"
                />
              </div>

              <div className="grid flex-1 grid-cols-4 gap-2 sm:grid-cols-7 lg:grid-cols-13">
                {RANKS.map((rank) => {
                  const selected = hand[suit.key].includes(rank);

                  return (
                    <button
                      key={`${suit.key}-${rank}`}
                      type="button"
                      onClick={() => toggleCard(suit.key, rank)}
                      disabled={!selected && selectedCount >= 13}
                      className={[
                        "rounded-xl border px-3 py-2 text-sm font-semibold transition",
                        "disabled:cursor-not-allowed disabled:opacity-40",
                        selected
                          ? suit.color.includes("red")
                            ? "border-red-300 bg-red-50 text-red-700"
                            : "border-gray-400 bg-gray-200 text-gray-900"
                          : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
                      ].join(" ")}
                    >
                      {rank}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-500">
        Example: <span className="font-mono">102 A1093 KJ2 A982</span>
      </p>
    </div>
  );
}
