import { NextResponse } from "next/server";
import { getAllTasks } from "@/services/clickup";

export async function GET() {
  try {
    const tasks = await getAllTasks();

    return NextResponse.json({
      success: true,
      data: tasks,
      count: tasks.length,
    });
  } catch (error) {
    console.error("Erro ao buscar tarefas:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
