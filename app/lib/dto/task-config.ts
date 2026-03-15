export type Suit = "S" | "H" | "D" | "C";
export type Seat = "N" | "E" | "S" | "W";

export type HandText = string; // v0: "102 A1093 KJ2 A982" (later parsed)

export type Contract = {
  level: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  strain: Suit | "NT";
  declarer: Seat;
};

export type CalculationType =
  | {
      kind: "contract-chances";
      contract: Contract;
      // optional: vulnerability, doubling, etc later
    }
  | {
      kind: "opening-lead";
      contract: Contract; // usually 3NT etc
    };

// The full config you send to Windows service
export type TaskConfigDto = {
  deal: {
    northHand: HandText;
    // later:
    // southHand?: HandText;
    // eastHand?: HandText;
    // westHand?: HandText;
    // constraints?: {...}
  };
  settings: {
    dealsK: number; // thousands, e.g. 10 => 10,000
    seed?: number;
  };
  calculation: CalculationType;
};
