import type {
  CalculationType,
  PlayerRestrictions,
  RangeConstraint,
  Seat,
  SuitLengthConstraints,
  TaskConfigDto,
} from "./dto/task-config";

const RELATIVE_TO_ABSOLUTE: Record<
  "partner" | "lho" | "rho",
  Record<Seat, Seat>
> = {
  partner: { N: "S", S: "N", E: "W", W: "E" },
  lho: { N: "E", E: "S", S: "W", W: "N" },
  rho: { N: "W", W: "S", S: "E", E: "N" },
};

const FILTER_SEAT_NAMES: Record<Seat, "NORTH" | "EAST" | "SOUTH" | "WEST"> = {
  N: "NORTH",
  E: "EAST",
  S: "SOUTH",
  W: "WEST",
};

function resolveRelativeSeat(
  baseSeat: Seat,
  relative: "partner" | "lho" | "rho",
): Seat {
  return RELATIVE_TO_ABSOLUTE[relative][baseSeat];
}

function toFilterSeatName(seat: Seat): string {
  return FILTER_SEAT_NAMES[seat];
}

function normalizeSuitText(suitText: string): string {
  if (suitText === "-") return "";
  return suitText.toUpperCase().replace(/10/g, "T");
}

function buildHandLine(seat: Seat, handText: string): string {
  const parts = handText.trim().split(/\s+/);
  if (parts.length !== 4) {
    throw new Error(`Invalid hand text: "${handText}"`);
  }

  const [spades, hearts, diamonds, clubs] = parts.map(normalizeSuitText);
  return `HAND: ${seat}:${spades}.${hearts}.${diamonds}.${clubs}`;
}

function buildPrimaryScorer(task: TaskConfigDto): string {
  const target = task.calculation.targetContract;
  if (!target) {
    throw new Error("targetContract is required");
  }

  const declarer = resolveRelativeSeat(task.deal.fixedSeat, "partner");
  const strain = target.strain === "NT" ? "N" : target.strain;

  return `PRIMARY SCORER: V${target.level}${strain} BY ${declarer}`;
}

function toWalrusTaskType(type: CalculationType): string {
  return type;
}

function pushRangeFilter(
  lines: string[],
  seat: Seat,
  filterName: string,
  range: RangeConstraint | undefined,
  defaults: { min: number; max: number },
): void {
  if (!range) return;

  const min = range.min ?? defaults.min;
  const max = range.max ?? defaults.max;

  lines.push(`    ${toFilterSeatName(seat)}: ${filterName}, ${min}, ${max}`);
}

function pushSuitLengthFilters(
  lines: string[],
  seat: Seat,
  suitLengths?: SuitLengthConstraints,
): void {
  if (!suitLengths) return;

  pushRangeFilter(lines, seat, "SpadesLen", suitLengths.spades, {
    min: 0,
    max: 13,
  });
  pushRangeFilter(lines, seat, "HeartsLen", suitLengths.hearts, {
    min: 0,
    max: 13,
  });
  pushRangeFilter(lines, seat, "DiamondsLen", suitLengths.diamonds, {
    min: 0,
    max: 13,
  });
  pushRangeFilter(lines, seat, "ClubsLen", suitLengths.clubs, {
    min: 0,
    max: 13,
  });
}

function pushNoSixCardSuitFilters(
  lines: string[],
  seat: Seat,
  suitLengths?: SuitLengthConstraints,
): void {
  const suits: Array<{
    filterName: string;
    range?: RangeConstraint;
  }> = [
    { filterName: "SpadesLen", range: suitLengths?.spades },
    { filterName: "HeartsLen", range: suitLengths?.hearts },
    { filterName: "DiamondsLen", range: suitLengths?.diamonds },
    { filterName: "ClubsLen", range: suitLengths?.clubs },
  ];

  for (const { filterName, range } of suits) {
    const min = range?.min ?? 0;
    const max = range?.max ?? 13;
    const cappedMax = Math.min(max, 5);

    if (min > 5) {
      throw new Error(
        `Invalid restriction: ${toFilterSeatName(seat)} ${filterName} min ${min} conflicts with noSixCardSuit`,
      );
    }

    lines.push(
      `    ${toFilterSeatName(seat)}: ${filterName}, ${min}, ${cappedMax}`,
    );
  }
}

function pushPlayerFilters(
  lines: string[],
  seat: Seat,
  player?: PlayerRestrictions,
): void {
  if (!player) return;

  pushRangeFilter(lines, seat, "PointsRange", player.hcp, { min: 0, max: 37 });

  if (player.shape?.noSixCardSuit) {
    pushNoSixCardSuitFilters(lines, seat, player.suitLengths);
  } else {
    pushSuitLengthFilters(lines, seat, player.suitLengths);
  }
}

function pushDescription(lines: string[], task: TaskConfigDto): void {
  const description = task.meta.description?.trim();

  lines.push("----------");

  if (description) {
    for (const line of description.split(/\r?\n/)) {
      lines.push(line.trimEnd());
    }
  } else {
    lines.push(task.meta.name);
  }

  lines.push("");
}

export function buildWalrusConfig(task: TaskConfigDto): string {
  const lines: string[] = [];

  lines.push(`TASK NAME:${task.meta.name}`);
  lines.push(`TASK_TYPE:${toWalrusTaskType(task.calculation.type)}`);
  lines.push("");

  pushDescription(lines, task);

  lines.push(buildHandLine(task.deal.fixedSeat, task.deal.fixedHand));
  lines.push(buildPrimaryScorer(task));
  lines.push(`POSTMORTEM: ${task.settings.postmortem}`);
  lines.push("");
  lines.push("FILTERS:");

  const fixedSeat = task.deal.fixedSeat;
  const partnerSeat = resolveRelativeSeat(fixedSeat, "partner");
  const lhoSeat = resolveRelativeSeat(fixedSeat, "lho");
  const rhoSeat = resolveRelativeSeat(fixedSeat, "rho");

  pushPlayerFilters(lines, partnerSeat, task.deal.restrictions?.partner);
  pushPlayerFilters(lines, lhoSeat, task.deal.restrictions?.lho);
  pushPlayerFilters(lines, rhoSeat, task.deal.restrictions?.rho);

  if (!task.deal.restrictions?.lho || !task.deal.restrictions?.rho) {
    lines.push("");
  }

  if (!task.deal.restrictions?.lho) {
    lines.push(`    ${toFilterSeatName(lhoSeat)}: NoOvercall`);
  }

  if (!task.deal.restrictions?.rho) {
    lines.push(`    ${toFilterSeatName(rhoSeat)}: NoOvercall`);
  }

  lines.push("----------");
  lines.push(`SCALE: ${task.settings.dealsK}`);

  return lines.join("\n");
}
