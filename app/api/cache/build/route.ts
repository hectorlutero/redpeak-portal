import { NextResponse } from "next/server";
import { getAllTasks } from "@/services/clickup";
import {
  getCacheMetadata,
  initializeCacheMetadata,
  getUncachedMonths,
  cacheHistoricalMonth,
  startBuildProgress,
  updateBuildProgress,
  finishBuildProgress,
  cacheCurrentMonth,
} from "@/services/cache";

// Flag global para controlar se o build está rodando
let isBuildRunning = false;

export async function POST() {
  try {
    // Verificar se já está rodando
    if (isBuildRunning) {
      const meta = await getCacheMetadata();
      return NextResponse.json({
        success: false,
        message: "Build já está em andamento",
        progress: meta?.buildProgress,
      });
    }

    // Iniciar build em background
    isBuildRunning = true;

    // Retornar resposta imediata
    const response = NextResponse.json({
      success: true,
      message: "Build iniciado em background",
    });

    // Executar build em background (não bloqueia a resposta)
    runBuildInBackground().catch(console.error);

    return response;
  } catch (error) {
    console.error("Erro ao iniciar build:", error);
    isBuildRunning = false;

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

async function runBuildInBackground() {
  try {
    // Inicializar metadata se necessário
    let meta = await getCacheMetadata();
    if (!meta) {
      meta = await initializeCacheMetadata();
    }

    // Buscar todas as tarefas da API (incluindo fechadas)
    console.log("[Cache Build] Buscando todas as tarefas...");
    const allTasks = await getAllTasks();
    console.log(`[Cache Build] ${allTasks.length} tarefas encontradas`);

    // Primeiro, cachear mês atual
    console.log("[Cache Build] Cacheando mês atual...");
    await cacheCurrentMonth(allTasks, true);

    // Pegar meses que precisam ser cacheados
    const uncachedMonths = await getUncachedMonths();
    console.log(`[Cache Build] ${uncachedMonths.length} meses para cachear`);

    if (uncachedMonths.length === 0) {
      console.log("[Cache Build] Todos os meses já estão cacheados");
      isBuildRunning = false;
      return;
    }

    // Iniciar progresso
    await startBuildProgress(uncachedMonths.length);

    // Processar cada mês
    for (let i = 0; i < uncachedMonths.length; i++) {
      const month = uncachedMonths[i];
      console.log(
        `[Cache Build] Processando ${month} (${i + 1}/${
          uncachedMonths.length
        })...`
      );

      try {
        await cacheHistoricalMonth(month, allTasks);
        await updateBuildProgress(month, i + 1);
        console.log(`[Cache Build] ${month} concluído`);
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : "Erro desconhecido";
        console.error(`[Cache Build] Erro em ${month}:`, errorMsg);
        await updateBuildProgress(month, i + 1, errorMsg);
      }

      // Pequena pausa entre meses para não sobrecarregar
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Finalizar build
    await finishBuildProgress();
    console.log("[Cache Build] Build concluído!");
  } catch (error) {
    console.error("[Cache Build] Erro no build:", error);
    await finishBuildProgress();
  } finally {
    isBuildRunning = false;
  }
}

// GET para verificar status do build
export async function GET() {
  try {
    const meta = await getCacheMetadata();

    return NextResponse.json({
      success: true,
      data: {
        isRunning: isBuildRunning,
        progress: meta?.buildProgress,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
