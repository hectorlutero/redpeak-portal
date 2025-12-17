'use client';

import { Search, X, Filter } from 'lucide-react';
import { DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
      Select,
      SelectContent,
      SelectItem,
      SelectTrigger,
      SelectValue,
} from '@/components/ui/select';
import {
      Popover,
      PopoverContent,
      PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { DateRangePicker } from '@/components/dashboard/date-range-picker';
import { StatusCategory, STATUS_CATEGORY_LABELS, DateCriteria, DATE_CRITERIA_LABELS } from '@/types/clickup';

interface FiltersBarProps {
      dateRange: DateRange | undefined;
      onDateRangeChange: (range: DateRange | undefined) => void;
      // Critério de período
      dateCriteria?: DateCriteria;
      onDateCriteriaChange?: (criteria: DateCriteria) => void;
      showDateCriteriaFilter?: boolean;
      // Responsáveis
      assignees?: Array<{ id: number; username: string; initials: string; color: string }>;
      selectedAssigneeIds?: number[];
      onAssigneeChange?: (ids: number[]) => void;
      showAssigneeFilter?: boolean;
      // Tags/Departamentos
      tags?: Array<{ name: string; tag_bg: string }>;
      selectedTags?: string[];
      onTagChange?: (tags: string[]) => void;
      showTagFilter?: boolean;
      // Categorias
      selectedCategories?: StatusCategory[];
      onCategoryChange?: (categories: StatusCategory[]) => void;
      showCategoryFilter?: boolean;
      // Prioridades
      selectedPriorities?: string[];
      onPriorityChange?: (priorities: string[]) => void;
      showPriorityFilter?: boolean;
      // Busca
      search?: string;
      onSearchChange?: (search: string) => void;
      showSearch?: boolean;
      // Reset
      onReset?: () => void;
}

const priorities = [
      { value: 'urgent', label: 'Urgente', color: '#f50057' },
      { value: 'high', label: 'Alta', color: '#ffcc00' },
      { value: 'normal', label: 'Normal', color: '#6fddff' },
      { value: 'low', label: 'Baixa', color: '#d8d8d8' },
];

const categories: StatusCategory[] = ['inactive', 'active', 'done', 'closed'];

export function FiltersBar({
      dateRange,
      onDateRangeChange,
      dateCriteria = 'closed',
      onDateCriteriaChange,
      showDateCriteriaFilter = true,
      assignees = [],
      selectedAssigneeIds = [],
      onAssigneeChange,
      showAssigneeFilter = false,
      tags = [],
      selectedTags = [],
      onTagChange,
      showTagFilter = false,
      selectedCategories = [],
      onCategoryChange,
      showCategoryFilter = true,
      selectedPriorities = [],
      onPriorityChange,
      showPriorityFilter = true,
      search = '',
      onSearchChange,
      showSearch = true,
      onReset,
}: FiltersBarProps) {
      const hasActiveFilters =
            selectedAssigneeIds.length > 0 ||
            selectedTags.length > 0 ||
            selectedCategories.length > 0 ||
            selectedPriorities.length > 0 ||
            search.length > 0;

      const toggleAssignee = (id: number) => {
            if (!onAssigneeChange) return;
            const newIds = selectedAssigneeIds.includes(id)
                  ? selectedAssigneeIds.filter(i => i !== id)
                  : [...selectedAssigneeIds, id];
            onAssigneeChange(newIds);
      };

      const toggleTag = (tag: string) => {
            if (!onTagChange) return;
            const newTags = selectedTags.includes(tag)
                  ? selectedTags.filter(t => t !== tag)
                  : [...selectedTags, tag];
            onTagChange(newTags);
      };

      const toggleCategory = (category: StatusCategory) => {
            if (!onCategoryChange) return;
            const newCategories = selectedCategories.includes(category)
                  ? selectedCategories.filter(c => c !== category)
                  : [...selectedCategories, category];
            onCategoryChange(newCategories);
      };

      const togglePriority = (priority: string) => {
            if (!onPriorityChange) return;
            const newPriorities = selectedPriorities.includes(priority)
                  ? selectedPriorities.filter(p => p !== priority)
                  : [...selectedPriorities, priority];
            onPriorityChange(newPriorities);
      };

      return (
            <div className="space-y-4">
                  {/* Linha principal de filtros */}
                  <div className="flex flex-wrap items-center gap-3">
                        {/* Date Range */}
                        <DateRangePicker
                              dateRange={dateRange}
                              onDateRangeChange={onDateRangeChange}
                        />

                        {/* Critério de Período */}
                        {showDateCriteriaFilter && onDateCriteriaChange && (
                              <Select value={dateCriteria} onValueChange={(v) => onDateCriteriaChange(v as DateCriteria)}>
                                    <SelectTrigger className="w-[150px] h-10">
                                          <SelectValue placeholder="Critério" />
                                    </SelectTrigger>
                                    <SelectContent>
                                          <SelectItem value="created">{DATE_CRITERIA_LABELS.created}</SelectItem>
                                          <SelectItem value="closed">{DATE_CRITERIA_LABELS.closed}</SelectItem>
                                          <SelectItem value="updated">{DATE_CRITERIA_LABELS.updated}</SelectItem>
                                    </SelectContent>
                              </Select>
                        )}

                        {/* Busca */}
                        {showSearch && onSearchChange && (
                              <div className="relative">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                          placeholder="Buscar tarefa..."
                                          value={search}
                                          onChange={(e) => onSearchChange(e.target.value)}
                                          className="pl-9 w-[200px]"
                                    />
                                    {search && (
                                          <Button
                                                variant="ghost"
                                                size="icon"
                                                className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2"
                                                onClick={() => onSearchChange('')}
                                          >
                                                <X className="h-3 w-3" />
                                          </Button>
                                    )}
                              </div>
                        )}

                        {/* Filtro de Categorias */}
                        {showCategoryFilter && onCategoryChange && (
                              <Popover>
                                    <PopoverTrigger asChild>
                                          <Button variant="outline" size="sm" className="h-10">
                                                <Filter className="mr-2 h-4 w-4" />
                                                Status
                                                {selectedCategories.length > 0 && (
                                                      <Badge variant="secondary" className="ml-2">
                                                            {selectedCategories.length}
                                                      </Badge>
                                                )}
                                          </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[200px] p-3">
                                          <div className="space-y-2">
                                                {categories.map((category) => (
                                                      <label
                                                            key={category}
                                                            className="flex items-center gap-2 cursor-pointer"
                                                      >
                                                            <Checkbox
                                                                  checked={selectedCategories.includes(category)}
                                                                  onCheckedChange={() => toggleCategory(category)}
                                                            />
                                                            <span className="text-sm">{STATUS_CATEGORY_LABELS[category]}</span>
                                                      </label>
                                                ))}
                                          </div>
                                    </PopoverContent>
                              </Popover>
                        )}

                        {/* Filtro de Prioridade */}
                        {showPriorityFilter && onPriorityChange && (
                              <Popover>
                                    <PopoverTrigger asChild>
                                          <Button variant="outline" size="sm" className="h-10">
                                                <Filter className="mr-2 h-4 w-4" />
                                                Prioridade
                                                {selectedPriorities.length > 0 && (
                                                      <Badge variant="secondary" className="ml-2">
                                                            {selectedPriorities.length}
                                                      </Badge>
                                                )}
                                          </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[200px] p-3">
                                          <div className="space-y-2">
                                                {priorities.map((priority) => (
                                                      <label
                                                            key={priority.value}
                                                            className="flex items-center gap-2 cursor-pointer"
                                                      >
                                                            <Checkbox
                                                                  checked={selectedPriorities.includes(priority.value)}
                                                                  onCheckedChange={() => togglePriority(priority.value)}
                                                            />
                                                            <span
                                                                  className="w-3 h-3 rounded-full"
                                                                  style={{ backgroundColor: priority.color }}
                                                            />
                                                            <span className="text-sm">{priority.label}</span>
                                                      </label>
                                                ))}
                                          </div>
                                    </PopoverContent>
                              </Popover>
                        )}

                        {/* Filtro de Responsáveis */}
                        {showAssigneeFilter && onAssigneeChange && assignees.length > 0 && (
                              <Popover>
                                    <PopoverTrigger asChild>
                                          <Button variant="outline" size="sm" className="h-10">
                                                <Filter className="mr-2 h-4 w-4" />
                                                Responsável
                                                {selectedAssigneeIds.length > 0 && (
                                                      <Badge variant="secondary" className="ml-2">
                                                            {selectedAssigneeIds.length}
                                                      </Badge>
                                                )}
                                          </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[250px] p-3 max-h-[300px] overflow-auto">
                                          <div className="space-y-2">
                                                {assignees.map((assignee) => (
                                                      <label
                                                            key={assignee.id}
                                                            className="flex items-center gap-2 cursor-pointer"
                                                      >
                                                            <Checkbox
                                                                  checked={selectedAssigneeIds.includes(assignee.id)}
                                                                  onCheckedChange={() => toggleAssignee(assignee.id)}
                                                            />
                                                            <span
                                                                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs text-white"
                                                                  style={{ backgroundColor: assignee.color }}
                                                            >
                                                                  {assignee.initials}
                                                            </span>
                                                            <span className="text-sm truncate">{assignee.username}</span>
                                                      </label>
                                                ))}
                                          </div>
                                    </PopoverContent>
                              </Popover>
                        )}

                        {/* Filtro de Tags/Departamentos */}
                        {showTagFilter && onTagChange && tags.length > 0 && (
                              <Popover>
                                    <PopoverTrigger asChild>
                                          <Button variant="outline" size="sm" className="h-10">
                                                <Filter className="mr-2 h-4 w-4" />
                                                Departamento
                                                {selectedTags.length > 0 && (
                                                      <Badge variant="secondary" className="ml-2">
                                                            {selectedTags.length}
                                                      </Badge>
                                                )}
                                          </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[250px] p-3 max-h-[300px] overflow-auto">
                                          <div className="space-y-2">
                                                {tags.map((tag) => (
                                                      <label
                                                            key={tag.name}
                                                            className="flex items-center gap-2 cursor-pointer"
                                                      >
                                                            <Checkbox
                                                                  checked={selectedTags.includes(tag.name.toLowerCase())}
                                                                  onCheckedChange={() => toggleTag(tag.name.toLowerCase())}
                                                            />
                                                            <span
                                                                  className="w-3 h-3 rounded"
                                                                  style={{ backgroundColor: tag.tag_bg }}
                                                            />
                                                            <span className="text-sm truncate">{tag.name}</span>
                                                      </label>
                                                ))}
                                          </div>
                                    </PopoverContent>
                              </Popover>
                        )}

                        {/* Botão de Reset */}
                        {hasActiveFilters && onReset && (
                              <Button variant="ghost" size="sm" onClick={onReset}>
                                    <X className="mr-2 h-4 w-4" />
                                    Limpar filtros
                              </Button>
                        )}
                  </div>

                  {/* Badges dos filtros ativos */}
                  {hasActiveFilters && (
                        <div className="flex flex-wrap gap-2">
                              {selectedCategories.map((category) => (
                                    <Badge
                                          key={category}
                                          variant="secondary"
                                          className="cursor-pointer"
                                          onClick={() => toggleCategory(category)}
                                    >
                                          {STATUS_CATEGORY_LABELS[category]}
                                          <X className="ml-1 h-3 w-3" />
                                    </Badge>
                              ))}
                              {selectedPriorities.map((priority) => {
                                    const p = priorities.find(pr => pr.value === priority);
                                    return (
                                          <Badge
                                                key={priority}
                                                variant="secondary"
                                                className="cursor-pointer"
                                                onClick={() => togglePriority(priority)}
                                          >
                                                {p?.label || priority}
                                                <X className="ml-1 h-3 w-3" />
                                          </Badge>
                                    );
                              })}
                              {selectedAssigneeIds.map((id) => {
                                    const a = assignees.find(as => as.id === id);
                                    return (
                                          <Badge
                                                key={id}
                                                variant="secondary"
                                                className="cursor-pointer"
                                                onClick={() => toggleAssignee(id)}
                                          >
                                                {a?.username || id}
                                                <X className="ml-1 h-3 w-3" />
                                          </Badge>
                                    );
                              })}
                              {selectedTags.map((tag) => (
                                    <Badge
                                          key={tag}
                                          variant="secondary"
                                          className="cursor-pointer"
                                          onClick={() => toggleTag(tag)}
                                    >
                                          {tag}
                                          <X className="ml-1 h-3 w-3" />
                                    </Badge>
                              ))}
                        </div>
                  )}
            </div>
      );
}
