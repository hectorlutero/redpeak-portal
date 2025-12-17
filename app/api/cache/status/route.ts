import { NextResponse } from "next/server";
import { getCacheStatus } from "@/services/cache";

export async function GET() {
  try {
    const status = await getCacheStatus();

    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error("Erro ao buscar status do cache:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
