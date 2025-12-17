// ============================================
// Tipos do Sistema de Cache - RedPeak Dashboard
// ============================================

import { ClickUpTask } from "./clickup";

// Status de um mês no cache
export type CacheMonthStatus =
  | "not-started" // Nunca foi cacheado
  | "in-progress" // Cacheamento em andamento
  | "completed" // Cache completo (mês congelado)
  | "current" // Mês atual (pode ser atualizado)
  | "error"; // Erro no cacheamento

// Metadata de um mês cacheado
export interface CacheMonthMeta {
  month: string; // formato "YYYY-MM"
  status: CacheMonthStatus;
  taskCount: number;
  firstCachedAt: string; // ISO date
  lastUpdatedAt: string; // ISO date
  lastTaskUpdate?: string; // ISO date - última atualização de tarefa (para incremental)
  isFrozen: boolean; // true para meses passados
  error?: string; // mensagem de erro se houver
}

// Arquivo de metadata geral do cache
export interface CacheMetadata {
  version: string;
  listId: string;
  spaceId: string;
  createdAt: string;
  lastBuildAt?: string;
  currentMonth: string; // formato "YYYY-MM"
  months: Record<string, CacheMonthMeta>;
  buildProgress?: {
    isRunning: boolean;
    currentMonth?: string;
    totalMonths: number;
    completedMonths: number;
    startedAt?: string;
    errors: string[];
  };
}

// Arquivo de cache mensal (tarefas brutas)
export interface CacheMonthData {
  month: string; // formato "YYYY-MM"
  tasks: ClickUpTask[];
  metadata: CacheMonthMeta;
}

// Response do status do cache
export interface CacheStatusResponse {
  isInitialized: boolean;
  currentMonth: string;
  months: CacheMonthMeta[];
  buildProgress?: CacheMetadata["buildProgress"];
  stats: {
    totalMonths: number;
    cachedMonths: number;
    totalTasks: number;
    lastUpdated?: string;
  };
}

// Response do refresh
export interface CacheRefreshResponse {
  success: boolean;
  month: string;
  previousCount: number;
  newCount: number;
  addedTasks: number;
  updatedTasks: number;
  lastUpdatedAt: string;
}

// Response do build
export interface CacheBuildResponse {
  success: boolean;
  message: string;
  progress?: CacheMetadata["buildProgress"];
}
