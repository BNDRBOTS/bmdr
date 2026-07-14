import { readFile } from "node:fs/promises";
import { readCookie, verifyToken } from "./_shared/auth.mjs";

const COOKIE_NAME = "bmdr_access";
const APP_FILE = new URL("./_private/app.html", import.meta.url);

function env(name) {
  return globalThis.Netlify?.env?.get(name) || globalThis.process?.env?.[name] || "";
}

function responseHeaders() {
  return {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "private, no-store, max-age=0",
    "pragma": "no-cache",
    "x-content-type-options": "nosniff",
    "x-robots-tag": "noindex, nofollow",
    "content-security-policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https://r2-uploader-production.up.railway.app; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'"
  };
}

export default async function protectedApp(request) {
  if (!["GET", "HEAD"].includes(request.method)) {
    return new Response("Method not allowed.", {
      status: 405,
      headers: { allow: "GET, HEAD" }
    });
  }

  const secret = env("BMDR_SESSION_SECRET");
  if (secret.length < 32) {
    return new Response("Purchase enforcement is not configured.", {
      status: 503,
      headers: responseHeaders()
    });
  }

  const token = readCookie(request.headers.get("cookie"), COOKIE_NAME);
  const authorized = await verifyToken(token, secret);
  if (!authorized) {
    const destination = new URL("/access.html", request.url);
    destination.searchParams.set("return", new URL(request.url).pathname);
    return Response.redirect(destination, 302);
  }

  try {
    const html = await readFile(APP_FILE, "utf8");
    return new Response(request.method === "HEAD" ? null : html, {
      status: 200,
      headers: responseHeaders()
    });
  } catch (error) {
    console.error("BMDR protected app unavailable", {
      message: error instanceof Error ? error.message : String(error)
    });
    return new Response("BMDR is temporarily unavailable.", {
      status: 503,
      headers: responseHeaders()
    });
  }
}

export const config = {
  path: ["/app.html", "/bmdr.html"],
  method: ["GET", "HEAD"]
};
