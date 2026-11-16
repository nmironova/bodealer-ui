import { createServer } from "node:http";
import { testEnvironment } from "./test-env.mjs";

const requests = [];
const tasks = new Map();
createServer(async (request, response) => {
  const json = (status, data) => {
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(JSON.stringify(data));
  };
  if (request.url === "/health") return json(200, { ok: true });
  if (request.url === "/__test__/requests") return json(200, requests);
  let body = "";
  for await (const chunk of request) body += chunk;
  requests.push({
    method: request.method,
    url: request.url,
    authorization: request.headers.authorization,
    contentType: request.headers["content-type"],
    body,
  });
  if (
    request.headers.authorization !==
    `Bearer ${testEnvironment.BACKEND_API_TOKEN}`
  )
    return json(401, { error: "Invalid service credential" });
  if (request.url === "/tasks" && request.method === "POST") {
    const id = `task-${tasks.size + 1}`;
    tasks.set(id, { polls: 0, cancelled: false });
    return json(202, { id });
  }
  if (request.url === "/tasks/failed-test")
    return json(200, {
      status: "failed",
      error: `Internal failure ${testEnvironment.BACKEND_API_TOKEN} at ${testEnvironment.BODEALER_API_URL}`,
    });
  const task = tasks.get(decodeURIComponent(request.url.split("/").at(-1)));
  if (!task)
    return json(404, {
      error: `Internal test secret ${testEnvironment.BACKEND_API_TOKEN} at ${testEnvironment.BODEALER_API_URL}`,
    });
  if (request.method === "DELETE") {
    task.cancelled = true;
    response.writeHead(204);
    return response.end();
  }
  if (task.cancelled) return json(200, { status: "cancelled" });
  task.polls += 1;
  if (task.polls === 1)
    return json(200, {
      status: "running",
      logTail: "  NORTH   EAST\nPartial Walrus output\n",
    });
  return json(200, {
    status: "completed",
    resultText: "  NORTH   EAST\nFinal Walrus output\n",
  });
}).listen(3211, "127.0.0.1");
