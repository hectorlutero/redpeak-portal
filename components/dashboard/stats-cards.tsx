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
      ListTodo,
      CheckCircle2,
      Clock,
      Pause,
      TrendingUp,
      TrendingDown,
} from 'lucide-react';

interface StatsCardsProps {
      total: number;
      completionRate: number;
      active: number;
      inactive: number;
      isLoading?: boolean;
}

export function StatsCards({
      total,
      completionRate,
      active,
      inactive,
      isLoading,
}: StatsCardsProps) {
      if (isLoading) {
            return (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {[...Array(4)].map((_, i) => (
                              <Card key={i}>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                          <Skeleton className="h-4 w-24" />
                                          <Skeleton className="h-4 w-4" />
                                    </CardHeader>
                                    <CardContent>
                                          <Skeleton className="h-8 w-16 mb-1" />
                                          <Skeleton className="h-3 w-32" />
                                    </CardContent>
                              </Card>
                        ))}
                  </div>
            );
      }

      const cards = [
            {
                  title: 'Total de Tarefas',
                  value: total,
                  description: 'Tarefas no período selecionado',
                  icon: ListTodo,
                  iconColor: 'text-violet-500',
                  bgColor: 'bg-violet-500/10',
            },
            {
                  title: 'Taxa de Conclusão',
                  value: `${completionRate.toFixed(1)}%`,
                  description: completionRate >= 50 ? 'Bom desempenho!' : 'Pode melhorar',
                  icon: completionRate >= 50 ? TrendingUp : TrendingDown,
                  iconColor: completionRate >= 50 ? 'text-emerald-500' : 'text-rose-500',
                  bgColor: completionRate >= 50 ? 'bg-emerald-500/10' : 'bg-rose-500/10',
            },
            {
                  title: 'Tarefas Ativas',
                  value: active,
                  description: 'Em desenvolvimento ou bloqueio',
                  icon: Clock,
                  iconColor: 'text-cyan-500',
                  bgColor: 'bg-cyan-500/10',
            },
            {
                  title: 'Tarefas Inativas',
                  value: inactive,
                  description: 'Backlog e aguardando início',
                  icon: Pause,
                  iconColor: 'text-indigo-500',
                  bgColor: 'bg-indigo-500/10',
            },
      ];

      return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {cards.map((card) => (
                        <Card key={card.title} className="overflow-hidden relative">
                              <div className={`absolute inset-0 ${card.bgColor} opacity-50`} />
                              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
                                    <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                                    <div className={`p-2 rounded-full ${card.bgColor}`}>
                                          <card.icon className={`h-4 w-4 ${card.iconColor}`} />
                                    </div>
                              </CardHeader>
                              <CardContent className="relative">
                                    <div className="text-3xl font-bold">{card.value}</div>
                                    <p className="text-xs text-muted-foreground">{card.description}</p>
                              </CardContent>
                        </Card>
                  ))}
            </div>
      );
}
