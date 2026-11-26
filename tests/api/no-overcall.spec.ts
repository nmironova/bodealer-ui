import { expect, test } from "@playwright/test";
import { prepareTask } from "../../app/lib/prepare-task";
import {
  createBoardFile,
  parseBoardFile,
} from "../../app/lib/board-config-file";
import board from "../fixtures/abc123.bodealer.json";

function config(overrides: Record<string, string>) {
  const values = parseBoardFile(
    JSON.stringify(createBoardFile({ ...board.values, ...overrides })),
  );
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  const result = prepareTask(data);
  expect(result.errors).toEqual({});
  return "configText" in result ? result.configText! : "";
}

for (const [prefix, seat, otherSeat] of [
  ["lho", "EAST", "WEST"],
  ["rho", "WEST", "EAST"],
]) {
  test(`${seat} NoOvercall is explicit and coexists with other restrictions`, () => {
    const text = config({
      [`${prefix}.noOvercall`]: "true",
      [`${prefix}.hcpMin`]: "6",
      [`${prefix}.hcpMax`]: "10",
    });
    expect(text.match(new RegExp(`${seat}: NoOvercall`, "g"))).toHaveLength(1);
    expect(text).toContain(`${seat}: PointsRange, 6, 10`);
    expect(text).toContain(`${seat}: SpadesLen, 0, 5`);
    expect(text).not.toContain(`${otherSeat}: NoOvercall`);
  });
}

test("both opponents may be selected and saved without changing the board format", () => {
  const values = {
    ...board.values,
    "lho.noOvercall": "true",
    "rho.noOvercall": "true",
  };
  const file = createBoardFile(values);
  expect(file.version).toBe(1);
  expect(parseBoardFile(JSON.stringify(file))).toMatchObject({
    "lho.noOvercall": "true",
    "rho.noOvercall": "true",
  });
  const text = config(values);
  expect(text).toContain("EAST: NoOvercall");
  expect(text).toContain("WEST: NoOvercall");
});

test("unchecked and absent flags never emit implicit NoOvercall filters", () => {
  expect(config({})).not.toContain("NoOvercall");
  expect(
    config({ "lho.noOvercall": "false", "rho.noOvercall": "false" }),
  ).not.toContain("NoOvercall");
  // No other opponent restrictions must not implicitly enable the option either.
  const values = {
    ...board.values,
    "lho.noSixCardSuit": "",
    "rho.noSixCardSuit": "",
  };
  expect(config(values)).not.toContain("NoOvercall");
});

test("NoOvercall cannot be loaded as a partner restriction", () => {
  expect(() =>
    parseBoardFile(
      JSON.stringify({
        format: "bodealer-board",
        version: 1,
        values: { "partner.noOvercall": "true" },
      }),
    ),
  ).toThrow("invalid setting");
});
