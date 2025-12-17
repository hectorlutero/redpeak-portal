// ============================================
// Serviço de integração com ClickUp API
// ============================================

import type {
  ClickUpTask,
  ClickUpMember,
  ClickUpTag,
  ClickUpList,
  GetTasksResponse,
  GetMembersResponse,
  GetTagsResponse,
  GetListResponse,
} from "@/types/clickup";

const CLICKUP_API_BASE = "https://api.clickup.com/api/v2";

/**
 * Headers padrão para requisições à API do ClickUp
 */
function getHeaders(): HeadersInit {
  const apiKey = process.env.CLICKUP_API_KEY;

  if (!apiKey) {
    throw new Error("CLICKUP_API_KEY não configurada");
  }

  return {
    Authorization: apiKey,
    "Content-Type": "application/json",
  };
}

/**
 * Busca todas as tarefas de uma lista (com paginação)
 */
export async function getAllTasks(
  listId?: string,
  includeClosed: boolean = true,
  includeSubtasks: boolean = true
): Promise<ClickUpTask[]> {
  const id = listId || process.env.CLICKUP_LIST_ID;

  if (!id) {
    throw new Error("CLICKUP_LIST_ID não configurada");
  }

  const allTasks: ClickUpTask[] = [];
  let page = 0;
  let hasMorePages = true;

  while (hasMorePages) {
    const params = new URLSearchParams({
      page: page.toString(),
      include_closed: includeClosed.toString(),
      subtasks: includeSubtasks.toString(),
    });

    const response = await fetch(
      `${CLICKUP_API_BASE}/list/${id}/task?${params}`,
      {
        method: "GET",
        headers: getHeaders(),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erro ao buscar tarefas: ${response.status} - ${error}`);
    }

    const data: GetTasksResponse = await response.json();
    allTasks.push(...data.tasks);

    hasMorePages = !data.last_page;
    page++;

    // Segurança: limitar a 10 páginas (1000 tasks)
    if (page >= 10) {
      console.warn("Limite de paginação atingido (1000 tasks)");
      break;
    }
  }

  return allTasks;
}

/**
 * Busca membros de uma lista
 */
export async function getListMembers(
  listId?: string
): Promise<ClickUpMember[]> {
  const id = listId || process.env.CLICKUP_LIST_ID;

  if (!id) {
    throw new Error("CLICKUP_LIST_ID não configurada");
  }

  const response = await fetch(`${CLICKUP_API_BASE}/list/${id}/member`, {
    method: "GET",
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao buscar membros: ${response.status} - ${error}`);
  }

  const data: GetMembersResponse = await response.json();
  return data.members;
}

/**
 * Busca tags de um Space
 */
export async function getSpaceTags(spaceId?: string): Promise<ClickUpTag[]> {
  const id = spaceId || process.env.CLICKUP_SPACE_ID;

  if (!id) {
    throw new Error("CLICKUP_SPACE_ID não configurada");
  }

  const response = await fetch(`${CLICKUP_API_BASE}/space/${id}/tag`, {
    method: "GET",
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao buscar tags: ${response.status} - ${error}`);
  }

  const data: GetTagsResponse = await response.json();
  return data.tags;
}

/**
 * Busca informações de uma lista (incluindo statuses)
 */
export async function getListInfo(listId?: string): Promise<ClickUpList> {
  const id = listId || process.env.CLICKUP_LIST_ID;

  if (!id) {
    throw new Error("CLICKUP_LIST_ID não configurada");
  }

  const response = await fetch(`${CLICKUP_API_BASE}/list/${id}`, {
    method: "GET",
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `Erro ao buscar informações da lista: ${response.status} - ${error}`
    );
  }

  const data: GetListResponse = await response.json();
  return data.list;
}
