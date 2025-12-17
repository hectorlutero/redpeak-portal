import { NextResponse } from "next/server";
import { getListMembers } from "@/services/clickup";

export async function GET() {
  try {
    const members = await getListMembers();

    return NextResponse.json({
      success: true,
      data: members,
      count: members.length,
    });
  } catch (error) {
    console.error("Erro ao buscar membros:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
