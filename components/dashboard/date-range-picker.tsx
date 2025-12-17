'use client';

import * as React from 'react';
import { CalendarIcon } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
      Popover,
      PopoverContent,
      PopoverTrigger,
} from '@/components/ui/popover';
import {
      Select,
      SelectContent,
      SelectItem,
      SelectTrigger,
      SelectValue,
} from '@/components/ui/select';

interface DateRangePickerProps {
      dateRange: DateRange | undefined;
      onDateRangeChange: (range: DateRange | undefined) => void;
      className?: string;
}

const presets = [
      {
            label: 'Este mês',
            getValue: () => ({
                  from: startOfMonth(new Date()),
                  to: endOfMonth(new Date()),
            }),
      },
      {
            label: 'Mês passado',
            getValue: () => ({
                  from: startOfMonth(subMonths(new Date(), 1)),
                  to: endOfMonth(subMonths(new Date(), 1)),
            }),
      },
      {
            label: 'Últimos 3 meses',
            getValue: () => ({
                  from: startOfMonth(subMonths(new Date(), 2)),
                  to: endOfMonth(new Date()),
            }),
      },
      {
            label: 'Últimos 6 meses',
            getValue: () => ({
                  from: startOfMonth(subMonths(new Date(), 5)),
                  to: endOfMonth(new Date()),
            }),
      },
      {
            label: 'Este ano',
            getValue: () => ({
                  from: startOfYear(new Date()),
                  to: endOfYear(new Date()),
            }),
      },
      {
            label: 'Ano passado',
            getValue: () => ({
                  from: startOfYear(subMonths(new Date(), 12)),
                  to: endOfYear(subMonths(new Date(), 12)),
            }),
      },
];

export function DateRangePicker({
      dateRange,
      onDateRangeChange,
      className,
}: DateRangePickerProps) {
      const [isOpen, setIsOpen] = React.useState(false);

      const handlePresetChange = (presetLabel: string) => {
            const preset = presets.find((p) => p.label === presetLabel);
            if (preset) {
                  onDateRangeChange(preset.getValue());
            }
      };

      return (
            <div className={cn('flex items-center gap-2', className)}>
                  <Select onValueChange={handlePresetChange}>
                        <SelectTrigger className="w-[160px]">
                              <SelectValue placeholder="Período rápido" />
                        </SelectTrigger>
                        <SelectContent>
                              {presets.map((preset) => (
                                    <SelectItem key={preset.label} value={preset.label}>
                                          {preset.label}
                                    </SelectItem>
                              ))}
                        </SelectContent>
                  </Select>

                  <Popover open={isOpen} onOpenChange={setIsOpen}>
                        <PopoverTrigger asChild>
                              <Button
                                    variant="outline"
                                    className={cn(
                                          'w-[280px] justify-start text-left font-normal',
                                          !dateRange && 'text-muted-foreground'
                                    )}
                              >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange?.from ? (
                                          dateRange.to ? (
                                                <>
                                                      {format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR })} -{' '}
                                                      {format(dateRange.to, 'dd/MM/yyyy', { locale: ptBR })}
                                                </>
                                          ) : (
                                                format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR })
                                          )
                                    ) : (
                                          <span>Selecione um período</span>
                                    )}
                              </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={dateRange?.from}
                                    selected={dateRange}
                                    onSelect={onDateRangeChange}
                                    numberOfMonths={2}
                                    locale={ptBR}
                              />
                        </PopoverContent>
                  </Popover>
            </div>
      );
}
