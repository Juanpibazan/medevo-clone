import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/modules/identity";
import { practiceService } from "@/modules/practice";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId, itemId, alternativeId, elapsedSeconds, responseText } =
      await req.json();

    if (
      !sessionId ||
      !itemId ||
      elapsedSeconds === undefined ||
      (alternativeId === undefined && responseText === undefined)
    ) {
      return NextResponse.json(
        { error: "Missing parameters" },
        { status: 400 },
      );
    }

    await practiceService.saveDraftResponse(
      sessionId,
      itemId,
      session.user.id,
      alternativeId || null,
      elapsedSeconds,
      responseText,
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
