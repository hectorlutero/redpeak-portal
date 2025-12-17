'use client';

import { useState, useEffect, useCallback } from 'react';
import {
      Database,
      CheckCircle2,
      Clock,
      AlertCircle,
      Loader2,
      RefreshCw,
      X,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
      Sheet,
      SheetContent,
      SheetDescription,
      SheetHeader,
      SheetTitle,
      SheetTrigger,
} from '@/components/ui/sheet';
import { type CacheStatusResponse } from '@/types/cache';

interface CacheStatusDrawerProps {
      onRefresh?: () => void;
}

export function CacheStatusDrawer({ onRefresh }: CacheStatusDrawerProps) {
      const [isOpen, setIsOpen] = useState(false);
      const [status, setStatus] = useState<CacheStatusResponse | null>(null);
      const [isLoading, setIsLoading] = useState(false);
      const [isRefreshing, setIsRefreshing] = useState(false);

      const fetchStatus = useCallback(async () => {
            setIsLoading(true);
            try {
                  const response = await fetch('/api/cache/status');
                  const result = await response.json();
                  if (result.success) {
                        setStatus(result.data);
                  }
            } catch (error) {
                  console.error('Erro ao buscar status:', error);
            } finally {
                  setIsLoading(false);
            }
      }, []);

      useEffect(() => {
            if (isOpen) {
                  fetchStatus();
            }
      }, [isOpen, fetchStatus]);

      // Polling se build estiver rodando
      useEffect(() => {
            if (!isOpen || !status?.buildProgress?.isRunning) return;

            const interval = setInterval(fetchStatus, 2000);
            return () => clearInterval(interval);
      }, [isOpen, status?.buildProgress?.isRunning, fetchStatus]);

      const handleRefresh = async () => {
            setIsRefreshing(true);
            try {
                  await fetch('/api/cache/refresh', { method: 'POST' });
                  await fetchStatus();
                  onRefresh?.();
            } catch (error) {
                  console.error('Erro ao atualizar cache:', error);
            } finally {
                  setIsRefreshing(false);
            }
      };

      const getStatusIcon = () => {
            if (isLoading) {
                  return <Loader2 className="h-4 w-4 animate-spin" />;
            }
            if (status?.buildProgress?.isRunning) {
                  return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
            }
            if (status?.isInitialized) {
                  return <CheckCircle2 className="h-4 w-4 text-green-500" />;
            }
            return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      };

      const progressPercent = status?.buildProgress
            ? (status.buildProgress.completedMonths / status.buildProgress.totalMonths) * 100
            : (status?.stats.cachedMonths || 0) / (status?.stats.totalMonths || 13) * 100;

      return (
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                  <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="relative">
                              <Database className="h-4 w-4" />
                              {status?.buildProgress?.isRunning && (
                                    <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-blue-500 animate-pulse" />
                              )}
                        </Button>
                  </SheetTrigger>
                  <SheetContent>
                        <SheetHeader>
                              <SheetTitle className="flex items-center gap-2">
                                    {getStatusIcon()}
                                    Status do Cache
                              </SheetTitle>
                              <SheetDescription>
                                    Visualize e controle o cache de dados
                              </SheetDescription>
                        </SheetHeader>

                        <div className="mt-6 space-y-6">
                              {/* Status Geral */}
                              <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                          <span className="text-sm font-medium">Status</span>
                                          <Badge variant={status?.isInitialized ? 'default' : 'outline'}>
                                                {status?.isInitialized ? 'Inicializado' : 'Não inicializado'}
                                          </Badge>
                                    </div>

                                    <div className="flex items-center justify-between">
                                          <span className="text-sm font-medium">Meses em cache</span>
                                          <span className="text-sm">
                                                {status?.stats.cachedMonths || 0} / {status?.stats.totalMonths || 13}
                                          </span>
                                    </div>

                                    <Progress value={progressPercent} className="h-2" />

                                    <div className="flex items-center justify-between">
                                          <span className="text-sm font-medium">Tarefas em cache</span>
                                          <span className="text-sm">
                                                {status?.stats.totalTasks?.toLocaleString() || 0}
                                          </span>
                                    </div>

                                    {status?.stats.lastUpdated && (
                                          <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium">Última atualização</span>
                                                <span className="text-sm text-muted-foreground">
                                                      {format(parseISO(status.stats.lastUpdated), "dd/MM HH:mm", {
                                                            locale: ptBR,
                                                      })}
                                                </span>
                                          </div>
                                    )}
                              </div>

                              {/* Build Progress */}
                              {status?.buildProgress?.isRunning && (
                                    <div className="rounded-lg border border-blue-500 bg-blue-500/10 p-4 space-y-2">
                                          <div className="flex items-center gap-2">
                                                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                                                <span className="font-medium text-blue-500">
                                                      Construindo cache...
                                                </span>
                                          </div>
                                          <p className="text-sm text-muted-foreground">
                                                Processando: {status.buildProgress.currentMonth || 'Iniciando'}
                                          </p>
                                          <Progress
                                                value={
                                                      (status.buildProgress.completedMonths /
                                                            status.buildProgress.totalMonths) *
                                                      100
                                                }
                                                className="h-2"
                                          />
                                          <p className="text-xs text-muted-foreground">
                                                {status.buildProgress.completedMonths} de{' '}
                                                {status.buildProgress.totalMonths} meses
                                          </p>
                                    </div>
                              )}

                              {/* Meses Recentes */}
                              {status?.months && status.months.length > 0 && (
                                    <div className="space-y-2">
                                          <span className="text-sm font-medium">Meses em cache</span>
                                          <div className="space-y-1 max-h-48 overflow-y-auto">
                                                {status.months.slice(0, 6).map((month) => (
                                                      <div
                                                            key={month.month}
                                                            className="flex items-center justify-between py-1 px-2 rounded hover:bg-muted"
                                                      >
                                                            <div className="flex items-center gap-2">
                                                                  {month.isFrozen ? (
                                                                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                                                                  ) : (
                                                                        <Clock className="h-3 w-3 text-blue-500" />
                                                                  )}
                                                                  <span className="text-sm">
                                                                        {format(parseISO(`${month.month}-01`), 'MMM/yy', {
                                                                              locale: ptBR,
                                                                        })}
                                                                  </span>
                                                            </div>
                                                            <Badge variant="outline" className="text-xs">
                                                                  {month.taskCount}
                                                            </Badge>
                                                      </div>
                                                ))}
                                          </div>
                                    </div>
                              )}

                              {/* Ações */}
                              <div className="flex gap-2">
                                    <Button
                                          variant="outline"
                                          className="flex-1"
                                          onClick={handleRefresh}
                                          disabled={isRefreshing || status?.buildProgress?.isRunning}
                                    >
                                          {isRefreshing ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                          ) : (
                                                <RefreshCw className="mr-2 h-4 w-4" />
                                          )}
                                          Atualizar
                                    </Button>
                                    <Button
                                          variant="default"
                                          className="flex-1"
                                          onClick={() => {
                                                setIsOpen(false);
                                                window.location.href = '/dashboard/cache';
                                          }}
                                    >
                                          Gerenciar
                                    </Button>
                              </div>
                        </div>
                  </SheetContent>
            </Sheet>
      );
}
