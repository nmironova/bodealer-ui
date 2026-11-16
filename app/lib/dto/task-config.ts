export type Suit = "S" | "H" | "D" | "C";
export type Seat = "N" | "E" | "S" | "W";
export type RelativeSeat = "partner" | "lho" | "rho";
export type Strain = "S" | "H" | "D" | "C" | "NT";
export type PostmortemMode = "AUTO" | "SUIT";

export type HandText = string; // e.g. "102 A1093 KJ2 A982"

export type Contract = {
  level: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  strain: Strain;
  declarer: Seat;
};

export enum CalculationType {
  FIXED_ONE_HAND = "FIXED_ONE_HAND",
  FOUR_HANDS_TASK = "FOUR_HANDS_TASK",
  FILTERING_ONLY = "FILTERING_ONLY",
  ONE_SIDED_BIDDING_LEVEL = "ONE_SIDED_BIDDING_LEVEL",
  ONE_SIDED_DENOMINATION = "ONE_SIDED_DENOMINATION",
  COMPETITIVE_GENERIC = "COMPETITIVE_GENERIC",
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

export type SuitPointConstraints = {
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
  suitPoints?: SuitPointConstraints;
  shape?: HandShapeConstraints;
};

export type RelativeSeatRestrictions = {
  partner?: PlayerRestrictions;
  lho?: PlayerRestrictions;
  rho?: PlayerRestrictions;
};

export type WalrusRangeFilterName =
  | "PointsRange"
  | "ControlsRange"
  | "SpadesLen"
  | "HeartsLen"
  | "DiamondsLen"
  | "ClubsLen";

export type CombinationSeat = RelativeSeat;

export type CombinationRangeFilter = {
  type: "range";
  seat: CombinationSeat;
  filter: WalrusRangeFilterName;
  min: number;
  max: number;
};

export type AnyInListBelowFilter = {
  type: "anyInListBelow";
  seat: CombinationSeat;
  filters: CombinationRangeFilter[];
};

export type ExcludeCombinationFilter = {
  type: "excludeCombination";
  seat: CombinationSeat;
  filters: Array<CombinationRangeFilter | AnyInListBelowFilter>;
};

export type AdvancedCombinationFilter =
  | ExcludeCombinationFilter
  | AnyInListBelowFilter;

export type TaskConfigDto = {
  meta: {
    name: string;
    description?: string;
  };
  deal: {
    fixedSeat: Seat; // for now always "N"
    fixedHand: HandText; // for now north hand
    restrictions?: RelativeSeatRestrictions;
    combinations?: AdvancedCombinationFilter[];
  };
  settings: {
    dealsK: number; // e.g. 10 => 10,000
    postmortem: PostmortemMode;
    seed?: number;
  };
  calculation: {
    type: CalculationType;
    targetContract?: {
      level: 1 | 2 | 3 | 4 | 5 | 6 | 7;
      strain: Strain;
      declarer?: Seat; // Defaults to the fixed hand's partner for legacy configs.
    };
  };
};
