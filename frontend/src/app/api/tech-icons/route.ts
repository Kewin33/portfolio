import { readdir } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

function toLabel(filePath: string) {
  const fileName = filePath.split("/").pop() || filePath;
  return fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
}

export async function GET() {
  try {
    const techDir = path.join(process.cwd(), "public", "tech");
    const entries = await readdir(techDir, { withFileTypes: true });
    const techIcons = entries
      .filter((entry) => entry.isFile())
      .map((entry) => `/tech/${entry.name}`)
      .sort((a, b) => a.localeCompare(b));

    const icons = ["/next.svg", ...techIcons].map((src) => ({
      src,
      label: toLabel(src),
    }));

    return NextResponse.json({ icons });
  } catch {
    return NextResponse.json({ icons: [{ src: "/next.svg", label: "next" }] });
  }
}