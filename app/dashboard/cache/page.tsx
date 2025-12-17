'use client';

import { useState, useEffect, useCallback } from 'react';
import {
      RefreshCw,
      Database,
      CheckCircle2,
      Clock,
      AlertCircle,
      Play,
      Loader2,
      Calendar,
      HardDrive,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import {
      Card,
      CardContent,
      CardDescription,
      CardHeader,
      CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
      Table,
      TableBody,
      TableCell,
      TableHead,
      TableHeader,
      TableRow,
} from '@/components/ui/table';
import { type CacheStatusResponse, type CacheMonthMeta } from '@/types/cache';

export default function CachePage() {
      const [status, setStatus] = useState<CacheStatusResponse | null>(null);
      const [isLoading, setIsLoading] = useState(true);
      const [isRefreshing, setIsRefreshing] = useState(false);
      const [isBuilding, setIsBuilding] = useState(false);
      const [error, setError] = useState<string | null>(null);

      const fetchStatus = useCallback(async () => {
            try {
                  const response = await fetch('/api/cache/status');
                  const result = await response.json();

                  if (result.success) {
                        setStatus(result.data);
                        setIsBuilding(result.data.buildProgress?.isRunning || false);
                  } else {
                        setError(result.error);
                  }
            } catch (err) {
                  setError(err instanceof Error ? err.message : 'Erro desconhecido');
            } finally {
                  setIsLoading(false);
            }
      }, []);

      useEffect(() => {
            fetchStatus();
      }, [fetchStatus]);

      // Polling enquanto build estiver rodando
      useEffect(() => {
            if (!isBuilding) return;

            const interval = setInterval(fetchStatus, 2000);
            return () => clearInterval(interval);
      }, [isBuilding, fetchStatus]);

      const handleRefreshCurrentMonth = async () => {
            setIsRefreshing(true);
            try {
                  const response = await fetch('/api/cache/refresh', { method: 'POST' });
                  const result = await response.json();

                  if (result.success) {
                        await fetchStatus();
                  } else {
                        setError(result.error);
                  }
            } catch (err) {
                  setError(err instanceof Error ? err.message : 'Erro desconhecido');
            } finally {
                  setIsRefreshing(false);
            }
      };

      const handleStartBuild = async () => {
            setIsBuilding(true);
            try {
                  const response = await fetch('/api/cache/build', { method: 'POST' });
                  const result = await response.json();

                  if (!result.success && result.message !== 'Build já está em andamento') {
                        setError(result.error || result.message);
                        setIsBuilding(false);
                  }
            } catch (err) {
                  setError(err instanceof Error ? err.message : 'Erro desconhecido');
                  setIsBuilding(false);
            }
      };

      const getStatusBadge = (monthStatus: CacheMonthMeta['status']) => {
            switch (monthStatus) {
                  case 'completed':
                        return <Badge className="bg-green-500">Completo</Badge>;
                  case 'current':
                        return <Badge className="bg-blue-500">Atual</Badge>;
                  case 'in-progress':
                        return <Badge className="bg-yellow-500">Em progresso</Badge>;
                  case 'error':
                        return <Badge variant="destructive">Erro</Badge>;
                  default:
                        return <Badge variant="outline">Não iniciado</Badge>;
            }
      };

      const formatDate = (dateStr?: string) => {
            if (!dateStr) return '-';
            try {
                  return format(parseISO(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
            } catch {
                  return dateStr;
            }
      };

      if (isLoading) {
            return (
                  <div className="space-y-6">
                        <Skeleton className="h-8 w-64" />
                        <div className="grid gap-4 md:grid-cols-3">
                              {[...Array(3)].map((_, i) => (
                                    <Skeleton key={i} className="h-32" />
                              ))}
                        </div>
                        <Skeleton className="h-96" />
                  </div>
            );
      }

      const buildProgress = status?.buildProgress;
      const progressPercent = buildProgress
            ? (buildProgress.completedMonths / buildProgress.totalMonths) * 100
            : 0;

      return (
            <div className="space-y-6">
                  {/* Header */}
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                              <h2 className="text-2xl font-bold tracking-tight">
                                    Gerenciamento de Cache
                              </h2>
                              <p className="text-muted-foreground">
                                    Controle o cache de dados do ClickUp para melhor performance
                              </p>
                        </div>
                        <div className="flex gap-2">
                              <Button
                                    variant="outline"
                                    onClick={handleRefreshCurrentMonth}
                                    disabled={isRefreshing || isBuilding}
                              >
                                    {isRefreshing ? (
                                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                          <RefreshCw className="mr-2 h-4 w-4" />
                                    )}
                                    Atualizar Mês Atual
                              </Button>
                              <Button onClick={handleStartBuild} disabled={isBuilding}>
                                    {isBuilding ? (
                                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                          <Play className="mr-2 h-4 w-4" />
                                    )}
                                    {isBuilding ? 'Construindo...' : 'Construir Cache Histórico'}
                              </Button>
                        </div>
                  </div>

                  {/* Erro */}
                  {error && (
                        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
                              <p className="font-medium">Erro</p>
                              <p className="text-sm">{error}</p>
                        </div>
                  )}

                  {/* Cards de Status */}
                  <div className="grid gap-4 md:grid-cols-4">
                        <Card>
                              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Status</CardTitle>
                                    <Database className="h-4 w-4 text-muted-foreground" />
                              </CardHeader>
                              <CardContent>
                                    <div className="text-2xl font-bold">
                                          {status?.isInitialized ? (
                                                <span className="text-green-500">Inicializado</span>
                                          ) : (
                                                <span className="text-yellow-500">Não inicializado</span>
                                          )}
                                    </div>
                              </CardContent>
                        </Card>

                        <Card>
                              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Meses Cacheados</CardTitle>
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                              </CardHeader>
                              <CardContent>
                                    <div className="text-2xl font-bold">
                                          {status?.stats.cachedMonths || 0} / {status?.stats.totalMonths || 13}
                                    </div>
                                    <Progress
                                          value={
                                                ((status?.stats.cachedMonths || 0) /
                                                      (status?.stats.totalMonths || 13)) *
                                                100
                                          }
                                          className="mt-2 h-2"
                                    />
                              </CardContent>
                        </Card>

                        <Card>
                              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Total de Tarefas</CardTitle>
                                    <HardDrive className="h-4 w-4 text-muted-foreground" />
                              </CardHeader>
                              <CardContent>
                                    <div className="text-2xl font-bold">
                                          {status?.stats.totalTasks?.toLocaleString() || 0}
                                    </div>
                                    <p className="text-xs text-muted-foreground">em cache</p>
                              </CardContent>
                        </Card>

                        <Card>
                              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Última Atualização</CardTitle>
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                              </CardHeader>
                              <CardContent>
                                    <div className="text-lg font-bold">
                                          {formatDate(status?.stats.lastUpdated)}
                                    </div>
                              </CardContent>
                        </Card>
                  </div>

                  {/* Progress do Build */}
                  {isBuilding && buildProgress && (
                        <Card className="border-blue-500">
                              <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                          <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                                          Construindo Cache Histórico
                                    </CardTitle>
                                    <CardDescription>
                                          Processando mês: {buildProgress.currentMonth || 'Iniciando...'}
                                    </CardDescription>
                              </CardHeader>
                              <CardContent>
                                    <div className="space-y-2">
                                          <div className="flex justify-between text-sm">
                                                <span>Progresso</span>
                                                <span>
                                                      {buildProgress.completedMonths} / {buildProgress.totalMonths} meses
                                                </span>
                                          </div>
                                          <Progress value={progressPercent} className="h-3" />
                                          {buildProgress.errors.length > 0 && (
                                                <div className="mt-4">
                                                      <p className="text-sm font-medium text-destructive">Erros:</p>
                                                      <ul className="text-sm text-destructive">
                                                            {buildProgress.errors.map((err, i) => (
                                                                  <li key={i}>• {err}</li>
                                                            ))}
                                                      </ul>
                                                </div>
                                          )}
                                    </div>
                              </CardContent>
                        </Card>
                  )}

                  {/* Tabela de Meses */}
                  <Card>
                        <CardHeader>
                              <CardTitle>Meses em Cache</CardTitle>
                              <CardDescription>
                                    Status detalhado de cada mês armazenado
                              </CardDescription>
                        </CardHeader>
                        <CardContent>
                              <Table>
                                    <TableHeader>
                                          <TableRow>
                                                <TableHead>Mês</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-center">Tarefas</TableHead>
                                                <TableHead>Primeira Cache</TableHead>
                                                <TableHead>Última Atualização</TableHead>
                                                <TableHead className="text-center">Congelado</TableHead>
                                          </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                          {status?.months && status.months.length > 0 ? (
                                                status.months.map((month) => (
                                                      <TableRow key={month.month}>
                                                            <TableCell className="font-medium">
                                                                  {format(parseISO(`${month.month}-01`), 'MMMM yyyy', {
                                                                        locale: ptBR,
                                                                  })}
                                                            </TableCell>
                                                            <TableCell>{getStatusBadge(month.status)}</TableCell>
                                                            <TableCell className="text-center">
                                                                  <Badge variant="outline">{month.taskCount}</Badge>
                                                            </TableCell>
                                                            <TableCell className="text-sm text-muted-foreground">
                                                                  {formatDate(month.firstCachedAt)}
                                                            </TableCell>
                                                            <TableCell className="text-sm text-muted-foreground">
                                                                  {formatDate(month.lastUpdatedAt)}
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                  {month.isFrozen ? (
                                                                        <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                                                                  ) : (
                                                                        <Clock className="h-4 w-4 text-blue-500 mx-auto" />
                                                                  )}
                                                            </TableCell>
                                                      </TableRow>
                                                ))
                                          ) : (
                                                <TableRow>
                                                      <TableCell
                                                            colSpan={6}
                                                            className="text-center text-muted-foreground py-8"
                                                      >
                                                            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                                            <p>Nenhum mês em cache</p>
                                                            <p className="text-sm">
                                                                  Clique em &quot;Construir Cache Histórico&quot; para começar
                                                            </p>
                                                      </TableCell>
                                                </TableRow>
                                          )}
                                    </TableBody>
                              </Table>
                        </CardContent>
                  </Card>
            </div>
      );
}
