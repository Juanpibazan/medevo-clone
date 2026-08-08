import { NextResponse } from "next/server";
import { pool } from "@/db/client";
export async function GET() {
  try {
    await pool.query("select 1");
    return NextResponse.json({ status: "ready" });
  } catch {
    return NextResponse.json({ status: "unavailable" }, { status: 503 });
  }
}
