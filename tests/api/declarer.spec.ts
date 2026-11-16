import { expect, test } from "@playwright/test";

import { prepareTask } from "../../app/lib/prepare-task";
import {
  createBoardFile,
  parseBoardFile,
} from "../../app/lib/board-config-file";
import { formDataToTaskConfigDto } from "../../app/lib/bodealer-form";
import { buildWalrusConfig } from "../../app/lib/walrus-config";

function boardValues() {
  return {
    name: "Declarer test",
    hand: "K865 AK1083 Q74 K",
    taskType: "ONE_SIDED_BIDDING_LEVEL",
    contractLevel: "3",
    contractStrain: "NT",
    boardsK: "10",
    postmortem: "AUTO",
    "partner.hcpMin": "7",
    "partner.hcpMax": "8",
    "lho.spadesMax": "5",
  };
}

function toFormData(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

for (const taskType of ["ONE_SIDED_BIDDING_LEVEL", "SEEK_OPENING_LEAD"]) {
  for (const declarer of ["N", "S"]) {
    test(`${taskType} prepares ${declarer} as declarer in the server config`, async () => {
      const values = { ...boardValues(), taskType, contractDeclarer: declarer };
      const data = toFormData(values);
      const prepared = prepareTask(data);
      expect(prepared.errors).toEqual({});
      const config = "configText" in prepared ? prepared.configText : undefined;
      expect(config).toContain(`PRIMARY SCORER: V3N BY ${declarer}`);
      expect(config).toContain("HAND: N:K865.AKT83.Q74.K");
      expect(config).toContain("SOUTH: PointsRange, 7, 8");
      expect(config).toContain("EAST: SpadesLen, 0, 5");
    });
  }
}

test("board files preserve either declarer, and legacy files keep Partner as default", () => {
  for (const declarer of ["N", "S"]) {
    const loaded = parseBoardFile(
      JSON.stringify(
        createBoardFile({ ...boardValues(), contractDeclarer: declarer }),
      ),
    );
    const task = formDataToTaskConfigDto(toFormData(loaded), loaded.hand);
    expect(task.calculation.targetContract?.declarer).toBe(declarer);
    expect(buildWalrusConfig(task)).toContain(
      `PRIMARY SCORER: V3N BY ${declarer}`,
    );
  }
  const legacy = parseBoardFile(JSON.stringify(createBoardFile(boardValues())));
  const task = formDataToTaskConfigDto(toFormData(legacy), legacy.hand);
  expect(buildWalrusConfig(task)).toContain("PRIMARY SCORER: V3N BY S");
  delete task.calculation.targetContract!.declarer;
  expect(buildWalrusConfig(task)).toContain("PRIMARY SCORER: V3N BY S");
});

test("invalid declarer values are rejected before submission", () => {
  for (const declarer of ["E", "W", "", "invalid"]) {
    const result = prepareTask(
      toFormData({ ...boardValues(), contractDeclarer: declarer }),
    );
    expect("configText" in result).toBe(false);
    expect(result.errors.calculation).toEqual([
      "Declarer must be We (North) or Partner (South).",
    ]);
  }
});
