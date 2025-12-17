'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
      ChevronDown,
      ChevronRight,
      ExternalLink,
      ArrowUpDown,
      ArrowUp,
      ArrowDown,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
      Table,
      TableBody,
      TableCell,
      TableHead,
      TableHeader,
      TableRow,
} from '@/components/ui/table';
import {
      Collapsible,
      CollapsibleContent,
      CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ClickUpTask, STATUS_CATEGORY_LABELS, StatusCategory } from '@/types/clickup';
import { cn } from '@/lib/utils';

// Extended task type with category added by the API
interface TaskWithCategory extends ClickUpTask {
      category?: StatusCategory;
}

interface TaskTableProps {
      tasks: TaskWithCategory[];
      groupBy?: 'assignee' | 'tag' | 'status' | 'none';
      showAssignee?: boolean;
      showTags?: boolean;
      showStatus?: boolean;
      isLoading?: boolean;
}

type SortField = 'name' | 'status' | 'priority' | 'date_created' | 'date_closed';
type SortDirection = 'asc' | 'desc';

const priorityLabels: Record<string, string> = {
      urgent: 'Urgente',
      high: 'Alta',
      normal: 'Normal',
      low: 'Baixa',
};

const priorityColors: Record<string, string> = {
      urgent: 'bg-red-500',
      high: 'bg-yellow-500',
      normal: 'bg-blue-500',
      low: 'bg-gray-500',
};

