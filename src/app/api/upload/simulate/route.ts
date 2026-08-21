import { type NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export async function PUT(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get("filename");

  if (!filename) {
    return NextResponse.json(
      { error: "Missing filename parameter" },
      { status: 400 },
    );
  }

  try {
    // Determine path to public/uploads
    const uploadsDir = path.join(process.cwd(), "public", "uploads");

    // Ensure uploads directory exists
    await fs.mkdir(uploadsDir, { recursive: true });

    // Read raw body stream
    const arrayBuffer = await request.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save file
    const filePath = path.join(uploadsDir, filename);
    await fs.writeFile(filePath, buffer);

    return NextResponse.json({
      success: true,
      url: `/uploads/${filename}`,
    });
  } catch (err) {
    console.error("Local upload simulation failed:", err);
    return NextResponse.json(
      { error: "Failed to save file locally" },
      { status: 500 },
    );
  }
}
