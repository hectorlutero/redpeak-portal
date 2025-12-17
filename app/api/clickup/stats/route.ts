import { NextRequest, NextResponse } from "next/server";
import { getAllTasks, getListMembers, getSpaceTags } from "@/services/clickup";
import {
  getCacheMetadata,
  getMonthCache,
  getAllCachedTasks,
  cacheCurrentMonth,
} from "@/services/cache";
import {
  type ClickUpTask,
  type StatusCategory,
  type TaskStats,
  type AssigneeStats,
  type TagStats,
  type MonthlyEvolution,
  type DateCriteria,
  getStatusCategory,
  parseClickUpDate,
  STATUS_CATEGORIES,
} from "@/types/clickup";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachMonthOfInterval,
  isWithinInterval,
} from "date-fns";
import { ptBR } from "date-fns/locale";

interface StatsResponse {
  stats: TaskStats;
  evolution: MonthlyEvolution[];
  filters: {
    startDate: string;
    endDate: string;
  };
  fromCache: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse das datas do filtro (default: mês atual)
    const now = new Date();
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const forceRefresh = searchParams.get("refresh") === "true";
    const dateCriteria = (searchParams.get("dateCriteria") || "closed") as DateCriteria;

    const startDate = startDateParam
      ? new Date(startDateParam)
      : startOfMonth(now);
    const endDate = endDateParam ? new Date(endDateParam) : endOfMonth(now);

    // Tentar buscar do cache primeiro
    let tasks: ClickUpTask[];
    let fromCache = false;

    const meta = await getCacheMetadata();
    const currentMonth = format(now, "yyyy-MM");

    if (meta && !forceRefresh) {
      // Buscar tarefas do cache
      const cachedTasks = await getAllCachedTasks(
        format(startDate, "yyyy-MM"),
        format(endDate, "yyyy-MM")
      );

      if (cachedTasks.length > 0) {
        tasks = cachedTasks;
        fromCache = true;
      } else {
        // Cache vazio, buscar da API e cachear
        tasks = await getAllTasks();
        await cacheCurrentMonth(tasks, true);
      }
    } else {
      // Sem cache ou refresh forçado, buscar da API
      tasks = await getAllTasks();

      // Cachear mês atual
      await cacheCurrentMonth(tasks, forceRefresh);
      fromCache = false;
    }

    // Buscar members e tags (sempre da API, são leves)
    const [members, tags] = await Promise.all([
      getListMembers(),
      getSpaceTags(),
    ]);

    // Calcular estatísticas
    const stats = calculateStats(tasks, members, tags, startDate, endDate, dateCriteria);

    // Calcular evolução mensal (últimos 12 meses ou período selecionado)
    const evolution = calculateEvolution(tasks, startDate, endDate, dateCriteria);

