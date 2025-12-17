"use client";

import { useState, useEffect, useCallback } from "react";
import { DateCriteria } from "@/types/clickup";

const STORAGE_KEY = "redpeak-date-criteria";
const DEFAULT_CRITERIA: DateCriteria = "closed";

/**
 * Hook para gerenciar o critério de período com persistência em localStorage
 * e sincronização entre abas/páginas
 */
export function useDateCriteria() {
  const [dateCriteria, setDateCriteriaState] =
    useState<DateCriteria>(DEFAULT_CRITERIA);
  const [isHydrated, setIsHydrated] = useState(false);

  // Carregar valor inicial do localStorage após hidratação
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && ["created", "closed", "updated"].includes(stored)) {
      setDateCriteriaState(stored as DateCriteria);
    }
    setIsHydrated(true);
  }, []);

  // Escutar mudanças de storage de outras abas
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        if (["created", "closed", "updated"].includes(e.newValue)) {
          setDateCriteriaState(e.newValue as DateCriteria);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Função para atualizar o critério (atualiza state e localStorage)
  const setDateCriteria = useCallback((criteria: DateCriteria) => {
    setDateCriteriaState(criteria);
    localStorage.setItem(STORAGE_KEY, criteria);

    // Disparar evento de storage manualmente para outras abas na mesma janela
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: STORAGE_KEY,
        newValue: criteria,
      })
    );
  }, []);

  return {
    dateCriteria,
    setDateCriteria,
    isHydrated,
  };
}
