'use client';

import {
      LineChart,
      Line,
      XAxis,
      YAxis,
      CartesianGrid,
      Tooltip,
      Legend,
      ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ComparisonData {
      name: string;
      color: string;
      data: Array<{
            month: string;
            total: number;
            closed: number;
            completionRate: number;
      }>;
}

interface ComparisonChartProps {
      title: string;
      items: ComparisonData[];
      selectedItems: string[];
      onSelectionChange: (selected: string[]) => void;
      metric?: 'total' | 'closed' | 'completionRate';
      isLoading?: boolean;
}

const metricLabels: Record<string, string> = {
      total: 'Total de tarefas',
      closed: 'Tarefas fechadas',
      completionRate: 'Taxa de conclusão (%)',
};

export function ComparisonChart({
      title,
      items,
      selectedItems,
      onSelectionChange,
      metric = 'closed',
      isLoading = false,
}: ComparisonChartProps) {
      const toggleItem = (name: string) => {
            if (selectedItems.includes(name)) {
                  onSelectionChange(selectedItems.filter(i => i !== name));
            } else {
                  onSelectionChange([...selectedItems, name]);
            }
      };

      // Combinar dados de todos os itens selecionados em um formato para o gráfico
      const chartData = (() => {
            if (items.length === 0 || selectedItems.length === 0) return [];

            // Coletar todos os meses únicos
            const months = new Set<string>();
            items.forEach(item => {
                  item.data.forEach(d => months.add(d.month));
            });

            // Ordenar meses
            const sortedMonths = Array.from(months).sort();

            // Criar dados combinados
            return sortedMonths.map(month => {
                  const dataPoint: Record<string, string | number> = { month };

                  selectedItems.forEach(itemName => {
                        const item = items.find(i => i.name === itemName);
                        if (item) {
                              const monthData = item.data.find(d => d.month === month);
                              dataPoint[itemName] = monthData ? monthData[metric] : 0;
                        }
                  });

                  return dataPoint;
            });
      })();

      if (isLoading) {
            return (
                  <Card>
                        <CardHeader>
                              <CardTitle>{title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                              <div className="h-[400px] flex items-center justify-center">
                                    <div className="animate-pulse text-muted-foreground">
                                          Carregando dados...
                                    </div>
                              </div>
                        </CardContent>
                  </Card>
            );
      }

      return (
            <Card>
                  <CardHeader>
                        <CardTitle>{title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                        <div className="flex gap-4">
                              {/* Lista de seleção */}
                              <div className="w-48 shrink-0">
                                    <p className="text-sm text-muted-foreground mb-2">
                                          Selecione para comparar:
                                    </p>
                                    <ScrollArea className="h-[350px] pr-4">
                                          <div className="space-y-2">
                                                {items.map((item, index) => (
                                                      <label
                                                            key={`${item.name}-${index}`}
                                                            className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-muted"
                                                      >
                                                            <Checkbox
                                                                  checked={selectedItems.includes(item.name)}
                                                                  onCheckedChange={() => toggleItem(item.name)}
                                                            />
                                                            <span
                                                                  className="w-3 h-3 rounded-full shrink-0"
                                                                  style={{ backgroundColor: item.color }}
                                                            />
                                                            <span className="text-sm truncate" title={item.name}>
                                                                  {item.name}
                                                            </span>
                                                      </label>
                                                ))}
                                          </div>
                                    </ScrollArea>
                              </div>

                              {/* Gráfico */}
                              <div className="flex-1">
                                    {selectedItems.length === 0 ? (
                                          <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                                                Selecione pelo menos um item para visualizar o gráfico.
                                          </div>
                                    ) : chartData.length === 0 ? (
                                          <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                                                Nenhum dado disponível para o período selecionado.
                                          </div>
                                    ) : (
                                          <ResponsiveContainer width="100%" height={350}>
                                                <LineChart data={chartData}>
                                                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                                      <XAxis
                                                            dataKey="month"
                                                            tick={{ fontSize: 12 }}
                                                            tickLine={false}
                                                      />
                                                      <YAxis
                                                            tick={{ fontSize: 12 }}
                                                            tickLine={false}
                                                            axisLine={false}
                                                            tickFormatter={(value) =>
                                                                  metric === 'completionRate' ? `${value}%` : value
                                                            }
                                                      />
                                                      <Tooltip
                                                            contentStyle={{
                                                                  backgroundColor: 'hsl(var(--card))',
                                                                  borderColor: 'hsl(var(--border))',
                                                                  borderRadius: '8px',
                                                            }}
                                                            labelStyle={{ fontWeight: 'bold' }}
                                                            formatter={(value: number) =>
                                                                  metric === 'completionRate'
                                                                        ? `${value.toFixed(1)}%`
                                                                        : value
                                                            }
                                                      />
                                                      <Legend />
                                                      {selectedItems.map((itemName) => {
                                                            const item = items.find(i => i.name === itemName);
                                                            return (
                                                                  <Line
                                                                        key={itemName}
                                                                        type="monotone"
                                                                        dataKey={itemName}
                                                                        name={itemName}
                                                                        stroke={item?.color || '#8884d8'}
                                                                        strokeWidth={2}
                                                                        dot={{ fill: item?.color || '#8884d8', r: 4 }}
                                                                        activeDot={{ r: 6 }}
                                                                  />
                                                            );
                                                      })}
                                                </LineChart>
                                          </ResponsiveContainer>
                                    )}
                                    <p className="text-center text-sm text-muted-foreground mt-2">
                                          {metricLabels[metric]}
                                    </p>
                              </div>
                        </div>
                  </CardContent>
            </Card>
      );
}
