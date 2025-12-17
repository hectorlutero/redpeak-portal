import { NextResponse } from "next/server";
import { format } from "date-fns";
import { getAllTasks } from "@/services/clickup";
import {
  getCacheMetadata,
  getMonthCache,
  cacheCurrentMonth,
  initializeCacheMetadata,
} from "@/services/cache";

export async function POST() {
  try {
    const currentMonth = format(new Date(), "yyyy-MM");

    // Verificar se cache existe
    let meta = await getCacheMetadata();
    if (!meta) {
      meta = await initializeCacheMetadata();
    }

    // Buscar cache existente para verificar última atualização
    const existingCache = await getMonthCache(currentMonth);
    const lastTaskUpdate = existingCache?.metadata.lastTaskUpdate;

    // Buscar tarefas da API (todas, pois a paginação já está no serviço)
    // Idealmente, usaríamos date_updated_gt, mas vamos buscar todas e filtrar
    const tasks = await getAllTasks();

    // Se temos lastTaskUpdate, filtrar apenas tarefas atualizadas depois
    let tasksToProcess = tasks;
    if (lastTaskUpdate) {
      const lastUpdateTimestamp = new Date(parseInt(lastTaskUpdate)).getTime();
      tasksToProcess = tasks.filter(task => {
        const taskUpdated = parseInt(task.date_updated);
        return taskUpdated > lastUpdateTimestamp;
      });

      // Se não há tarefas novas, apenas atualizar timestamp
      if (tasksToProcess.length === 0) {
        return NextResponse.json({
          success: true,
          data: {
            month: currentMonth,
            previousCount: existingCache?.tasks.length || 0,
            newCount: existingCache?.tasks.length || 0,
            addedTasks: 0,
            updatedTasks: 0,
            lastUpdatedAt: new Date().toISOString(),
            message: "Nenhuma tarefa nova ou atualizada",
          },
        });
      }
    }

    // Cachear mês atual
    const previousCount = existingCache?.tasks.length || 0;
    const cacheData = await cacheCurrentMonth(tasks, false);

    return NextResponse.json({
      success: true,
      data: {
        month: currentMonth,
        previousCount,
        newCount: cacheData.tasks.length,
        addedTasks: cacheData.tasks.length - previousCount,
        updatedTasks: tasksToProcess.length,
        lastUpdatedAt: cacheData.metadata.lastUpdatedAt,
      },
    });
  } catch (error) {
    console.error("Erro ao atualizar cache:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
