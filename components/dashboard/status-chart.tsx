'use client';

import {
      Card,
      CardContent,
      CardDescription,
      CardHeader,
      CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
      ChartConfig,
      ChartContainer,
      ChartTooltip,
      ChartTooltipContent,
} from '@/components/ui/chart';
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Cell } from 'recharts';
import { type StatusCategory, STATUS_CATEGORY_LABELS } from '@/types/clickup';

interface StatusChartProps {
      data: Record<StatusCategory, number>;
      isLoading?: boolean;
}

// Cores vibrantes e diferenciadas para cada categoria
const CATEGORY_COLORS = {
      inactive: '#6366f1', // Indigo vibrante - tarefas paradas
      active: '#06b6d4',   // Cyan vibrante - tarefas em andamento
      done: '#f59e0b',     // Amber vibrante - aguardando validação
      closed: '#22c55e',   // Green vibrante - concluídas
} as const;

const chartConfig = {
      inactive: {
            label: STATUS_CATEGORY_LABELS.inactive,
            color: CATEGORY_COLORS.inactive,
      },
      active: {
            label: STATUS_CATEGORY_LABELS.active,
            color: CATEGORY_COLORS.active,
      },
      done: {
            label: STATUS_CATEGORY_LABELS.done,
            color: CATEGORY_COLORS.done,
      },
      closed: {
            label: STATUS_CATEGORY_LABELS.closed,
            color: CATEGORY_COLORS.closed,
      },
} satisfies ChartConfig;

export function StatusChart({ data, isLoading }: StatusChartProps) {
      if (isLoading) {
            return (
                  <Card>
                        <CardHeader>
                              <Skeleton className="h-5 w-40" />
                              <Skeleton className="h-4 w-60" />
                        </CardHeader>
                        <CardContent>
                              <Skeleton className="h-[300px] w-full" />
                        </CardContent>
                  </Card>
            );
      }

      const chartData = [
            {
                  category: STATUS_CATEGORY_LABELS.inactive,
                  value: data.inactive,
                  color: CATEGORY_COLORS.inactive,
            },
            {
                  category: STATUS_CATEGORY_LABELS.active,
                  value: data.active,
                  color: CATEGORY_COLORS.active,
            },
            {
                  category: STATUS_CATEGORY_LABELS.done,
                  value: data.done,
                  color: CATEGORY_COLORS.done,
            },
            {
                  category: STATUS_CATEGORY_LABELS.closed,
                  value: data.closed,
                  color: CATEGORY_COLORS.closed,
            },
      ];

      return (
            <Card>
                  <CardHeader>
                        <CardTitle>Tarefas por Categoria</CardTitle>
                        <CardDescription>
                              Distribuição das tarefas por status agrupado
                        </CardDescription>
                  </CardHeader>
                  <CardContent>
                        <ChartContainer config={chartConfig} className="h-[300px] w-full">
                              <BarChart data={chartData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" />
                                    <YAxis
                                          dataKey="category"
                                          type="category"
                                          tickLine={false}
                                          axisLine={false}
                                          width={80}
                                    />
                                    <ChartTooltip
                                          cursor={false}
                                          content={<ChartTooltipContent hideLabel />}
                                    />
                                    <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                                          {chartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                          ))}
                                    </Bar>
                              </BarChart>
                        </ChartContainer>
                  </CardContent>
            </Card>
      );
}