export function TaskTable({
      tasks,
      groupBy = 'none',
      showAssignee = true,
      showTags = true,
      showStatus = true,
      isLoading = false,
}: TaskTableProps) {
      const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
      const [sortField, setSortField] = useState<SortField>('date_created');
      const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

      const toggleGroup = (group: string) => {
            const newExpanded = new Set(expandedGroups);
            if (newExpanded.has(group)) {
                  newExpanded.delete(group);
            } else {
                  newExpanded.add(group);
            }
            setExpandedGroups(newExpanded);
      };

      const handleSort = (field: SortField) => {
            if (sortField === field) {
                  setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
            } else {
                  setSortField(field);
                  setSortDirection('desc');
            }
      };

      const SortIcon = ({ field }: { field: SortField }) => {
            if (sortField !== field) {
                  return <ArrowUpDown className="ml-2 h-4 w-4" />;
            }
            return sortDirection === 'asc' ? (
                  <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
                  <ArrowDown className="ml-2 h-4 w-4" />
            );
      };

      const sortTasks = (tasksToSort: TaskWithCategory[]) => {
            return [...tasksToSort].sort((a, b) => {
                  let comparison = 0;
                  switch (sortField) {
                        case 'name':
                              comparison = a.name.localeCompare(b.name);
                              break;
                        case 'status':
                              comparison = (a.status?.status || '').localeCompare(b.status?.status || '');
                              break;
                        case 'priority':
                              const priorityOrder: Record<string, number> = { urgent: 1, high: 2, normal: 3, low: 4 };
                              const priorityA = priorityOrder[a.priority?.priority || 'normal'] || 99;
                              const priorityB = priorityOrder[b.priority?.priority || 'normal'] || 99;
                              comparison = priorityA - priorityB;
                              break;
                        case 'date_created':
                              comparison = parseInt(a.date_created) - parseInt(b.date_created);
                              break;
                        case 'date_closed':
                              const dateA = a.date_closed ? parseInt(a.date_closed) : 0;
                              const dateB = b.date_closed ? parseInt(b.date_closed) : 0;
                              comparison = dateA - dateB;
                              break;
                  }
                  return sortDirection === 'asc' ? comparison : -comparison;
            });
      };

      const groupTasks = () => {
            if (groupBy === 'none') {
                  return { 'Todas as tarefas': tasks };
            }

            const groups: Record<string, TaskWithCategory[]> = {};

            tasks.forEach((task) => {
                  let keys: string[] = [];

                  switch (groupBy) {
                        case 'assignee':
                              if (task.assignees && task.assignees.length > 0) {
                                    keys = task.assignees.map((a) => a.username || `User ${a.id}`);
                              } else {
                                    keys = ['Sem responsável'];
                              }
                              break;
                        case 'tag':
                              if (task.tags && task.tags.length > 0) {
                                    keys = task.tags.map((t) => t.name);
                              } else {
                                    keys = ['Sem departamento'];
                              }
                              break;
                        case 'status':
                              keys = [task.status?.status || 'Sem status'];
                              break;
                  }

                  keys.forEach((key) => {
                        if (!groups[key]) {
                              groups[key] = [];
                        }
                        groups[key].push(task);
                  });
            });

            return groups;
      };

      const groupedTasks = groupTasks();
      const sortedGroupKeys = Object.keys(groupedTasks).sort();

      const formatDate = (timestamp: string | null) => {
            if (!timestamp) return '-';
            return format(new Date(parseInt(timestamp)), 'dd/MM/yyyy', { locale: ptBR });
      };

      const renderTaskRow = (task: TaskWithCategory) => (
            <TableRow key={task.id}>
                  <TableCell className="max-w-[300px]">
                        <div className="flex items-center gap-2">
                              <a
                                    href={task.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm font-medium hover:underline truncate"
                              >
                                    {task.name}
                              </a>
                              <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                        </div>
                  </TableCell>
                  {showStatus && (
                        <TableCell>
                              <div className="flex items-center gap-2">
                                    <span
                                          className="w-2 h-2 rounded-full"
                                          style={{ backgroundColor: task.status?.color || '#666' }}
                                    />
                                    <span className="text-sm">
                                          {task.status?.status || '-'}
                                    </span>
                              </div>
                        </TableCell>
                  )}
                  <TableCell>
                        {task.priority && (
                              <Badge
                                    variant="secondary"
                                    className={cn(
                                          'text-white',
                                          priorityColors[task.priority.priority] || 'bg-gray-500'
                                    )}
                              >
                                    {priorityLabels[task.priority.priority] || 'Normal'}
                              </Badge>
                        )}
                        {!task.priority && (
                              <Badge variant="outline">Normal</Badge>
                        )}
                  </TableCell>
                  {showAssignee && (
                        <TableCell>
                              <div className="flex flex-wrap gap-1">
                                    {task.assignees && task.assignees.length > 0 ? (
                                          task.assignees.map((a) => (
                                                <div
                                                      key={a.id}
                                                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs text-white"
                                                      style={{ backgroundColor: a.color || '#666' }}
                                                      title={a.username}
                                                >
                                                      {a.initials}
                                                </div>
                                          ))
                                    ) : (
                                          <span className="text-muted-foreground text-sm">-</span>
                                    )}
                              </div>
                        </TableCell>
                  )}
                  {showTags && (
                        <TableCell>
                              <div className="flex flex-wrap gap-1 max-w-50">
                                    {task.tags && task.tags.length > 0 ? (
                                          task.tags.map((tag) => (
                                                <Badge
                                                      key={tag.name}
                                                      variant="secondary"
                                                      style={{ backgroundColor: tag.tag_bg }}
                                                      className="text-white text-xs"
                                                >
                                                      {tag.name}
                                                </Badge>
                                          ))
                                    ) : (
                                          <span className="text-muted-foreground text-sm">-</span>
                                    )}
                              </div>
                        </TableCell>
                  )}
                  <TableCell className="text-sm text-muted-foreground">
                        {formatDate(task.date_created)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                        {formatDate(task.date_closed)}
                  </TableCell>
            </TableRow>
      );

      if (isLoading) {
            return (
                  <div className="rounded-md border">
                        <Table>
                              <TableHeader>
                                    <TableRow>
                                          <TableHead className="w-[300px]">Tarefa</TableHead>
                                          {showStatus && <TableHead>Status</TableHead>}
                                          <TableHead>Prioridade</TableHead>
                                          {showAssignee && <TableHead>Responsável</TableHead>}
                                          {showTags && <TableHead>Departamento</TableHead>}
                                          <TableHead>Criado</TableHead>
                                          <TableHead>Concluído</TableHead>
                                    </TableRow>
                              </TableHeader>
                              <TableBody>
                                    {[...Array(5)].map((_, i) => (
                                          <TableRow key={i}>
                                                <TableCell colSpan={7}>
                                                      <div className="h-10 bg-muted animate-pulse rounded" />
                                                </TableCell>
                                          </TableRow>
                                    ))}
                              </TableBody>
                        </Table>
                  </div>
            );
      }

      if (tasks.length === 0) {
            return (
                  <div className="rounded-md border p-8 text-center">
                        <p className="text-muted-foreground">
                              Nenhuma tarefa encontrada com os filtros selecionados.
                        </p>
                  </div>
            );
      }

      if (groupBy === 'none') {
            return (
                  <div className="rounded-md border">
                        <Table>
                              <TableHeader>
                                    <TableRow>
                                          <TableHead className="w-[300px]">
                                                <Button
                                                      variant="ghost"
                                                      onClick={() => handleSort('name')}
                                                      className="h-8 px-2 font-medium"
                                                >
                                                      Tarefa
                                                      <SortIcon field="name" />
                                                </Button>
                                          </TableHead>
                                          {showStatus && (
                                                <TableHead>
                                                      <Button
                                                            variant="ghost"
                                                            onClick={() => handleSort('status')}
                                                            className="h-8 px-2 font-medium"
                                                      >
                                                            Status
                                                            <SortIcon field="status" />
                                                      </Button>
                                                </TableHead>
                                          )}
                                          <TableHead>
                                                <Button
                                                      variant="ghost"
                                                      onClick={() => handleSort('priority')}
                                                      className="h-8 px-2 font-medium"
                                                >
                                                      Prioridade
                                                      <SortIcon field="priority" />
                                                </Button>
                                          </TableHead>
                                          {showAssignee && <TableHead>Responsável</TableHead>}
                                          {showTags && <TableHead>Departamento</TableHead>}
                                          <TableHead>
                                                <Button
                                                      variant="ghost"
                                                      onClick={() => handleSort('date_created')}
                                                      className="h-8 px-2 font-medium"
                                                >
                                                      Criado
                                                      <SortIcon field="date_created" />
                                                </Button>
                                          </TableHead>
                                          <TableHead>
                                                <Button
                                                      variant="ghost"
                                                      onClick={() => handleSort('date_closed')}
                                                      className="h-8 px-2 font-medium"
                                                >
                                                      Concluído
                                                      <SortIcon field="date_closed" />
                                                </Button>
                                          </TableHead>
                                    </TableRow>
                              </TableHeader>
                              <TableBody>
                                    {sortTasks(tasks).map(renderTaskRow)}
                              </TableBody>
                        </Table>
                  </div>
            );
      }

      return (
            <div className="space-y-2">
                  {sortedGroupKeys.map((groupKey) => {
                        const groupTasks = groupedTasks[groupKey];
                        const isExpanded = expandedGroups.has(groupKey);

                        return (
                              <Collapsible
                                    key={groupKey}
                                    open={isExpanded}
                                    onOpenChange={() => toggleGroup(groupKey)}
                              >
                                    <div className="rounded-md border">
                                          <CollapsibleTrigger asChild>
                                                <Button
                                                      variant="ghost"
                                                      className="w-full justify-start h-12 rounded-b-none"
                                                >
                                                      {isExpanded ? (
                                                            <ChevronDown className="mr-2 h-4 w-4" />
                                                      ) : (
                                                            <ChevronRight className="mr-2 h-4 w-4" />
                                                      )}
                                                      <span className="font-medium">{groupKey}</span>
                                                      <Badge variant="secondary" className="ml-auto">
                                                            {groupTasks.length} {groupTasks.length === 1 ? 'tarefa' : 'tarefas'}
                                                      </Badge>
                                                </Button>
                                          </CollapsibleTrigger>
                                          <CollapsibleContent>
                                                <Table>
                                                      <TableHeader>
                                                            <TableRow>
                                                                  <TableHead className="w-[300px]">Tarefa</TableHead>
                                                                  {showStatus && <TableHead>Status</TableHead>}
                                                                  <TableHead>Prioridade</TableHead>
                                                                  {showAssignee && <TableHead>Responsável</TableHead>}
                                                                  {showTags && <TableHead>Departamento</TableHead>}
                                                                  <TableHead>Criado</TableHead>
                                                                  <TableHead>Concluído</TableHead>
                                                            </TableRow>
                                                      </TableHeader>
                                                      <TableBody>
                                                            {sortTasks(groupTasks).map(renderTaskRow)}
                                                      </TableBody>
                                                </Table>
                                          </CollapsibleContent>
                                    </div>
                              </Collapsible>
                        );
                  })}
            </div>
      );
}
