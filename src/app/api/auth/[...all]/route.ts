import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/modules/identity/infrastructure/auth";
import { sanitizeAuthResponse } from "@/modules/identity/application/sanitize-auth-response";

const handlers = toNextJsHandler(auth);

async function sanitizeResponse(response: Response): Promise<Response> {
  if (!response.headers.get("content-type")?.includes("application/json")) return response;
  const payload = await response.json();
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return new Response(JSON.stringify(sanitizeAuthResponse(payload)), {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export async function GET(request: Request) {
  return sanitizeResponse(await handlers.GET(request));
}

export async function POST(request: Request) {
  return sanitizeResponse(await handlers.POST(request));
}
