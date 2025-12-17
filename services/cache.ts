// ============================================
// Serviço de Cache - RedPeak Dashboard
// ============================================

import { promises as fs } from "fs";
import path from "path";
import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  parseISO,
  isAfter,
  isBefore,
} from "date-fns";
import {
  type CacheMetadata,
  type CacheMonthData,
  type CacheMonthMeta,
  type CacheStatusResponse,
} from "@/types/cache";
import { type ClickUpTask, parseClickUpDate } from "@/types/clickup";

const CACHE_DIR = path.join(process.cwd(), "cache");
const CACHE_VERSION = "1.0.0";
const MAX_HISTORY_MONTHS = 12;

// ============================================
// Funções de Filesystem
// ============================================

async function ensureCacheDir(): Promise<void> {
  try {
    await fs.access(CACHE_DIR);
  } catch {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  }
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  await ensureCacheDir();
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// ============================================
// Funções de Metadata
// ============================================

function getMetaPath(): string {
  return path.join(CACHE_DIR, "meta.json");
}

function getMonthPath(month: string): string {
  return path.join(CACHE_DIR, `${month}.json`);
}

export async function getCacheMetadata(): Promise<CacheMetadata | null> {
  return readJsonFile<CacheMetadata>(getMetaPath());
}

export async function saveCacheMetadata(meta: CacheMetadata): Promise<void> {
  await writeJsonFile(getMetaPath(), meta);
}

export async function initializeCacheMetadata(): Promise<CacheMetadata> {
  const currentMonth = format(new Date(), "yyyy-MM");
  const listId = process.env.CLICKUP_LIST_ID || "";
  const spaceId = process.env.CLICKUP_SPACE_ID || "";

  const meta: CacheMetadata = {
    version: CACHE_VERSION,
    listId,
    spaceId,
    createdAt: new Date().toISOString(),
    currentMonth,
    months: {},
  };

  await saveCacheMetadata(meta);
  return meta;
}

// ============================================
// Funções de Cache Mensal
// ============================================

export async function getMonthCache(
  month: string
): Promise<CacheMonthData | null> {
  return readJsonFile<CacheMonthData>(getMonthPath(month));
}

export async function saveMonthCache(
  month: string,
  data: CacheMonthData
): Promise<void> {
  await writeJsonFile(getMonthPath(month), data);
}

// Alias for saveMonthCache
export const saveMonthCacheData = saveMonthCache;

// ============================================
// Lógica de Cache do Mês Atual
// ============================================

export function filterTasksByMonth(
  tasks: ClickUpTask[],
  month: string
): ClickUpTask[] {
  const monthStart = startOfMonth(parseISO(`${month}-01`));
  const monthEnd = endOfMonth(monthStart);

  return tasks.filter(task => {
    const createdAt = parseClickUpDate(task.date_created);
    if (!createdAt) return false;

    // Tarefa pertence ao mês se foi criada nele OU está ativa nele
    const createdInMonth = createdAt >= monthStart && createdAt <= monthEnd;

    // Ou se não foi fechada antes do início do mês
    const closedAt = parseClickUpDate(task.date_closed);
    const wasOpenDuringMonth = !closedAt || closedAt >= monthStart;

    // Tarefa existia antes e ainda estava aberta no mês
    const existedBeforeAndOpen = createdAt < monthStart && wasOpenDuringMonth;

    return createdInMonth || existedBeforeAndOpen;
  });
}

export async function cacheCurrentMonth(
  tasks: ClickUpTask[],
  forceRefresh: boolean = false
): Promise<CacheMonthData> {
  const currentMonth = format(new Date(), "yyyy-MM");
  let meta = await getCacheMetadata();

  if (!meta) {
    meta = await initializeCacheMetadata();
  }

  const existingCache = await getMonthCache(currentMonth);
  const now = new Date().toISOString();

  // Filtrar tarefas do mês atual
  const monthTasks = filterTasksByMonth(tasks, currentMonth);

  // Se já existe cache e não é refresh forçado, fazer merge incremental
  let finalTasks: ClickUpTask[];
  let addedCount = 0;
  let updatedCount = 0;

  if (existingCache && !forceRefresh) {
    const existingTaskIds = new Set(existingCache.tasks.map(t => t.id));
    const newTaskIds = new Set(monthTasks.map(t => t.id));

    // Tarefas que já existiam - atualizar
    const updatedTasks = monthTasks.filter(t => existingTaskIds.has(t.id));
    updatedCount = updatedTasks.length;

    // Tarefas novas
    const newTasks = monthTasks.filter(t => !existingTaskIds.has(t.id));
    addedCount = newTasks.length;

    // Tarefas que ainda existem no cache mas não vieram na API (manter)
    const keptTasks = existingCache.tasks.filter(t => !newTaskIds.has(t.id));

    finalTasks = [...updatedTasks, ...newTasks, ...keptTasks];
  } else {
    finalTasks = monthTasks;
    addedCount = monthTasks.length;
  }

  // Encontrar a última atualização de tarefa
  const lastTaskUpdate = finalTasks.reduce((latest, task) => {
    const updated = task.date_updated;
    if (!latest || (updated && updated > latest)) {
      return updated;
    }
    return latest;
  }, "" as string);

  const monthMeta: CacheMonthMeta = {
    month: currentMonth,
    status: "current",
    taskCount: finalTasks.length,
    firstCachedAt: existingCache?.metadata.firstCachedAt || now,
    lastUpdatedAt: now,
    lastTaskUpdate: lastTaskUpdate || undefined,
    isFrozen: false,
  };

  const cacheData: CacheMonthData = {
    month: currentMonth,
    tasks: finalTasks,
    metadata: monthMeta,
  };

  await saveMonthCacheData(currentMonth, cacheData);

  // Atualizar metadata
  meta.months[currentMonth] = monthMeta;
  meta.currentMonth = currentMonth;
  await saveCacheMetadata(meta);

  return cacheData;
}

// ============================================
// Lógica de Cache Histórico (Meses Anteriores)
// ============================================

export async function cacheHistoricalMonth(
  month: string,
  tasks: ClickUpTask[]
): Promise<CacheMonthData> {
  const meta = await getCacheMetadata();
  if (!meta) {
    throw new Error("Cache não inicializado");
  }

  const now = new Date().toISOString();
  const monthTasks = filterTasksByMonth(tasks, month);

  const monthMeta: CacheMonthMeta = {
    month,
    status: "completed",
    taskCount: monthTasks.length,
    firstCachedAt: now,
    lastUpdatedAt: now,
    isFrozen: true,
  };

  const cacheData: CacheMonthData = {
    month,
    tasks: monthTasks,
    metadata: monthMeta,
  };

  await saveMonthCacheData(month, cacheData);

  // Atualizar metadata
  meta.months[month] = monthMeta;
  await saveCacheMetadata(meta);

  return cacheData;
}

export function getMonthsToCache(): string[] {
  const months: string[] = [];
  const now = new Date();

  for (let i = 1; i <= MAX_HISTORY_MONTHS; i++) {
    const monthDate = subMonths(now, i);
    months.push(format(monthDate, "yyyy-MM"));
  }

  return months;
}

export async function getUncachedMonths(): Promise<string[]> {
  const meta = await getCacheMetadata();
  const allMonths = getMonthsToCache();

  if (!meta) {
    return allMonths;
  }

  return allMonths.filter(month => {
    const monthMeta = meta.months[month];
    return (
      !monthMeta ||
      monthMeta.status === "not-started" ||
      monthMeta.status === "error"
    );
  });
}

// ============================================
// Status do Cache
// ============================================

export async function getCacheStatus(): Promise<CacheStatusResponse> {
  const meta = await getCacheMetadata();
  const currentMonth = format(new Date(), "yyyy-MM");

  if (!meta) {
    return {
      isInitialized: false,
      currentMonth,
      months: [],
      stats: {
        totalMonths: MAX_HISTORY_MONTHS + 1,
        cachedMonths: 0,
        totalTasks: 0,
      },
    };
  }

  const monthsList = Object.values(meta.months).sort((a, b) =>
    b.month.localeCompare(a.month)
  );

  const cachedMonths = monthsList.filter(
    m => m.status === "completed" || m.status === "current"
  );

  const totalTasks = cachedMonths.reduce((sum, m) => sum + m.taskCount, 0);

  const lastUpdated =
    monthsList.length > 0
      ? monthsList.reduce(
          (latest, m) =>
            !latest || m.lastUpdatedAt > latest ? m.lastUpdatedAt : latest,
          ""
        )
      : undefined;

  return {
    isInitialized: true,
    currentMonth,
    months: monthsList,
    buildProgress: meta.buildProgress,
    stats: {
      totalMonths: MAX_HISTORY_MONTHS + 1,
      cachedMonths: cachedMonths.length,
      totalTasks,
      lastUpdated,
    },
  };
}

// ============================================
// Build Progress
// ============================================

export async function startBuildProgress(totalMonths: number): Promise<void> {
  let meta = await getCacheMetadata();
  if (!meta) {
    meta = await initializeCacheMetadata();
  }

  meta.buildProgress = {
    isRunning: true,
    totalMonths,
    completedMonths: 0,
    startedAt: new Date().toISOString(),
    errors: [],
  };

  await saveCacheMetadata(meta);
}

export async function updateBuildProgress(
  currentMonth: string,
  completedMonths: number,
  error?: string
): Promise<void> {
  const meta = await getCacheMetadata();
  if (!meta || !meta.buildProgress) return;

  meta.buildProgress.currentMonth = currentMonth;
  meta.buildProgress.completedMonths = completedMonths;

  if (error) {
    meta.buildProgress.errors.push(`${currentMonth}: ${error}`);
  }

  await saveCacheMetadata(meta);
}

export async function finishBuildProgress(): Promise<void> {
  const meta = await getCacheMetadata();
  if (!meta) return;

  meta.buildProgress = {
    ...meta.buildProgress!,
    isRunning: false,
  };
  meta.lastBuildAt = new Date().toISOString();

  await saveCacheMetadata(meta);
}

// ============================================
// Aggregação de Dados do Cache
// ============================================

export async function getAllCachedTasks(
  startMonth?: string,
  endMonth?: string
): Promise<ClickUpTask[]> {
  const meta = await getCacheMetadata();
  if (!meta) return [];

  const months = Object.keys(meta.months)
    .filter(month => {
      const monthMeta = meta.months[month];
      if (monthMeta.status !== "completed" && monthMeta.status !== "current") {
        return false;
      }
      if (startMonth && month < startMonth) return false;
      if (endMonth && month > endMonth) return false;
      return true;
    })
    .sort();

  const allTasks: ClickUpTask[] = [];
  const seenIds = new Set<string>();

  for (const month of months) {
    const cache = await getMonthCache(month);
    if (cache) {
      for (const task of cache.tasks) {
        if (!seenIds.has(task.id)) {
          seenIds.add(task.id);
          allTasks.push(task);
        }
      }
    }
  }

  return allTasks;
}
