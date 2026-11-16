"use server";

import { headers } from "next/headers";
import { requireSession, sameOrigin } from "./auth/request";
import { submissionLimit } from "./auth/task-access";
import { backendFetch, responseJson } from "./backend";
import { prepareTask, type NewTaskState } from "./prepare-task";
export type { NewTaskState } from "./prepare-task";

export async function createBodealerTask(
  _prevState: NewTaskState | undefined,
  formData: FormData,
): Promise<NewTaskState> {
  const session = await requireSession();
  const requestHeaders = await headers();
  if (!sameOrigin(requestHeaders))
    return { message: "Invalid request origin.", errors: {}, values: {} };
  const limit = submissionLimit(requestHeaders, session);
  if (!limit.allowed)
    return {
      message: "Too many task submissions. Please wait before trying again.",
      errors: {},
      values: {},
    };
  const prepared = prepareTask(formData);
  if (!("configText" in prepared) || prepared.configText === undefined)
    return prepared;
  const { values, configText, fileName } = prepared;
  const uploadFormData = new FormData();
  uploadFormData.append(
    "configFile",
    new Blob([configText], { type: "text/plain" }),
    fileName,
  );
  try {
    const response = await backendFetch("/tasks", {
      method: "POST",
      body: uploadFormData,
    });
    const data = await responseJson(response);
    if (!response.ok)
      return {
        message: `Bodealer service rejected the request (HTTP ${response.status}).`,
        errors: {},
        values,
      };
    const id =
      typeof data === "object" && data !== null && "id" in data
        ? data.id
        : undefined;
    if (typeof id !== "string" && typeof id !== "number")
      return {
        message: "Task created but no id returned.",
        errors: { general: ['Missing "id" in response.'] },
        values,
      };
    if (!String(id))
      return {
        message: "Task created but no id returned.",
        errors: {},
        values,
      };
    return {
      message: "Board started.",
      errors: {},
      values,
      taskId: String(id),
    };
  } catch {
    return {
      message: "Failed to reach Bodealer service. Please try again.",
      errors: {},
      values,
    };
  }
}
