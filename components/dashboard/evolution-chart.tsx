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
      ChartLegend,
      ChartLegendContent,
} from '@/components/ui/chart';
import {
      Line,
      LineChart,
      XAxis,
      YAxis,
      CartesianGrid,
      Area,
      AreaChart,
} from 'recharts';
import { type MonthlyEvolution } from '@/types/clickup';

interface EvolutionChartProps {
      data: MonthlyEvolution[];
      isLoading?: boolean;
}

// Cores vibrantes para o gráfico de evolução
const EVOLUTION_COLORS = {
      created: '#f43f5e',  // Rose vibrante - tarefas criadas
      closed: '#22c55e',   // Green vibrante - tarefas concluídas
      total: '#8b5cf6',    // Violet vibrante - saldo
} as const;

const chartConfig = {
      created: {
            label: 'Criadas',
            color: EVOLUTION_COLORS.created,
      },
      closed: {
            label: 'Concluídas',
            color: EVOLUTION_COLORS.closed,
      },
      total: {
            label: 'Saldo (abertas)',
            color: EVOLUTION_COLORS.total,
      },
} satisfies ChartConfig;

export function EvolutionChart({ data, isLoading }: EvolutionChartProps) {
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

      return (
            <Card>
                  <CardHeader>
                        <CardTitle>Evolução Mensal</CardTitle>
                        <CardDescription>
                              Tarefas criadas vs concluídas por mês
                        </CardDescription>
                  </CardHeader>
                  <CardContent>
                        <ChartContainer config={chartConfig} className="h-[300px] w-full">
                              <AreaChart data={data}>
                                    <defs>
                                          <linearGradient id="gradientCreated" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={EVOLUTION_COLORS.created} stopOpacity={0.3} />
                                                <stop offset="95%" stopColor={EVOLUTION_COLORS.created} stopOpacity={0} />
                                          </linearGradient>
                                          <linearGradient id="gradientClosed" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={EVOLUTION_COLORS.closed} stopOpacity={0.3} />
                                                <stop offset="95%" stopColor={EVOLUTION_COLORS.closed} stopOpacity={0} />
                                          </linearGradient>
                                          <linearGradient id="gradientTotal" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={EVOLUTION_COLORS.total} stopOpacity={0.3} />
                                                <stop offset="95%" stopColor={EVOLUTION_COLORS.total} stopOpacity={0} />
                                          </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis
                                          dataKey="label"
                                          tickLine={false}
                                          axisLine={false}
                                          tickMargin={8}
                                    />
                                    <YAxis tickLine={false} axisLine={false} />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <ChartLegend content={<ChartLegendContent />} />
                                    <Area
                                          type="monotone"
                                          dataKey="created"
                                          stroke={EVOLUTION_COLORS.created}
                                          strokeWidth={3}
                                          fill="url(#gradientCreated)"
                                          dot={{ r: 5, fill: EVOLUTION_COLORS.created }}
                                          activeDot={{ r: 7 }}
                                    />
                                    <Area
                                          type="monotone"
                                          dataKey="closed"
                                          stroke={EVOLUTION_COLORS.closed}
                                          strokeWidth={3}
                                          fill="url(#gradientClosed)"
                                          dot={{ r: 5, fill: EVOLUTION_COLORS.closed }}
                                          activeDot={{ r: 7 }}
                                    />
                                    <Area
                                          type="monotone"
                                          dataKey="total"
                                          stroke={EVOLUTION_COLORS.total}
                                          strokeWidth={3}
                                          strokeDasharray="5 5"
                                          fill="url(#gradientTotal)"
                                          dot={{ r: 5, fill: EVOLUTION_COLORS.total }}
                                          activeDot={{ r: 7 }}
                                    />
                              </AreaChart>
                        </ChartContainer>
                  </CardContent>
            </Card>
      );
}
