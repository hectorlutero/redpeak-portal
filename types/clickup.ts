// ============================================
// Tipos da API do ClickUp - RedPeak Dashboard
// ============================================

// Status Categories
export type StatusCategory = "inactive" | "active" | "done" | "closed";

export const STATUS_CATEGORIES: Record<StatusCategory, string[]> = {
  inactive: ["backlog", "diagnóstico", "falta de requisitos", "para fazer"],
  active: ["em desenvolvimento", "bloqueio"],
  done: ["homologação"],
  closed: ["concluído"],
} as const;

export const STATUS_CATEGORY_LABELS: Record<StatusCategory, string> = {
  inactive: "Inativas",
  active: "Ativas",
  done: "Feitas",
  closed: "Fechadas",
} as const;

export const STATUS_CATEGORY_COLORS: Record<StatusCategory, string> = {
  inactive: "#6366f1", // Indigo vibrante
  active: "#06b6d4", // Cyan vibrante
  done: "#f59e0b", // Amber vibrante
  closed: "#22c55e", // Green vibrante
} as const;

// ============================================
// Critério de Período (Date Criteria)
// ============================================

export type DateCriteria = "created" | "closed" | "updated";

export const DATE_CRITERIA_LABELS: Record<DateCriteria, string> = {
  created: "Entrada",
  closed: "Concluídas",
  updated: "Trabalhadas",
} as const;

export const DATE_CRITERIA_DESCRIPTIONS: Record<DateCriteria, string> = {
  created: "Tarefas criadas no período selecionado",
  closed: "Tarefas finalizadas no período selecionado",
  updated: "Tarefas atualizadas no período selecionado",
} as const;

export const DATE_CRITERIA_CHART_LABELS: Record<DateCriteria, string> = {
  created: "Criadas",
  closed: "Concluídas",
  updated: "Trabalhadas",
} as const;

// ============================================
// Tipos de resposta da API ClickUp
// ============================================

export interface ClickUpStatus {
  status: string;
  type: "open" | "custom" | "closed";
  orderindex: number;
  color: string;
}

export interface ClickUpPriority {
  id: string;
  priority: "urgent" | "high" | "normal" | "low";
  color: string;
}

export interface ClickUpAssignee {
  id: number;
  username: string;
  email: string;
  color: string;
  profilePicture: string | null;
  initials: string;
}

export interface ClickUpTag {
  name: string;
  tag_fg: string;
  tag_bg: string;
}

export interface ClickUpTask {
  id: string;
  name: string;
  description?: string;
  status: ClickUpStatus;
  priority: ClickUpPriority | null;
  assignees: ClickUpAssignee[];
  tags: ClickUpTag[];
  date_created: string; // Unix timestamp em ms
  date_updated: string; // Unix timestamp em ms
  date_closed: string | null; // Unix timestamp em ms
  due_date: string | null; // Unix timestamp em ms
  start_date: string | null; // Unix timestamp em ms
  time_estimate: number | null; // em ms
  time_spent: number | null; // em ms
  parent: string | null; // ID da tarefa pai (se for subtask)
  url: string;
}

export interface ClickUpMember {
  id: number;
  username: string;
  email: string;
  color: string;
  profilePicture: string | null;
  initials: string;
  role: number;
}

export interface ClickUpList {
  id: string;
  name: string;
  statuses: ClickUpStatus[];
}

// ============================================
// Tipos de resposta das API Routes
// ============================================

export interface GetTasksResponse {
  tasks: ClickUpTask[];
  last_page: boolean;
}

export interface GetMembersResponse {
  members: ClickUpMember[];
}

export interface GetTagsResponse {
  tags: ClickUpTag[];
}

export interface GetListResponse {
  list: ClickUpList;
}

// ============================================
// Tipos para o Dashboard
// ============================================

export interface DashboardFilters {
  startDate: Date;
  endDate: Date;
  assigneeIds?: number[];
  tags?: string[];
  statusCategories?: StatusCategory[];
}

export interface TaskStats {
  total: number;
  byCategory: Record<StatusCategory, number>;
  byStatus: Record<string, number>;
  byAssignee: AssigneeStats[];
  byTag: TagStats[];
  completionRate: number;
}

export interface AssigneeStats {
  id: number;
  username: string;
  email: string;
  profilePicture: string | null;
  initials: string;
  color: string;
  total: number;
  byCategory: Record<StatusCategory, number>;
  completionRate: number;
}

export interface TagStats {
  name: string;
  color: string;
  total: number;
  byCategory: Record<StatusCategory, number>;
  completionRate: number;
}

export interface MonthlyEvolution {
  month: string; // formato "YYYY-MM"
  label: string; // formato "Jan/25"
  created: number;
  closed: number;
  total: number;
}

// ============================================
// Utilitários
// ============================================

/**
 * Retorna a categoria de um status
 */
export function getStatusCategory(status: string): StatusCategory {
  const normalizedStatus = status.toLowerCase().trim();

  for (const [category, statuses] of Object.entries(STATUS_CATEGORIES)) {
    if (statuses.some(s => normalizedStatus.includes(s))) {
      return category as StatusCategory;
    }
  }

  return "inactive"; // default
}

/**
 * Converte timestamp Unix (ms) para Date
 */
export function parseClickUpDate(timestamp: string | null): Date | null {
  if (!timestamp) return null;
  return new Date(parseInt(timestamp, 10));
}

/**
 * Verifica se uma tarefa está dentro do período
 */
export function isTaskInPeriod(
  task: ClickUpTask,
  startDate: Date,
  endDate: Date
): boolean {
  const createdAt = parseClickUpDate(task.date_created);
  if (!createdAt) return false;

  return createdAt >= startDate && createdAt <= endDate;
}

/**
 * Verifica se uma tarefa foi fechada no período
 */
export function isTaskClosedInPeriod(
  task: ClickUpTask,
  startDate: Date,
  endDate: Date
): boolean {
  const closedAt = parseClickUpDate(task.date_closed);
  if (!closedAt) return false;

  return closedAt >= startDate && closedAt <= endDate;
}
