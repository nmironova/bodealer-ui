import { expect, test } from "@playwright/test";
import board from "../fixtures/abc123.bodealer.json";
import { parseBoardFile } from "../../app/lib/board-config-file";
import { prepareTask } from "../../app/lib/prepare-task";

for (const description of [
  "sadasdsa",
  "",
  "Partner opened 1NT\nTest the spade game",
]) {
  test(`Walrus can select ABC123 with ${description ? "description: " + description.replaceAll("\n", " / ") : "no description"}`, () => {
    const values = parseBoardFile(JSON.stringify(board));
    values.description = description;
    const data = new FormData();
    for (const [key, value] of Object.entries(values)) data.set(key, value);
    const result = prepareTask(data);
    expect(result.errors).toEqual({});
    const config = "configText" in result ? result.configText : undefined;
    expect(config).toBeDefined();
    const lines = config!.split("\n");
    const selectedName = lines[0].slice("TASK NAME:".length);
    const sectionStart = lines.indexOf("----------");
    // waConfTask.cpp stays in S_WAIT_TASK until it finds the selected name
    // in the task body; descriptions must not take the heading's place.
    expect(lines[sectionStart + 1]).toBe(selectedName);
    expect(selectedName).toBe("ABC123");
    if (description) expect(config).toContain(`\nABC123\n${description}\n`);
    expect(config).toContain("HAND: N:T9542.95.QJT.AQT");
    expect(config).toContain("PRIMARY SCORER: V4S BY S");
    expect(config).toContain("SOUTH: PointsRange, 14, 17");
    expect(config).toContain("EAST: SpadesLen, 0, 5");
    expect(config).toContain("WEST: SpadesLen, 0, 5");
  });
}
