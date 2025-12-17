import { NextResponse } from "next/server";
import { getSpaceTags } from "@/services/clickup";

export async function GET() {
  try {
    const tags = await getSpaceTags();

    return NextResponse.json({
      success: true,
      data: tags,
      count: tags.length,
    });
  } catch (error) {
    console.error("Erro ao buscar tags:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
