'use client';

import { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { Users, FileDown, Loader2 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
      Select,
      SelectContent,
      SelectItem,
      SelectTrigger,
      SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FiltersBar } from '@/components/dashboard/filters-bar';
import { TaskTable } from '@/components/dashboard/task-table';
import { ComparisonChart } from '@/components/dashboard/comparison-chart';
import { useCachedData, CacheFilters } from '@/hooks/use-cached-data';
import { useDateCriteria } from '@/hooks/use-date-criteria';
import { ClickUpTask, StatusCategory, STATUS_CATEGORY_LABELS, STATUS_CATEGORY_COLORS, DATE_CRITERIA_LABELS, DATE_CRITERIA_DESCRIPTIONS, DATE_CRITERIA_CHART_LABELS } from '@/types/clickup';
import { cn } from '@/lib/utils';

interface AssigneeStats {
      id: number;
      username: string;
      initials: string;
      color: string;
      totalTasks: number;
      closedTasks: number;
      activeTasks: number;
      inactiveTasks: number;
      doneTasks: number;
      completionRate: number;
      avgTasksPerMonth: number;
}

export default function ResponsaveisPage() {
      const { dateCriteria, setDateCriteria, isHydrated } = useDateCriteria();
      const [dateRange, setDateRange] = useState<DateRange | undefined>({
            from: startOfMonth(subMonths(new Date(), 5)),
            to: endOfMonth(new Date()),
      });
      const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<number[]>([]);
      const [selectedTags, setSelectedTags] = useState<string[]>([]);
      const [selectedCategories, setSelectedCategories] = useState<StatusCategory[]>([]);
      const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
      const [search, setSearch] = useState('');
      const [selectedAssigneeForDetail, setSelectedAssigneeForDetail] = useState<number | null>(null);
      const [comparisonSelected, setComparisonSelected] = useState<string[]>([]);
      const [comparisonMetric, setComparisonMetric] = useState<'total' | 'closed' | 'completionRate'>('closed');
      const [isExporting, setIsExporting] = useState(false);

      const filters: CacheFilters = useMemo(() => ({
            assigneeIds: selectedAssigneeIds.length > 0 ? selectedAssigneeIds : undefined,
            tags: selectedTags.length > 0 ? selectedTags : undefined,
            categories: selectedCategories.length > 0 ? selectedCategories : undefined,
            priorities: selectedPriorities.length > 0 ? selectedPriorities : undefined,
            search: search || undefined,
            dateCriteria: dateCriteria,
            dateRange: dateRange?.from && dateRange?.to ? {
                  from: dateRange.from.toISOString(),
                  to: dateRange.to.toISOString(),
            } : undefined,
      }), [selectedAssigneeIds, selectedTags, selectedCategories, selectedPriorities, search, dateCriteria, dateRange]);

      const { tasks, members, tags, isLoading, error, refetch } = useCachedData(filters);

      // Calcular estatísticas por responsável
      const assigneeStats: AssigneeStats[] = useMemo(() => {
            const stats: Record<number, AssigneeStats> = {};

            // Inicializar todos os membros
            members.forEach(member => {
                  stats[member.id] = {
                        id: member.id,
                        username: member.username,
                        initials: member.initials || member.username.substring(0, 2).toUpperCase(),
                        color: member.color || '#666',
                        totalTasks: 0,
                        closedTasks: 0,
                        activeTasks: 0,
                        inactiveTasks: 0,
                        doneTasks: 0,
                        completionRate: 0,
                        avgTasksPerMonth: 0,
                  };
            });

            // Contar tarefas
            tasks.forEach(task => {
                  if (task.assignees && task.assignees.length > 0) {
                        task.assignees.forEach(assignee => {
                              if (!stats[assignee.id]) {
                                    stats[assignee.id] = {
                                          id: assignee.id,
                                          username: assignee.username || `User ${assignee.id}`,
                                          initials: assignee.initials || 'U',
                                          color: assignee.color || '#666',
                                          totalTasks: 0,
                                          closedTasks: 0,
                                          activeTasks: 0,
                                          inactiveTasks: 0,
                                          doneTasks: 0,
                                          completionRate: 0,
                                          avgTasksPerMonth: 0,
                                    };
                              }

                              stats[assignee.id].totalTasks++;

                              switch (task.category) {
                                    case 'closed':
                                          stats[assignee.id].closedTasks++;
                                          break;
                                    case 'active':
                                          stats[assignee.id].activeTasks++;
                                          break;
                                    case 'inactive':
                                          stats[assignee.id].inactiveTasks++;
                                          break;
                                    case 'done':
                                          stats[assignee.id].doneTasks++;
                                          break;
                              }
                        });
                  }
            });

            // Calcular taxas
            const monthCount = dateRange?.from && dateRange?.to
                  ? Math.max(1, Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24 * 30)))
                  : 1;

            return Object.values(stats)
                  .map(s => ({
                        ...s,
                        completionRate: s.totalTasks > 0 ? (s.closedTasks / s.totalTasks) * 100 : 0,
                        avgTasksPerMonth: s.totalTasks / monthCount,
                  }))
                  .filter(s => s.totalTasks > 0)
                  .sort((a, b) => b.closedTasks - a.closedTasks);
      }, [tasks, members, dateRange]);

      // Dados para o gráfico de comparação
      const comparisonData = useMemo(() => {
            // Agrupar tarefas por mês e responsável
            const dataByAssignee: Record<string, Record<string, { total: number; closed: number }>> = {};

            tasks.forEach(task => {
                  if (!task.assignees || task.assignees.length === 0) return;

                  const taskDate = new Date(parseInt(task.date_created));
                  const monthKey = format(taskDate, 'yyyy-MM');

                  task.assignees.forEach(assignee => {
                        const assigneeName = assignee.username || `User ${assignee.id}`;

                        if (!dataByAssignee[assigneeName]) {
                              dataByAssignee[assigneeName] = {};
                        }
                        if (!dataByAssignee[assigneeName][monthKey]) {
                              dataByAssignee[assigneeName][monthKey] = { total: 0, closed: 0 };
                        }

                        dataByAssignee[assigneeName][monthKey].total++;
                        if (task.category === 'closed') {
                              dataByAssignee[assigneeName][monthKey].closed++;
                        }
                  });
            });

            return assigneeStats.map(assignee => ({
                  name: assignee.username,
                  color: assignee.color,
                  data: Object.entries(dataByAssignee[assignee.username] || {})
                        .map(([month, data]) => ({
                              month: format(parseISO(`${month}-01`), 'MMM/yy', { locale: ptBR }),
                              total: data.total,
                              closed: data.closed,
                              completionRate: data.total > 0 ? (data.closed / data.total) * 100 : 0,
                        }))
                        .sort((a, b) => a.month.localeCompare(b.month)),
            }));
      }, [tasks, assigneeStats]);

      // Tarefas do responsável selecionado
      const selectedAssigneeTasks = useMemo(() => {
            if (!selectedAssigneeForDetail) return [];
            return tasks.filter(task =>
                  task.assignees?.some(a => a.id === selectedAssigneeForDetail)
            );
      }, [tasks, selectedAssigneeForDetail]);

      const handleReset = () => {
            setSelectedAssigneeIds([]);
            setSelectedTags([]);
            setSelectedCategories([]);
            setSelectedPriorities([]);
            setSearch('');
      };

      const handleExport = async (format: 'excel' | 'pdf') => {
            setIsExporting(true);
            try {
                  // Implementar export
                  console.log(`Exporting to ${format}...`);
                  // TODO: Chamar API de export
            } finally {
                  setIsExporting(false);
            }
      };

      return (
            <div className="space-y-6">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                        <div>
                              <h1 className="text-3xl font-bold tracking-tight">Responsáveis</h1>
                              <p className="text-muted-foreground">
                                    Análise detalhada da produtividade por responsável
                              </p>
                        </div>
                        <div className="flex items-center gap-2">
                              <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleExport('excel')}
                                    disabled={isExporting}
                              >
                                    {isExporting ? (
                                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                          <FileDown className="mr-2 h-4 w-4" />
                                    )}
                                    Excel
                              </Button>
                              <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleExport('pdf')}
                                    disabled={isExporting}
                              >
                                    {isExporting ? (
                                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                          <FileDown className="mr-2 h-4 w-4" />
                                    )}
                                    PDF
                              </Button>
                        </div>
                  </div>

                  {/* Filtros */}
                  <FiltersBar
                        dateRange={dateRange}
                        onDateRangeChange={setDateRange}
                        dateCriteria={dateCriteria}
                        onDateCriteriaChange={setDateCriteria}
                        tags={tags}
                        selectedTags={selectedTags}
                        onTagChange={setSelectedTags}
                        showTagFilter={true}
                        selectedCategories={selectedCategories}
                        onCategoryChange={setSelectedCategories}
                        selectedPriorities={selectedPriorities}
                        onPriorityChange={setSelectedPriorities}
                        search={search}
                        onSearchChange={setSearch}
                        onReset={handleReset}
                  />

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

                  {error && (
                        <div className="bg-destructive/10 text-destructive p-4 rounded-md">
                              {error}
                        </div>
                  )}

                  <Tabs defaultValue="ranking" className="space-y-6">
                        <TabsList>
                              <TabsTrigger value="ranking">Ranking</TabsTrigger>
                              <TabsTrigger value="comparison">Comparação</TabsTrigger>
                              <TabsTrigger value="detail">Detalhes</TabsTrigger>
                        </TabsList>

                        {/* Tab: Ranking */}
                        <TabsContent value="ranking" className="space-y-4">
                              <Card>
                                    <CardHeader>
                                          <CardTitle className="flex items-center gap-2">
                                                <Users className="h-5 w-5" />
                                                Ranking de Responsáveis — Tarefas {DATE_CRITERIA_CHART_LABELS[dateCriteria]}
                                          </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                          {isLoading ? (
                                                <div className="space-y-4">
                                                      {[...Array(5)].map((_, i) => (
                                                            <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                                                      ))}
                                                </div>
                                          ) : (
                                                <div className="space-y-3">
                                                      {assigneeStats.map((assignee, index) => (
                                                            <div
                                                                  key={assignee.id}
                                                                  className={cn(
                                                                        'flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-colors',
                                                                        selectedAssigneeForDetail === assignee.id
                                                                              ? 'bg-primary/10 border-primary'
                                                                              : 'hover:bg-muted'
                                                                  )}
                                                                  onClick={() => setSelectedAssigneeForDetail(
                                                                        selectedAssigneeForDetail === assignee.id ? null : assignee.id
                                                                  )}
                                                            >
                                                                  {/* Posição */}
                                                                  <div className="w-8 text-center font-bold text-lg text-muted-foreground">
                                                                        #{index + 1}
                                                                  </div>

                                                                  {/* Avatar */}
                                                                  <div
                                                                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                                                                        style={{ backgroundColor: assignee.color }}
                                                                  >
                                                                        {assignee.initials}
                                                                  </div>

                                                                  {/* Nome e estatísticas */}
                                                                  <div className="flex-1">
                                                                        <p className="font-medium">{assignee.username}</p>
                                                                        <div className="flex gap-2 mt-1">
                                                                              <Badge variant="outline" className="text-xs">
                                                                                    Total: {assignee.totalTasks}
                                                                              </Badge>
                                                                              <Badge
                                                                                    className="text-xs text-white"
                                                                                    style={{ backgroundColor: STATUS_CATEGORY_COLORS.closed }}
                                                                              >
                                                                                    Fechadas: {assignee.closedTasks}
                                                                              </Badge>
                                                                              <Badge
                                                                                    className="text-xs text-white"
                                                                                    style={{ backgroundColor: STATUS_CATEGORY_COLORS.active }}
                                                                              >
                                                                                    Ativas: {assignee.activeTasks}
                                                                              </Badge>
                                                                        </div>
                                                                  </div>

                                                                  {/* Taxa de conclusão */}
                                                                  <div className="text-right">
                                                                        <p className="text-2xl font-bold">
                                                                              {assignee.completionRate.toFixed(0)}%
                                                                        </p>
                                                                        <p className="text-xs text-muted-foreground">
                                                                              Taxa de conclusão
                                                                        </p>
                                                                  </div>

                                                                  {/* Barra de progresso */}
                                                                  <div className="w-32">
                                                                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                                              <div
                                                                                    className="h-full bg-green-500 transition-all"
                                                                                    style={{ width: `${assignee.completionRate}%` }}
                                                                              />
                                                                        </div>
                                                                  </div>
                                                            </div>
                                                      ))}

                                                      {assigneeStats.length === 0 && (
                                                            <p className="text-center text-muted-foreground py-8">
                                                                  Nenhum responsável encontrado com os filtros selecionados.
                                                            </p>
                                                      )}
                                                </div>
                                          )}
                                    </CardContent>
                              </Card>
                        </TabsContent>

                        {/* Tab: Comparação */}
                        <TabsContent value="comparison" className="space-y-4">
                              <div className="flex items-center justify-end gap-2 mb-4">
                                    <span className="text-sm text-muted-foreground">Métrica:</span>
                                    <Select value={comparisonMetric} onValueChange={(v: any) => setComparisonMetric(v)}>
                                          <SelectTrigger className="w-[200px]">
                                                <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                                <SelectItem value="total">Total de tarefas</SelectItem>
                                                <SelectItem value="closed">Tarefas fechadas</SelectItem>
                                                <SelectItem value="completionRate">Taxa de conclusão</SelectItem>
                                          </SelectContent>
                                    </Select>
                              </div>

                              <ComparisonChart
                                    title="Evolução por Responsável"
                                    items={comparisonData}
                                    selectedItems={comparisonSelected}
                                    onSelectionChange={setComparisonSelected}
                                    metric={comparisonMetric}
                                    isLoading={isLoading}
                              />
                        </TabsContent>

                        {/* Tab: Detalhes */}
                        <TabsContent value="detail" className="space-y-4">
                              {/* Seletor de responsável */}
                              <div className="flex items-center gap-4">
                                    <span className="text-sm text-muted-foreground">Responsável:</span>
                                    <Select
                                          value={selectedAssigneeForDetail?.toString() || ''}
                                          onValueChange={(v) => setSelectedAssigneeForDetail(v ? parseInt(v) : null)}
                                    >
                                          <SelectTrigger className="w-[250px]">
                                                <SelectValue placeholder="Selecione um responsável" />
                                          </SelectTrigger>
                                          <SelectContent>
                                                {assigneeStats.map((assignee) => (
                                                      <SelectItem key={assignee.id} value={assignee.id.toString()}>
                                                            <div className="flex items-center gap-2">
                                                                  <span
                                                                        className="w-4 h-4 rounded-full"
                                                                        style={{ backgroundColor: assignee.color }}
                                                                  />
                                                                  {assignee.username}
                                                            </div>
                                                      </SelectItem>
                                                ))}
                                          </SelectContent>
                                    </Select>
                              </div>

                              {selectedAssigneeForDetail ? (
                                    <>
                                          {/* Stats do responsável selecionado */}
                                          <div className="grid grid-cols-4 gap-4">
                                                {(() => {
                                                      const stats = assigneeStats.find(a => a.id === selectedAssigneeForDetail);
                                                      if (!stats) return null;

                                                      return (
                                                            <>
                                                                  <Card>
                                                                        <CardContent className="p-4">
                                                                              <p className="text-sm text-muted-foreground">Total</p>
                                                                              <p className="text-2xl font-bold">{stats.totalTasks}</p>
                                                                        </CardContent>
                                                                  </Card>
                                                                  <Card>
                                                                        <CardContent className="p-4">
                                                                              <p className="text-sm text-muted-foreground">Fechadas</p>
                                                                              <p className="text-2xl font-bold text-green-500">{stats.closedTasks}</p>
                                                                        </CardContent>
                                                                  </Card>
                                                                  <Card>
                                                                        <CardContent className="p-4">
                                                                              <p className="text-sm text-muted-foreground">Ativas</p>
                                                                              <p className="text-2xl font-bold text-blue-500">{stats.activeTasks}</p>
                                                                        </CardContent>
                                                                  </Card>
                                                                  <Card>
                                                                        <CardContent className="p-4">
                                                                              <p className="text-sm text-muted-foreground">Taxa de Conclusão</p>
                                                                              <p className="text-2xl font-bold">{stats.completionRate.toFixed(1)}%</p>
                                                                        </CardContent>
                                                                  </Card>
                                                            </>
                                                      );
                                                })()}
                                          </div>

                                          {/* Tabela de tarefas */}
                                          <TaskTable
                                                tasks={selectedAssigneeTasks}
                                                showAssignee={false}
                                                isLoading={isLoading}
                                          />
                                    </>
                              ) : (
                                    <div className="text-center py-12 text-muted-foreground">
                                          Selecione um responsável para ver os detalhes.
                                    </div>
                              )}
                        </TabsContent>
                  </Tabs>
            </div>
      );
}
