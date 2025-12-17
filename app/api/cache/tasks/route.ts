import { NextRequest, NextResponse } from "next/server";
import { getCacheMetadata, getMonthCache } from "@/services/cache";
import {
  type ClickUpTask,
  type DateCriteria,
  getStatusCategory,
  parseClickUpDate,
} from "@/types/clickup";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachMonthOfInterval,
  isWithinInterval,
} from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse dos filtros
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const assigneeIds =
      searchParams.get("assigneeIds")?.split(",").map(Number).filter(Boolean) ||
      [];
    const tags = searchParams.get("tags")?.split(",").filter(Boolean) || [];
    const categories =
      searchParams.get("categories")?.split(",").filter(Boolean) || [];
    const priorities =
      searchParams.get("priorities")?.split(",").filter(Boolean) || [];
    const search = searchParams.get("search")?.toLowerCase() || "";
    const dateCriteria = (searchParams.get("dateCriteria") ||
      "closed") as DateCriteria;

    const now = new Date();
    const startDate = startDateParam
      ? new Date(startDateParam)
      : startOfMonth(now);
    const endDate = endDateParam ? new Date(endDateParam) : endOfMonth(now);

    // Buscar metadata do cache
    const metadata = await getCacheMetadata();
    if (!metadata) {
      return NextResponse.json(
        {
          success: false,
          error: "Cache não inicializado",
        },
        { status: 404 }
      );
    }

    // Determinar quais meses precisamos carregar
    const monthsToLoad = eachMonthOfInterval({
      start: startDate,
      end: endDate,
    }).map(d => format(d, "yyyy-MM"));

    // Carregar tarefas dos meses necessários
    const allTasks: ClickUpTask[] = [];
    for (const month of monthsToLoad) {
      const monthCache = await getMonthCache(month);
      if (monthCache) {
        allTasks.push(...monthCache.tasks);
      }
    }

    // Remover duplicatas (tarefa pode aparecer em múltiplos meses)
    const uniqueTasks = Array.from(
      new Map(allTasks.map(t => [t.id, t])).values()
    );

    // Aplicar filtros e adicionar categoria
    let filteredTasks = uniqueTasks
      .map(task => ({
        ...task,
        category: getStatusCategory(task.status?.status || ""),
      }))
      .filter(task => {
        // Filtro de período (baseado no critério selecionado)
        let dateToCheck: Date | null = null;

        switch (dateCriteria) {
          case "created":
            dateToCheck = parseClickUpDate(task.date_created);
            break;
          case "closed":
            dateToCheck = parseClickUpDate(task.date_closed);
            // Se critério é "closed" e a tarefa não tem data de fechamento, excluir
            if (!dateToCheck) return false;
            break;
          case "updated":
          default:
            dateToCheck = parseClickUpDate(task.date_updated);
            break;
        }

        if (
          dateToCheck &&
          !isWithinInterval(dateToCheck, { start: startDate, end: endDate })
        ) {
          return false;
        }

        // Filtro de responsáveis
        if (assigneeIds.length > 0) {
          const taskAssigneeIds = task.assignees?.map(a => a.id) || [];
          if (!assigneeIds.some(id => taskAssigneeIds.includes(id))) {
            return false;
          }
        }

        // Filtro de tags/departamentos
        if (tags.length > 0) {
          const taskTags = task.tags?.map(t => t.name.toLowerCase()) || [];
          if (!tags.some(tag => taskTags.includes(tag.toLowerCase()))) {
            return false;
          }
        }

        // Filtro de categorias
        if (categories.length > 0) {
          if (!categories.includes(task.category)) {
            return false;
          }
        }

        // Filtro de prioridade
        if (priorities.length > 0) {
          const taskPriority = task.priority?.priority || "none";
          if (!priorities.includes(taskPriority)) {
            return false;
          }
        }

        // Filtro de busca por nome
        if (search && !task.name.toLowerCase().includes(search)) {
          return false;
        }

        return true;
      });

    // Extrair lista única de responsáveis e tags das tarefas filtradas
    const assigneesMap = new Map<
      number,
      {
        id: number;
        username: string;
        email: string;
        color: string;
        profilePicture: string | null;
        initials: string;
      }
    >();
    const tagsMap = new Map<string, { name: string; tag_bg: string }>();

    filteredTasks.forEach(task => {
      (task.assignees || []).forEach(a => {
        if (!assigneesMap.has(a.id)) {
          assigneesMap.set(a.id, {
            id: a.id,
            username: a.username,
            email: a.email || "",
            color: a.color || "#666",
            profilePicture: a.profilePicture || null,
            initials:
              a.initials || a.username?.substring(0, 2).toUpperCase() || "U",
          });
        }
      });
      (task.tags || []).forEach(t => {
        const key = t.name.toLowerCase();
        if (!tagsMap.has(key)) {
          tagsMap.set(key, { name: t.name, tag_bg: t.tag_bg || "#666" });
        }
      });
    });

    return NextResponse.json({
      success: true,
      data: {
        tasks: filteredTasks,
        totalCount: filteredTasks.length,
        members: Array.from(assigneesMap.values()),
        tags: Array.from(tagsMap.values()),
        filters: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          assigneeIds,
          tags,
          categories,
          priorities,
          search,
        },
      },
    });
  } catch (error) {
    console.error("Erro ao buscar tarefas do cache:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