    const response: StatsResponse = {
      stats,
      evolution,
      filters: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      fromCache,
    };

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error("Erro ao calcular estatísticas:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

function calculateStats(
  tasks: ClickUpTask[],
  members: {
    id: number;
    username: string;
    email: string;
    color: string;
    profilePicture: string | null;
    initials: string;
  }[],
  tags: { name: string; tag_bg: string }[],
  startDate: Date,
  endDate: Date,
  dateCriteria: DateCriteria
): TaskStats {
  // Inicializar contadores por categoria
  const byCategory: Record<StatusCategory, number> = {
    inactive: 0,
    active: 0,
    done: 0,
    closed: 0,
  };

  const byStatus: Record<string, number> = {};
  const assigneeMap = new Map<number, AssigneeStats>();
  const tagMap = new Map<string, TagStats>();

  // Inicializar mapa de membros
  members.forEach(member => {
    assigneeMap.set(member.id, {
      id: member.id,
      username: member.username,
      email: member.email,
      profilePicture: member.profilePicture,
      initials: member.initials,
      color: member.color,
      total: 0,
      byCategory: { inactive: 0, active: 0, done: 0, closed: 0 },
      completionRate: 0,
    });
  });

  // Inicializar mapa de tags
  tags.forEach(tag => {
    tagMap.set(tag.name.toLowerCase(), {
      name: tag.name,
      color: tag.tag_bg,
      total: 0,
      byCategory: { inactive: 0, active: 0, done: 0, closed: 0 },
      completionRate: 0,
    });
  });

  // Filtrar tarefas pelo período (baseado no critério selecionado)
  const filteredTasks = tasks.filter(task => {
    let dateToCheck: Date | null = null;
    
    switch (dateCriteria) {
      case "created":
        dateToCheck = parseClickUpDate(task.date_created);
        break;
      case "closed":
        dateToCheck = parseClickUpDate(task.date_closed);
        if (!dateToCheck) return false; // Excluir tarefas não fechadas
        break;
      case "updated":
      default:
        dateToCheck = parseClickUpDate(task.date_updated);
        break;
    }
    
    if (!dateToCheck) return false;
    return isWithinInterval(dateToCheck, { start: startDate, end: endDate });
  });

  // Processar cada tarefa
  filteredTasks.forEach(task => {
    const statusName = task.status.status.toLowerCase();
    const category = getStatusCategory(statusName);

    // Contar por categoria
    byCategory[category]++;

    // Contar por status
    byStatus[statusName] = (byStatus[statusName] || 0) + 1;

    // Contar por responsável
    task.assignees.forEach(assignee => {
      let assigneeStats = assigneeMap.get(assignee.id);

      // Se o assignee não está na lista de membros, criar entrada
      if (!assigneeStats) {
        assigneeStats = {
          id: assignee.id,
          username: assignee.username,
          email: assignee.email,
          profilePicture: assignee.profilePicture,
          initials: assignee.initials,
          color: assignee.color,
          total: 0,
          byCategory: { inactive: 0, active: 0, done: 0, closed: 0 },
          completionRate: 0,
        };
        assigneeMap.set(assignee.id, assigneeStats);
      }

      assigneeStats.total++;
      assigneeStats.byCategory[category]++;
    });

    // Contar por tag
    task.tags.forEach(tag => {
      const tagKey = tag.name.toLowerCase();
      let tagStats = tagMap.get(tagKey);

      // Se a tag não está na lista, criar entrada
      if (!tagStats) {
        tagStats = {
          name: tag.name,
          color: tag.tag_bg,
          total: 0,
          byCategory: { inactive: 0, active: 0, done: 0, closed: 0 },
          completionRate: 0,
        };
        tagMap.set(tagKey, tagStats);
      }

      tagStats.total++;
      tagStats.byCategory[category]++;
    });
  });

  // Calcular taxa de conclusão por assignee
  assigneeMap.forEach(stats => {
    if (stats.total > 0) {
      stats.completionRate = (stats.byCategory.closed / stats.total) * 100;
    }
  });

  // Calcular taxa de conclusão por tag
  tagMap.forEach(stats => {
    if (stats.total > 0) {
      stats.completionRate = (stats.byCategory.closed / stats.total) * 100;
    }
  });

  // Calcular taxa de conclusão geral
  const total = filteredTasks.length;
  const completionRate = total > 0 ? (byCategory.closed / total) * 100 : 0;

  // Filtrar apenas assignees e tags com tarefas
  const byAssignee = Array.from(assigneeMap.values())
    .filter(a => a.total > 0)
    .sort((a, b) => b.total - a.total);

  const byTag = Array.from(tagMap.values())
    .filter(t => t.total > 0)
    .sort((a, b) => b.total - a.total);

  return {
    total,
    byCategory,
    byStatus,
    byAssignee,
    byTag,
    completionRate,
  };
}

function calculateEvolution(
  tasks: ClickUpTask[],
  startDate: Date,
  endDate: Date,
  dateCriteria: DateCriteria
): MonthlyEvolution[] {
  // Gerar array de meses no intervalo
  const months = eachMonthOfInterval({ start: startDate, end: endDate });

  return months.map(monthStart => {
    const monthEnd = endOfMonth(monthStart);
    const monthKey = format(monthStart, "yyyy-MM");
    const monthLabel = format(monthStart, "MMM/yy", { locale: ptBR });

    // Tarefas criadas no mês
    const created = tasks.filter(task => {
      const createdAt = parseClickUpDate(task.date_created);
      if (!createdAt) return false;
      return isWithinInterval(createdAt, { start: monthStart, end: monthEnd });
    }).length;

    // Tarefas fechadas no mês
    const closed = tasks.filter(task => {
      const closedAt = parseClickUpDate(task.date_closed);
      if (!closedAt) return false;
      return isWithinInterval(closedAt, { start: monthStart, end: monthEnd });
    }).length;

    // Total acumulado até o final do mês (criadas - fechadas)
    const totalCreatedUntilMonth = tasks.filter(task => {
      const createdAt = parseClickUpDate(task.date_created);
      if (!createdAt) return false;
      return createdAt <= monthEnd;
    }).length;

    const totalClosedUntilMonth = tasks.filter(task => {
      const closedAt = parseClickUpDate(task.date_closed);
      if (!closedAt) return false;
      return closedAt <= monthEnd;
    }).length;

    const total = totalCreatedUntilMonth - totalClosedUntilMonth;

    return {
      month: monthKey,
      label: monthLabel,
      created,
      closed,
      total: Math.max(0, total), // Evitar números negativos
    };
  });
}
