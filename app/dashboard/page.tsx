'use client';

import { useState, useEffect, useCallback } from 'react';
import { startOfMonth, endOfMonth } from 'date-fns';
import { DateRange } from 'react-day-picker';

import { DateRangePicker } from '@/components/dashboard/date-range-picker';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { StatusChart } from '@/components/dashboard/status-chart';
import { EvolutionChart } from '@/components/dashboard/evolution-chart';
import { AssigneeRanking } from '@/components/dashboard/assignee-ranking';
import { ExportButtons } from '@/components/dashboard/export-buttons';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
      Select,
      SelectContent,
      SelectItem,
      SelectTrigger,
      SelectValue,
} from '@/components/ui/select';
import { useDateCriteria } from '@/hooks/use-date-criteria';
import {
      type TaskStats,
      type MonthlyEvolution,
      type StatusCategory,
      DATE_CRITERIA_LABELS,
      DATE_CRITERIA_DESCRIPTIONS,
      DateCriteria,
} from '@/types/clickup';

interface DashboardData {
      stats: TaskStats;
      evolution: MonthlyEvolution[];
      filters: {
            startDate: string;
            endDate: string;
      };
}

export default function DashboardPage() {
      const { dateCriteria, setDateCriteria, isHydrated } = useDateCriteria();
      const [isLoading, setIsLoading] = useState(true);
      const [error, setError] = useState<string | null>(null);
      const [data, setData] = useState<DashboardData | null>(null);
      const [dateRange, setDateRange] = useState<DateRange | undefined>({
            from: startOfMonth(new Date()),
            to: endOfMonth(new Date()),
      });

      const fetchData = useCallback(async () => {
            if (!dateRange?.from || !dateRange?.to) return;

            setIsLoading(true);
            setError(null);

            try {
                  const params = new URLSearchParams({
                        startDate: dateRange.from.toISOString(),
                        endDate: dateRange.to.toISOString(),
                        dateCriteria: dateCriteria,
                  });

                  const response = await fetch(`/api/clickup/stats?${params}`);
                  const result = await response.json();

                  if (!result.success) {
                        throw new Error(result.error || 'Erro ao carregar dados');
                  }

                  setData(result.data);
            } catch (err) {
                  setError(err instanceof Error ? err.message : 'Erro desconhecido');
            } finally {
                  setIsLoading(false);
            }
      }, [dateRange, dateCriteria]);

      useEffect(() => {
            fetchData();
      }, [fetchData]);

      const emptyByCategory: Record<StatusCategory, number> = {
            inactive: 0,
            active: 0,
            done: 0,
            closed: 0,
      };

      return (
            <div className="space-y-6">
                  {/* Header com filtro de data e exportação */}
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                              <h2 className="text-2xl font-bold tracking-tight">Visão Geral</h2>
                              <p className="text-muted-foreground">
                                    Métricas de produtividade do time RedPeak
                              </p>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                              <DateRangePicker
                                    dateRange={dateRange}
                                    onDateRangeChange={setDateRange}
                              />
                              <Select value={dateCriteria} onValueChange={(v) => setDateCriteria(v as DateCriteria)}>
                                    <SelectTrigger className="w-[150px]">
                                          <SelectValue placeholder="Critério" />
                                    </SelectTrigger>
                                    <SelectContent>
                                          <SelectItem value="created">{DATE_CRITERIA_LABELS.created}</SelectItem>
                                          <SelectItem value="closed">{DATE_CRITERIA_LABELS.closed}</SelectItem>
                                          <SelectItem value="updated">{DATE_CRITERIA_LABELS.updated}</SelectItem>
                                    </SelectContent>
                              </Select>
                              {dateRange?.from && dateRange?.to && (
                                    <ExportButtons
                                          data={data}
                                          dateRange={{ from: dateRange.from, to: dateRange.to }}
                                          chartsContainerId="charts-container"
                                    />
                              )}
                        </div>
                  </div>

                  {/* Alert informativo sobre o critério */}
                  {isHydrated && (
                        <Alert>
                              <AlertDescription>
                                    <span className="font-medium">Critério: {DATE_CRITERIA_LABELS[dateCriteria]}</span>
                                    {' — '}
                                    {DATE_CRITERIA_DESCRIPTIONS[dateCriteria]}
                              </AlertDescription>
                        </Alert>
                  )}

                  {/* Mensagem de erro */}
                  {error && (
                        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
                              <p className="font-medium">Erro ao carregar dados</p>
                              <p className="text-sm">{error}</p>
                              <p className="text-sm mt-2">
                                    Verifique se as variáveis de ambiente estão configuradas corretamente no arquivo .env.local
                              </p>
                        </div>
                  )}

                  {/* Cards de KPIs */}
                  <StatsCards
                        total={data?.stats.total ?? 0}
                        completionRate={data?.stats.completionRate ?? 0}
                        active={data?.stats.byCategory.active ?? 0}
                        inactive={data?.stats.byCategory.inactive ?? 0}
                        isLoading={isLoading}
                  />

                  {/* Gráficos - com ID para captura no PDF */}
                  <div id="charts-container" className="grid gap-6 lg:grid-cols-2">
                        <StatusChart
                              data={data?.stats.byCategory ?? emptyByCategory}
                              isLoading={isLoading}
                        />
                        <EvolutionChart data={data?.evolution ?? []} isLoading={isLoading} />
                  </div>

                  {/* Ranking de responsáveis */}
                  <AssigneeRanking
                        data={data?.stats.byAssignee ?? []}
                        isLoading={isLoading}
                  />
            </div>
      );
}
