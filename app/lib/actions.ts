"use server";

import { redirect } from "next/navigation";

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

export async function createBodealerTask(
  _prevState: NewTaskState,
  formData: FormData,
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

  if (boardsK == null) errors.boardsK = ["Boards must be a number."];
  else if (boardsK < 1 || boardsK > 200)
    errors.boardsK = ["Boards must be between 1 and 200."];

  if (Object.keys(errors).length > 0) {
    return { message: "Please fix the errors.", errors };
  }

  const payload = {
    name,
    description,
    deal: { handN: hand },
    settings: { boardsK },
  };
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

  let data: any = null;
  try {
    data = await r.json();
  } catch {
    // ignore
  }

  if (!r.ok) {
    return {
      message: "Bodealer service rejected the request.",
      errors: { general: [data?.error || `HTTP ${r.status}`] },
    };
  }

  if (!data?.id) {
    return {
      message: "Task created but no id returned.",
      errors: { general: ['Missing "id" in response.'] },
    };
  }

  redirect(`/boards/${data.id}`);
}
