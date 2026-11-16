import { expect, test } from "@playwright/test";

import { createBodealerTask } from "../../app/lib/actions";
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
    test(`${taskType} sends ${declarer} as declarer in the uploaded server config`, async () => {
      const values = { ...boardValues(), taskType, contractDeclarer: declarer };
      const data = toFormData(values);
      const originalFetch = globalThis.fetch;
      let uploadedConfig: string | undefined;
      let requestedMethod: string | undefined;
      globalThis.fetch = async (_url, options) => {
        requestedMethod = options?.method;
        const configFile = (options?.body as FormData).get("configFile");
        expect(configFile).toBeInstanceOf(Blob);
        uploadedConfig = await (configFile as Blob).text();
        return Response.json({ id: "test-task" });
      };
      try {
        const result = await createBodealerTask(undefined, data);
        expect(result.taskId).toBe("test-task");
        expect(requestedMethod).toBe("POST");
        expect(uploadedConfig).toContain(`PRIMARY SCORER: V3N BY ${declarer}`);
        expect(uploadedConfig).toContain("HAND: N:K865.AKT83.Q74.K");
        // Declarer choice must not rotate the fixed hand or restriction seats.
        expect(uploadedConfig).toContain("SOUTH: PointsRange, 7, 8");
        expect(uploadedConfig).toContain("EAST: SpadesLen, 0, 5");
      } finally {
        globalThis.fetch = originalFetch;
      }
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

test("invalid declarer values are rejected before contacting the server", async () => {
  const originalFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async () => {
    requests += 1;
    throw new Error("Unexpected request");
  };
  try {
    for (const declarer of ["E", "W", "", "invalid"]) {
      const result = await createBodealerTask(
        undefined,
        toFormData({ ...boardValues(), contractDeclarer: declarer }),
      );
      expect(result.taskId).toBeUndefined();
      expect(result.errors.calculation).toEqual([
        "Declarer must be We (North) or Partner (South).",
      ]);
    }
    expect(requests).toBe(0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
