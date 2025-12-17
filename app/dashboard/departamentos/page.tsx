'use client';

import { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { Tag, FileDown, Loader2, LayoutGrid, List } from 'lucide-react';

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
import {
      Table,
      TableBody,
      TableCell,
      TableHead,
      TableHeader,
      TableRow,
} from '@/components/ui/table';
import { FiltersBar } from '@/components/dashboard/filters-bar';
import { TaskTable } from '@/components/dashboard/task-table';
import { ComparisonChart } from '@/components/dashboard/comparison-chart';
import { useCachedData, CacheFilters } from '@/hooks/use-cached-data';
import { useDateCriteria } from '@/hooks/use-date-criteria';
import { ClickUpTask, StatusCategory, STATUS_CATEGORY_LABELS, STATUS_CATEGORY_COLORS, DATE_CRITERIA_LABELS, DATE_CRITERIA_DESCRIPTIONS, DATE_CRITERIA_CHART_LABELS } from '@/types/clickup';
import { cn } from '@/lib/utils';

interface DepartmentStats {
      name: string;
      color: string;
      totalTasks: number;
      closedTasks: number;
      activeTasks: number;
      inactiveTasks: number;
      doneTasks: number;
      completionRate: number;
      uniqueAssignees: number;
}

export default function DepartamentosPage() {
      const { dateCriteria, setDateCriteria, isHydrated } = useDateCriteria();
      const [dateRange, setDateRange] = useState<DateRange | undefined>({
            from: startOfMonth(subMonths(new Date(), 5)),
            to: endOfMonth(new Date()),
      });
      const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<number[]>([]);
      const [selectedCategories, setSelectedCategories] = useState<StatusCategory[]>([]);
      const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
      const [search, setSearch] = useState('');
      const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
      const [comparisonSelected, setComparisonSelected] = useState<string[]>([]);
      const [comparisonMetric, setComparisonMetric] = useState<'total' | 'closed' | 'completionRate'>('closed');
      const [isExporting, setIsExporting] = useState(false);
      const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');

      const filters: CacheFilters = useMemo(() => ({
            assigneeIds: selectedAssigneeIds.length > 0 ? selectedAssigneeIds : undefined,
            categories: selectedCategories.length > 0 ? selectedCategories : undefined,
            priorities: selectedPriorities.length > 0 ? selectedPriorities : undefined,
            search: search || undefined,
            dateCriteria: dateCriteria,
            dateRange: dateRange?.from && dateRange?.to ? {
                  from: dateRange.from.toISOString(),
                  to: dateRange.to.toISOString(),
            } : undefined,
      }), [selectedAssigneeIds, selectedCategories, selectedPriorities, search, dateCriteria, dateRange]);

      const { tasks, members, tags, isLoading, error, refetch } = useCachedData(filters);

      // Calcular estatísticas por departamento (tag)
      const departmentStats: DepartmentStats[] = useMemo(() => {
            const stats: Record<string, DepartmentStats> = {};

            // Inicializar com todas as tags
            tags.forEach(tag => {
                  stats[tag.name.toLowerCase()] = {
                        name: tag.name,
                        color: tag.tag_bg || '#666',
                        totalTasks: 0,
                        closedTasks: 0,
                        activeTasks: 0,
                        inactiveTasks: 0,
                        doneTasks: 0,
                        completionRate: 0,
                        uniqueAssignees: 0,
                  };
            });

            // Contar tarefas por departamento
            const assigneesByDept: Record<string, Set<number>> = {};

            tasks.forEach(task => {
                  if (task.tags && task.tags.length > 0) {
                        task.tags.forEach(tag => {
                              const tagKey = tag.name.toLowerCase();

                              if (!stats[tagKey]) {
                                    stats[tagKey] = {
                                          name: tag.name,
                                          color: tag.tag_bg || '#666',
                                          totalTasks: 0,
                                          closedTasks: 0,
                                          activeTasks: 0,
                                          inactiveTasks: 0,
                                          doneTasks: 0,
                                          completionRate: 0,
                                          uniqueAssignees: 0,
                                    };
                              }

                              stats[tagKey].totalTasks++;

                              switch (task.category) {
                                    case 'closed':
                                          stats[tagKey].closedTasks++;
                                          break;
                                    case 'active':
                                          stats[tagKey].activeTasks++;
                                          break;
                                    case 'inactive':
                                          stats[tagKey].inactiveTasks++;
                                          break;
                                    case 'done':
                                          stats[tagKey].doneTasks++;
                                          break;
                              }

                              // Contar responsáveis únicos
                              if (!assigneesByDept[tagKey]) {
                                    assigneesByDept[tagKey] = new Set();
                              }
                              if (task.assignees) {
                                    task.assignees.forEach(a => assigneesByDept[tagKey].add(a.id));
                              }
                        });
                  }
            });

            // Calcular taxas e responsáveis únicos
            return Object.values(stats)
                  .map(s => ({
                        ...s,
                        completionRate: s.totalTasks > 0 ? (s.closedTasks / s.totalTasks) * 100 : 0,
                        uniqueAssignees: assigneesByDept[s.name.toLowerCase()]?.size || 0,
                  }))
                  .filter(s => s.totalTasks > 0)
                  .sort((a, b) => b.totalTasks - a.totalTasks);
      }, [tasks, tags]);

      // Dados para o gráfico de comparação
      const comparisonData = useMemo(() => {
            const dataByDept: Record<string, Record<string, { total: number; closed: number }>> = {};

            tasks.forEach(task => {
                  if (!task.tags || task.tags.length === 0) return;

                  const taskDate = new Date(parseInt(task.date_created));
                  const monthKey = format(taskDate, 'yyyy-MM');

                  task.tags.forEach(tag => {
                        const deptName = tag.name;

                        if (!dataByDept[deptName]) {
                              dataByDept[deptName] = {};
                        }
                        if (!dataByDept[deptName][monthKey]) {
                              dataByDept[deptName][monthKey] = { total: 0, closed: 0 };
                        }

                        dataByDept[deptName][monthKey].total++;
                        if (task.category === 'closed') {
                              dataByDept[deptName][monthKey].closed++;
                        }
                  });
            });

            return departmentStats.map(dept => ({
                  name: dept.name,
                  color: dept.color,
                  data: Object.entries(dataByDept[dept.name] || {})
                        .map(([month, data]) => ({
                              month: format(parseISO(`${month}-01`), 'MMM/yy', { locale: ptBR }),
                              total: data.total,
                              closed: data.closed,
                              completionRate: data.total > 0 ? (data.closed / data.total) * 100 : 0,
                        }))
                        .sort((a, b) => a.month.localeCompare(b.month)),
            }));
      }, [tasks, departmentStats]);

      // Tarefas do departamento selecionado
      const selectedDepartmentTasks = useMemo(() => {
            if (!selectedDepartment) return [];
            return tasks.filter(task =>
                  task.tags?.some(t => t.name.toLowerCase() === selectedDepartment.toLowerCase())
            );
      }, [tasks, selectedDepartment]);

      const handleReset = () => {
            setSelectedAssigneeIds([]);
            setSelectedCategories([]);
            setSelectedPriorities([]);
            setSearch('');
      };

      const handleExport = async (format: 'excel' | 'pdf') => {
            setIsExporting(true);
            try {
                  console.log(`Exporting to ${format}...`);
                  // TODO: Implementar export
            } finally {
                  setIsExporting(false);
            }
      };

      return (
            <div className="space-y-6">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                        <div>
                              <h1 className="text-3xl font-bold tracking-tight">Departamentos</h1>
                              <p className="text-muted-foreground">
                                    Análise detalhada da produtividade por departamento (tags)
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
                        assignees={members}
                        selectedAssigneeIds={selectedAssigneeIds}
                        onAssigneeChange={setSelectedAssigneeIds}
                        showAssigneeFilter={true}
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

                  <Tabs defaultValue="overview" className="space-y-6">
                        <TabsList>
                              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                              <TabsTrigger value="comparison">Comparação</TabsTrigger>
                              <TabsTrigger value="detail">Detalhes</TabsTrigger>
                        </TabsList>

                        {/* Tab: Visão Geral */}
                        <TabsContent value="overview" className="space-y-4">
                              {/* Toggle de visualização */}
                              <div className="flex items-center justify-between">
                                    <p className="text-sm text-muted-foreground">
                                          {departmentStats.length} departamento{departmentStats.length !== 1 ? 's' : ''} encontrado{departmentStats.length !== 1 ? 's' : ''}
                                    </p>
                                    <div className="flex items-center gap-1 border rounded-lg p-1">
                                          <Button
                                                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                                                size="sm"
                                                onClick={() => setViewMode('cards')}
                                                className="h-8 px-3"
                                          >
                                                <LayoutGrid className="h-4 w-4 mr-1" />
                                                Cards
                                          </Button>
                                          <Button
                                                variant={viewMode === 'list' ? 'default' : 'ghost'}
                                                size="sm"
                                                onClick={() => setViewMode('list')}
                                                className="h-8 px-3"
                                          >
                                                <List className="h-4 w-4 mr-1" />
                                                Lista
                                          </Button>
                                    </div>
                              </div>

                              {isLoading ? (
                                    viewMode === 'cards' ? (
                                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {[...Array(6)].map((_, i) => (
                                                      <Card key={i}>
                                                            <CardContent className="p-6">
                                                                  <div className="h-32 bg-muted animate-pulse rounded" />
                                                            </CardContent>
                                                      </Card>
                                                ))}
                                          </div>
                                    ) : (
                                          <Card>
                                                <CardContent className="p-6">
                                                      <div className="h-64 bg-muted animate-pulse rounded" />
                                                </CardContent>
                                          </Card>
                                    )
                              ) : viewMode === 'cards' ? (
                                    /* Visualização em Cards */
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                          {departmentStats.map((dept, index) => (
                                                <Card
                                                      key={dept.name}
                                                      className={cn(
                                                            'cursor-pointer transition-all hover:shadow-md',
                                                            selectedDepartment === dept.name && 'ring-2 ring-primary'
                                                      )}
                                                      onClick={() => setSelectedDepartment(
                                                            selectedDepartment === dept.name ? null : dept.name
                                                      )}
                                                >
                                                      <CardHeader className="pb-3">
                                                            <div className="flex items-center justify-between">
                                                                  <div className="flex items-center gap-2">
                                                                        <span
                                                                              className="w-4 h-4 rounded"
                                                                              style={{ backgroundColor: dept.color }}
                                                                        />
                                                                        <CardTitle className="text-lg">{dept.name}</CardTitle>
                                                                  </div>
                                                                  <Badge variant="outline">#{index + 1}</Badge>
                                                            </div>
                                                      </CardHeader>
                                                      <CardContent>
                                                            <div className="space-y-4">
                                                                  {/* Métricas principais */}
                                                                  <div className="grid grid-cols-2 gap-4">
                                                                        <div>
                                                                              <p className="text-sm text-muted-foreground">Total</p>
                                                                              <p className="text-2xl font-bold">{dept.totalTasks}</p>
                                                                        </div>
                                                                        <div>
                                                                              <p className="text-sm text-muted-foreground">Conclusão</p>
                                                                              <p className="text-2xl font-bold">
                                                                                    {dept.completionRate.toFixed(0)}%
                                                                              </p>
                                                                        </div>
                                                                  </div>

                                                                  {/* Barra de progresso por categoria */}
                                                                  <div className="space-y-2">
                                                                        <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                                                                              {dept.closedTasks > 0 && (
                                                                                    <div
                                                                                          className="bg-green-500"
                                                                                          style={{ width: `${(dept.closedTasks / dept.totalTasks) * 100}%` }}
                                                                                          title={`Fechadas: ${dept.closedTasks}`}
                                                                                    />
                                                                              )}
                                                                              {dept.doneTasks > 0 && (
                                                                                    <div
                                                                                          className="bg-yellow-500"
                                                                                          style={{ width: `${(dept.doneTasks / dept.totalTasks) * 100}%` }}
                                                                                          title={`Feitas: ${dept.doneTasks}`}
                                                                                    />
                                                                              )}
                                                                              {dept.activeTasks > 0 && (
                                                                                    <div
                                                                                          className="bg-blue-500"
                                                                                          style={{ width: `${(dept.activeTasks / dept.totalTasks) * 100}%` }}
                                                                                          title={`Ativas: ${dept.activeTasks}`}
                                                                                    />
                                                                              )}
                                                                              {dept.inactiveTasks > 0 && (
                                                                                    <div
                                                                                          className="bg-gray-500"
                                                                                          style={{ width: `${(dept.inactiveTasks / dept.totalTasks) * 100}%` }}
                                                                                          title={`Inativas: ${dept.inactiveTasks}`}
                                                                                    />
                                                                              )}
                                                                        </div>
                                                                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                                                              <span className="flex items-center gap-1">
                                                                                    <span className="w-2 h-2 rounded-full bg-green-500" />
                                                                                    {dept.closedTasks} fechadas
                                                                              </span>
                                                                              <span className="flex items-center gap-1">
                                                                                    <span className="w-2 h-2 rounded-full bg-yellow-500" />
                                                                                    {dept.doneTasks} feitas
                                                                              </span>
                                                                              <span className="flex items-center gap-1">
                                                                                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                                                                                    {dept.activeTasks} ativas
                                                                              </span>
                                                                        </div>
                                                                  </div>

                                                                  {/* Info extra */}
                                                                  <div className="text-sm text-muted-foreground">
                                                                        {dept.uniqueAssignees} {dept.uniqueAssignees === 1 ? 'responsável' : 'responsáveis'}
                                                                  </div>
                                                            </div>
                                                      </CardContent>
                                                </Card>
                                          ))}
                                    </div>
                              ) : (
                                    /* Visualização em Lista (Tabela) */
                                    <Card>
                                          <CardContent className="p-0">
                                                <Table>
                                                      <TableHeader>
                                                            <TableRow>
                                                                  <TableHead className="w-12">#</TableHead>
                                                                  <TableHead>Departamento</TableHead>
                                                                  <TableHead className="text-right">Total</TableHead>
                                                                  <TableHead className="text-right">Fechadas</TableHead>
                                                                  <TableHead className="text-right">Feitas</TableHead>
                                                                  <TableHead className="text-right">Ativas</TableHead>
                                                                  <TableHead className="text-right">Inativas</TableHead>
                                                                  <TableHead className="text-right">Conclusão</TableHead>
                                                                  <TableHead className="w-40">Progresso</TableHead>
                                                                  <TableHead className="text-right">Responsáveis</TableHead>
                                                            </TableRow>
                                                      </TableHeader>
                                                      <TableBody>
                                                            {departmentStats.map((dept, index) => (
                                                                  <TableRow
                                                                        key={dept.name}
                                                                        className={cn(
                                                                              'cursor-pointer transition-colors',
                                                                              selectedDepartment === dept.name && 'bg-muted'
                                                                        )}
                                                                        onClick={() => setSelectedDepartment(
                                                                              selectedDepartment === dept.name ? null : dept.name
                                                                        )}
                                                                  >
                                                                        <TableCell className="font-medium text-muted-foreground">
                                                                              {index + 1}
                                                                        </TableCell>
                                                                        <TableCell>
                                                                              <div className="flex items-center gap-2">
                                                                                    <span
                                                                                          className="w-3 h-3 rounded"
                                                                                          style={{ backgroundColor: dept.color }}
                                                                                    />
                                                                                    <span className="font-medium">{dept.name}</span>
                                                                              </div>
                                                                        </TableCell>
                                                                        <TableCell className="text-right font-semibold">
                                                                              {dept.totalTasks}
                                                                        </TableCell>
                                                                        <TableCell className="text-right text-green-600">
                                                                              {dept.closedTasks}
                                                                        </TableCell>
                                                                        <TableCell className="text-right text-yellow-600">
                                                                              {dept.doneTasks}
                                                                        </TableCell>
                                                                        <TableCell className="text-right text-blue-600">
                                                                              {dept.activeTasks}
                                                                        </TableCell>
                                                                        <TableCell className="text-right text-gray-500">
                                                                              {dept.inactiveTasks}
                                                                        </TableCell>
                                                                        <TableCell className="text-right font-semibold">
                                                                              {dept.completionRate.toFixed(0)}%
                                                                        </TableCell>
                                                                        <TableCell>
                                                                              <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                                                                                    {dept.closedTasks > 0 && (
                                                                                          <div
                                                                                                className="bg-green-500"
                                                                                                style={{ width: `${(dept.closedTasks / dept.totalTasks) * 100}%` }}
                                                                                          />
                                                                                    )}
                                                                                    {dept.doneTasks > 0 && (
                                                                                          <div
                                                                                                className="bg-yellow-500"
                                                                                                style={{ width: `${(dept.doneTasks / dept.totalTasks) * 100}%` }}
                                                                                          />
                                                                                    )}
                                                                                    {dept.activeTasks > 0 && (
                                                                                          <div
                                                                                                className="bg-blue-500"
                                                                                                style={{ width: `${(dept.activeTasks / dept.totalTasks) * 100}%` }}
                                                                                          />
                                                                                    )}
                                                                                    {dept.inactiveTasks > 0 && (
                                                                                          <div
                                                                                                className="bg-gray-500"
                                                                                                style={{ width: `${(dept.inactiveTasks / dept.totalTasks) * 100}%` }}
                                                                                          />
                                                                                    )}
                                                                              </div>
                                                                        </TableCell>
                                                                        <TableCell className="text-right">
                                                                              {dept.uniqueAssignees}
                                                                        </TableCell>
                                                                  </TableRow>
                                                            ))}
                                                      </TableBody>
                                                </Table>
                                          </CardContent>
                                    </Card>
                              )}

                              {!isLoading && departmentStats.length === 0 && (
                                    <p className="text-center text-muted-foreground py-8">
                                          Nenhum departamento encontrado com os filtros selecionados.
                                    </p>
                              )}
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
                                    title="Evolução por Departamento"
                                    items={comparisonData}
                                    selectedItems={comparisonSelected}
                                    onSelectionChange={setComparisonSelected}
                                    metric={comparisonMetric}
                                    isLoading={isLoading}
                              />
                        </TabsContent>

                        {/* Tab: Detalhes */}
                        <TabsContent value="detail" className="space-y-4">
                              {/* Seletor de departamento */}
                              <div className="flex items-center gap-4">
                                    <span className="text-sm text-muted-foreground">Departamento:</span>
                                    <Select
                                          value={selectedDepartment || ''}
                                          onValueChange={(v) => setSelectedDepartment(v || null)}
                                    >
                                          <SelectTrigger className="w-[250px]">
                                                <SelectValue placeholder="Selecione um departamento" />
                                          </SelectTrigger>
                                          <SelectContent>
                                                {departmentStats.map((dept) => (
                                                      <SelectItem key={dept.name} value={dept.name}>
                                                            <div className="flex items-center gap-2">
                                                                  <span
                                                                        className="w-4 h-4 rounded"
                                                                        style={{ backgroundColor: dept.color }}
                                                                  />
                                                                  {dept.name}
                                                            </div>
                                                      </SelectItem>
                                                ))}
                                          </SelectContent>
                                    </Select>
                              </div>

                              {selectedDepartment ? (
                                    <>
                                          {/* Stats do departamento selecionado */}
                                          <div className="grid grid-cols-5 gap-4">
                                                {(() => {
                                                      const stats = departmentStats.find(
                                                            d => d.name.toLowerCase() === selectedDepartment.toLowerCase()
                                                      );
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
                                                                              <p className="text-sm text-muted-foreground">Taxa</p>
                                                                              <p className="text-2xl font-bold">{stats.completionRate.toFixed(1)}%</p>
                                                                        </CardContent>
                                                                  </Card>
                                                                  <Card>
                                                                        <CardContent className="p-4">
                                                                              <p className="text-sm text-muted-foreground">Responsáveis</p>
                                                                              <p className="text-2xl font-bold">{stats.uniqueAssignees}</p>
                                                                        </CardContent>
                                                                  </Card>
                                                            </>
                                                      );
                                                })()}
                                          </div>

                                          {/* Tabela de tarefas */}
                                          <TaskTable
                                                tasks={selectedDepartmentTasks}
                                                showTags={false}
                                                isLoading={isLoading}
                                          />
                                    </>
                              ) : (
                                    <div className="text-center py-12 text-muted-foreground">
                                          Selecione um departamento para ver os detalhes.
                                    </div>
                              )}
                        </TabsContent>
                  </Tabs>
            </div>
      );
}
