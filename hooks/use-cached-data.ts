"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { ClickUpTask, StatusCategory, DateCriteria } from "@/types/clickup";

export interface CacheFilters {
  assigneeIds?: number[];
  tags?: string[];
  categories?: StatusCategory[];
  priorities?: string[];
  search?: string;
  dateCriteria?: DateCriteria;
  dateRange?: {
    from: string;
    to: string;
  };
}

interface MemberData {
  id: number;
  username: string;
  email?: string;
  color: string;
  profilePicture?: string | null;
  initials: string;
}

interface TagData {
  name: string;
  tag_bg: string;
}

interface CachedDataState {
  tasks: ClickUpTask[];
  members: MemberData[];
  tags: TagData[];
  isLoading: boolean;
  error: string | null;
}

export function useCachedData(filters: CacheFilters) {
  const [state, setState] = useState<CachedDataState>({
    tasks: [],
    members: [],
    tags: [],
    isLoading: true,
    error: null,
  });

  // Memoize filter string to prevent unnecessary refetches
  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const params = new URLSearchParams();

      if (filters.dateRange?.from) {
        params.set("startDate", filters.dateRange.from);
      }
      if (filters.dateRange?.to) {
        params.set("endDate", filters.dateRange.to);
      }
      if (filters.assigneeIds && filters.assigneeIds.length > 0) {
        params.set("assigneeIds", filters.assigneeIds.join(","));
      }
      if (filters.tags && filters.tags.length > 0) {
        params.set("tags", filters.tags.join(","));
      }
      if (filters.categories && filters.categories.length > 0) {
        params.set("categories", filters.categories.join(","));
      }
      if (filters.priorities && filters.priorities.length > 0) {
        params.set("priorities", filters.priorities.join(","));
      }
      if (filters.search) {
        params.set("search", filters.search);
      }
      if (filters.dateCriteria) {
        params.set("dateCriteria", filters.dateCriteria);
      }

      const url = `/api/cache/tasks?${params}`;
      const response = await fetch(url);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Erro ao carregar dados");
      }

      setState({
        tasks: result.data.tasks || [],
        members: result.data.members || [],
        tags: result.data.tags || [],
        isLoading: false,
        error: null,
      });
    } catch (err) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : "Erro desconhecido",
      }));
    }
  }, [filterKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    ...state,
    refetch: fetchData,
  };
}
