/**
 * GET /api/health
 *
 * Lightweight liveness/readiness probe used by the Dockerfile HEALTHCHECK and
 * by Render/Railway deployment checks.
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ status: "ok", time: new Date().toISOString() });
}
