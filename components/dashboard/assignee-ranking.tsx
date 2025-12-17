'use client';

import {
      Card,
      CardContent,
      CardDescription,
      CardHeader,
      CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
      Table,
      TableBody,
      TableCell,
      TableHead,
      TableHeader,
      TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { type AssigneeStats } from '@/types/clickup';

interface AssigneeRankingProps {
      data: AssigneeStats[];
      isLoading?: boolean;
}

export function AssigneeRanking({ data, isLoading }: AssigneeRankingProps) {
      if (isLoading) {
            return (
                  <Card>
                        <CardHeader>
                              <Skeleton className="h-5 w-48" />
                              <Skeleton className="h-4 w-64" />
                        </CardHeader>
                        <CardContent>
                              <div className="space-y-4">
                                    {[...Array(5)].map((_, i) => (
                                          <div key={i} className="flex items-center gap-4">
                                                <Skeleton className="h-10 w-10 rounded-full" />
                                                <div className="flex-1 space-y-2">
                                                      <Skeleton className="h-4 w-32" />
                                                      <Skeleton className="h-2 w-full" />
                                                </div>
                                                <Skeleton className="h-6 w-16" />
                                          </div>
                                    ))}
                              </div>
                        </CardContent>
                  </Card>
            );
      }

      // Ordenar por taxa de conclusão (maior primeiro)
      const sortedData = [...data].sort(
            (a, b) => b.completionRate - a.completionRate
      );

      return (
            <Card>
                  <CardHeader>
                        <CardTitle>Ranking por Responsável</CardTitle>
                        <CardDescription>
                              Taxa de conclusão e volume de tarefas por membro
                        </CardDescription>
                  </CardHeader>
                  <CardContent>
                        <Table>
                              <TableHeader>
                                    <TableRow>
                                          <TableHead className="w-[50px]">#</TableHead>
                                          <TableHead>Responsável</TableHead>
                                          <TableHead className="text-center">Total</TableHead>
                                          <TableHead className="text-center">Concluídas</TableHead>
                                          <TableHead className="w-[200px]">Taxa de Conclusão</TableHead>
                                    </TableRow>
                              </TableHeader>
                              <TableBody>
                                    {sortedData.map((assignee, index) => (
                                          <TableRow key={assignee.id}>
                                                <TableCell className="font-medium">
                                                      {index === 0 && '🥇'}
                                                      {index === 1 && '🥈'}
                                                      {index === 2 && '🥉'}
                                                      {index > 2 && index + 1}
                                                </TableCell>
                                                <TableCell>
                                                      <div className="flex items-center gap-2">
                                                            <Avatar className="h-8 w-8">
                                                                  {assignee.profilePicture && (
                                                                        <AvatarImage
                                                                              src={assignee.profilePicture}
                                                                              alt={assignee.username}
                                                                        />
                                                                  )}
                                                                  <AvatarFallback
                                                                        style={{ backgroundColor: assignee.color }}
                                                                        className="text-white text-xs"
                                                                  >
                                                                        {assignee.initials}
                                                                  </AvatarFallback>
                                                            </Avatar>
                                                            <span className="font-medium">{assignee.username}</span>
                                                      </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                      <Badge variant="outline">{assignee.total}</Badge>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                      <Badge variant="secondary">{assignee.byCategory.closed}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                      <div className="flex items-center gap-2">
                                                            <Progress
                                                                  value={assignee.completionRate}
                                                                  className="h-2 flex-1"
                                                            />
                                                            <span className="text-sm font-medium w-12 text-right">
                                                                  {assignee.completionRate.toFixed(0)}%
                                                            </span>
                                                      </div>
                                                </TableCell>
                                          </TableRow>
                                    ))}
                                    {sortedData.length === 0 && (
                                          <TableRow>
                                                <TableCell colSpan={5} className="text-center text-muted-foreground">
                                                      Nenhum responsável encontrado no período
                                                </TableCell>
                                          </TableRow>
                                    )}
                              </TableBody>
                        </Table>
                  </CardContent>
            </Card>
      );
}
