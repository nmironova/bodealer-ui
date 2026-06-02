export type Suit = "S" | "H" | "D" | "C";
export type Seat = "N" | "E" | "S" | "W";
export type RelativeSeat = "partner" | "lho" | "rho";
export type Strain = "S" | "H" | "D" | "C" | "NT";

export type HandText = string; // e.g. "102 A1093 KJ2 A982"

export type Contract = {
  level: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  strain: Strain;
  declarer: Seat;
};

export enum CalculationType {
  ONE_SIDED_BIDDING_LEVEL = "ONE_SIDED_BIDDING_LEVEL",
  SEEK_OPENING_LEAD = "SEEK_OPENING_LEAD",
}

export type RangeConstraint = {
  min?: number;
  max?: number;
};

export type SuitLengthConstraints = {
  spades?: RangeConstraint;
  hearts?: RangeConstraint;
  diamonds?: RangeConstraint;
  clubs?: RangeConstraint;
};

export type HandShapeConstraints = {
  noSixCardSuit?: boolean;
};

export type PlayerRestrictions = {
  hcp?: RangeConstraint;
  suitLengths?: SuitLengthConstraints;
  shape?: HandShapeConstraints;
};

export type RelativeSeatRestrictions = {
  partner?: PlayerRestrictions;
  lho?: PlayerRestrictions;
  rho?: PlayerRestrictions;
};

export type TaskConfigDto = {
  meta: {
    name: string;
    description?: string;
  };
  deal: {
    fixedSeat: Seat; // for now always "N"
    fixedHand: HandText; // for now north hand
    restrictions?: RelativeSeatRestrictions;
  };
  settings: {
    dealsK: number; // e.g. 10 => 10,000
    seed?: number;
  };
  calculation: {
    type: CalculationType;
    targetContract?: {
      level: 1 | 2 | 3 | 4 | 5 | 6 | 7;
      strain: Strain;
    };
  };
};
