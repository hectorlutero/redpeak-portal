'use client';

import { useState } from 'react';
import { FileSpreadsheet, FileText, Download, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { Button } from '@/components/ui/button';
import {
      DropdownMenu,
      DropdownMenuContent,
      DropdownMenuItem,
      DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
      type TaskStats,
      type MonthlyEvolution,
      STATUS_CATEGORY_LABELS,
} from '@/types/clickup';

interface ExportButtonsProps {
      data: {
            stats: TaskStats;
            evolution: MonthlyEvolution[];
      } | null;
      dateRange: {
            from: Date;
            to: Date;
      };
      chartsContainerId?: string;
}

// Cores para os gráficos no PDF (RGB)
const CHART_COLORS = {
      inactive: [239, 68, 68],    // Vermelho
      active: [34, 211, 238],     // Ciano
      done: [168, 85, 247],       // Roxo
      closed: [34, 197, 94],      // Verde
      created: [59, 130, 246],    // Azul
} as const;

export function ExportButtons({
      data,
      dateRange,
}: ExportButtonsProps) {
      const [isExporting, setIsExporting] = useState<'excel' | 'pdf' | null>(null);

      const formatDateRange = () => {
            return `${format(dateRange.from, 'dd-MM-yyyy', { locale: ptBR })}_${format(dateRange.to, 'dd-MM-yyyy', { locale: ptBR })}`;
      };

      const exportToExcel = async () => {
            if (!data) return;

            setIsExporting('excel');

            try {
                  const wb = XLSX.utils.book_new();

                  // Aba 1: Resumo (KPIs)
                  const summaryData = [
                        ['Dashboard de Produtividade - RedPeak'],
                        [`Período: ${format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR })} a ${format(dateRange.to, 'dd/MM/yyyy', { locale: ptBR })}`],
                        [''],
                        ['Métrica', 'Valor'],
                        ['Total de Tarefas', data.stats.total],
                        ['Taxa de Conclusão', `${data.stats.completionRate.toFixed(1)}%`],
                        ['Tarefas Inativas', data.stats.byCategory.inactive],
                        ['Tarefas Ativas', data.stats.byCategory.active],
                        ['Tarefas Feitas', data.stats.byCategory.done],
                        ['Tarefas Fechadas', data.stats.byCategory.closed],
                  ];
                  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
                  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo');

                  // Aba 2: Por Responsável
                  const assigneeData = [
                        ['Responsável', 'Email', 'Total', 'Inativas', 'Ativas', 'Feitas', 'Fechadas', 'Taxa de Conclusão'],
                        ...data.stats.byAssignee.map((a) => [
                              a.username,
                              a.email,
                              a.total,
                              a.byCategory.inactive,
                              a.byCategory.active,
                              a.byCategory.done,
                              a.byCategory.closed,
                              `${a.completionRate.toFixed(1)}%`,
                        ]),
                  ];
                  const wsAssignee = XLSX.utils.aoa_to_sheet(assigneeData);
                  XLSX.utils.book_append_sheet(wb, wsAssignee, 'Por Responsável');

                  // Aba 3: Por Departamento (Tags)
                  const tagData = [
                        ['Departamento', 'Total', 'Inativas', 'Ativas', 'Feitas', 'Fechadas', 'Taxa de Conclusão'],
                        ...data.stats.byTag.map((t) => [
                              t.name,
                              t.total,
                              t.byCategory.inactive,
                              t.byCategory.active,
                              t.byCategory.done,
                              t.byCategory.closed,
                              `${t.completionRate.toFixed(1)}%`,
                        ]),
                  ];
                  const wsTag = XLSX.utils.aoa_to_sheet(tagData);
                  XLSX.utils.book_append_sheet(wb, wsTag, 'Por Departamento');

                  // Aba 4: Evolução Mensal
                  const evolutionData = [
                        ['Mês', 'Criadas', 'Concluídas', 'Saldo (Abertas)'],
                        ...data.evolution.map((e) => [e.label, e.created, e.closed, e.total]),
                  ];
                  const wsEvolution = XLSX.utils.aoa_to_sheet(evolutionData);
                  XLSX.utils.book_append_sheet(wb, wsEvolution, 'Evolução Mensal');

                  // Aba 5: Por Status Detalhado
                  const statusData = [
                        ['Status', 'Quantidade'],
                        ...Object.entries(data.stats.byStatus).map(([status, count]) => [
                              status,
                              count,
                        ]),
                  ];
                  const wsStatus = XLSX.utils.aoa_to_sheet(statusData);
                  XLSX.utils.book_append_sheet(wb, wsStatus, 'Por Status');

                  // Salvar arquivo
                  XLSX.writeFile(wb, `redpeak-dashboard_${formatDateRange()}.xlsx`);
            } catch (error) {
                  console.error('Erro ao exportar Excel:', error);
            } finally {
                  setIsExporting(null);
            }
      };

      const exportToPDF = async () => {
            if (!data) return;

            setIsExporting('pdf');

            try {
                  const pdf = new jsPDF('p', 'mm', 'a4');
                  const pageWidth = pdf.internal.pageSize.getWidth();
                  let yPosition = 20;

                  // Título
                  pdf.setFontSize(18);
                  pdf.setFont('helvetica', 'bold');
                  pdf.text('Dashboard de Produtividade - RedPeak', pageWidth / 2, yPosition, {
                        align: 'center',
                  });

                  yPosition += 10;
                  pdf.setFontSize(12);
                  pdf.setFont('helvetica', 'normal');
                  pdf.text(
                        `Período: ${format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR })} a ${format(dateRange.to, 'dd/MM/yyyy', { locale: ptBR })}`,
                        pageWidth / 2,
                        yPosition,
                        { align: 'center' }
                  );

                  yPosition += 15;

                  // KPIs em tabela
                  pdf.setFontSize(14);
                  pdf.setFont('helvetica', 'bold');
                  pdf.text('Resumo de KPIs', 14, yPosition);
                  yPosition += 5;

                  autoTable(pdf, {
                        startY: yPosition,
                        head: [['Métrica', 'Valor']],
                        body: [
                              ['Total de Tarefas', data.stats.total.toString()],
                              ['Taxa de Conclusão', `${data.stats.completionRate.toFixed(1)}%`],
                              ['Tarefas Inativas', data.stats.byCategory.inactive.toString()],
                              ['Tarefas Ativas', data.stats.byCategory.active.toString()],
                              ['Tarefas Feitas', data.stats.byCategory.done.toString()],
                              ['Tarefas Fechadas', data.stats.byCategory.closed.toString()],
                        ],
                        theme: 'striped',
                        headStyles: { fillColor: [195, 50, 62] }, // Cor RedPeak
                  });

                  yPosition = (pdf as any).lastAutoTable.finalY + 15;

                  // Gráfico de barras - Tarefas por Categoria
                  pdf.setFontSize(14);
                  pdf.setFont('helvetica', 'bold');
                  pdf.text('Tarefas por Categoria', 14, yPosition);
                  yPosition += 10;

                  const categories = [
                        { key: 'inactive', label: STATUS_CATEGORY_LABELS.inactive, value: data.stats.byCategory.inactive, color: CHART_COLORS.inactive },
                        { key: 'active', label: STATUS_CATEGORY_LABELS.active, value: data.stats.byCategory.active, color: CHART_COLORS.active },
                        { key: 'done', label: STATUS_CATEGORY_LABELS.done, value: data.stats.byCategory.done, color: CHART_COLORS.done },
                        { key: 'closed', label: STATUS_CATEGORY_LABELS.closed, value: data.stats.byCategory.closed, color: CHART_COLORS.closed },
                  ];

                  const maxValue = Math.max(...categories.map(c => c.value), 1);
                  const barHeight = 8;
                  const barMaxWidth = 100;
                  const labelWidth = 30;

                  categories.forEach((cat) => {
                        // Label
                        pdf.setFontSize(10);
                        pdf.setFont('helvetica', 'normal');
                        pdf.text(cat.label, 14, yPosition + 5);

                        // Barra
                        const barWidth = (cat.value / maxValue) * barMaxWidth;
                        pdf.setFillColor(cat.color[0], cat.color[1], cat.color[2]);
                        pdf.rect(14 + labelWidth, yPosition, barWidth, barHeight, 'F');

                        // Valor
                        pdf.setFontSize(9);
                        pdf.text(cat.value.toString(), 14 + labelWidth + barWidth + 3, yPosition + 5.5);

                        yPosition += barHeight + 4;
                  });

                  yPosition += 10;

                  // Tabela de Evolução Mensal com mini-gráfico
                  if (yPosition > pdf.internal.pageSize.getHeight() - 80) {
                        pdf.addPage();
                        yPosition = 20;
                  }

                  pdf.setFontSize(14);
                  pdf.setFont('helvetica', 'bold');
                  pdf.text('Evolução Mensal', 14, yPosition);
                  yPosition += 5;

                  autoTable(pdf, {
                        startY: yPosition,
                        head: [['Mês', 'Criadas', 'Concluídas', 'Saldo']],
                        body: data.evolution.map((e) => [
                              e.label,
                              e.created.toString(),
                              e.closed.toString(),
                              e.total.toString(),
                        ]),
                        theme: 'striped',
                        headStyles: { fillColor: [195, 50, 62] },
                  });

                  yPosition = (pdf as any).lastAutoTable.finalY + 15;

                  // Nova página para tabelas detalhadas
                  pdf.addPage();
                  yPosition = 20;

                  // Ranking por Responsável
                  pdf.setFontSize(14);
                  pdf.setFont('helvetica', 'bold');
                  pdf.text('Ranking por Responsável', 14, yPosition);
                  yPosition += 5;

                  autoTable(pdf, {
                        startY: yPosition,
                        head: [['#', 'Responsável', 'Total', 'Concluídas', 'Taxa']],
                        body: data.stats.byAssignee
                              .sort((a, b) => b.completionRate - a.completionRate)
                              .map((a, i) => [
                                    (i + 1).toString(),
                                    a.username,
                                    a.total.toString(),
                                    a.byCategory.closed.toString(),
                                    `${a.completionRate.toFixed(0)}%`,
                              ]),
                        theme: 'striped',
                        headStyles: { fillColor: [195, 50, 62] },
                  });

                  yPosition = (pdf as any).lastAutoTable.finalY + 15;

                  // Por Departamento
                  if (data.stats.byTag.length > 0) {
                        // Verificar se precisa de nova página
                        if (yPosition > pdf.internal.pageSize.getHeight() - 60) {
                              pdf.addPage();
                              yPosition = 20;
                        }

                        pdf.setFontSize(14);
                        pdf.setFont('helvetica', 'bold');
                        pdf.text('Por Departamento', 14, yPosition);
                        yPosition += 5;

                        autoTable(pdf, {
                              startY: yPosition,
                              head: [['Departamento', 'Total', 'Concluídas', 'Taxa']],
                              body: data.stats.byTag.map((t) => [
                                    t.name,
                                    t.total.toString(),
                                    t.byCategory.closed.toString(),
                                    `${t.completionRate.toFixed(0)}%`,
                              ]),
                              theme: 'striped',
                              headStyles: { fillColor: [195, 50, 62] },
                        });

                        yPosition = (pdf as any).lastAutoTable.finalY + 15;
                  }

                  // Evolução Mensal
                  if (yPosition > pdf.internal.pageSize.getHeight() - 60) {
                        pdf.addPage();
                        yPosition = 20;
                  }

                  pdf.setFontSize(14);
                  pdf.setFont('helvetica', 'bold');
                  pdf.text('Evolução Mensal', 14, yPosition);
                  yPosition += 5;

                  autoTable(pdf, {
                        startY: yPosition,
                        head: [['Mês', 'Criadas', 'Concluídas', 'Saldo']],
                        body: data.evolution.map((e) => [
                              e.label,
                              e.created.toString(),
                              e.closed.toString(),
                              e.total.toString(),
                        ]),
                        theme: 'striped',
                        headStyles: { fillColor: [195, 50, 62] },
                  });

                  // Rodapé
                  const pageCount = pdf.getNumberOfPages();
                  for (let i = 1; i <= pageCount; i++) {
                        pdf.setPage(i);
                        pdf.setFontSize(10);
                        pdf.setFont('helvetica', 'normal');
                        pdf.text(
                              `Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} - Página ${i} de ${pageCount}`,
                              pageWidth / 2,
                              pdf.internal.pageSize.getHeight() - 10,
                              { align: 'center' }
                        );
                  }

                  // Salvar arquivo
                  pdf.save(`redpeak-dashboard_${formatDateRange()}.pdf`);
            } catch (error) {
                  console.error('Erro ao exportar PDF:', error);
            } finally {
                  setIsExporting(null);
            }
      };

      const isDisabled = !data || isExporting !== null;

      return (
            <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                        <Button variant="outline" disabled={isDisabled}>
                              {isExporting ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                    <Download className="mr-2 h-4 w-4" />
                              )}
                              Exportar
                        </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={exportToExcel} disabled={isExporting !== null}>
                              <FileSpreadsheet className="mr-2 h-4 w-4" />
                              Excel (.xlsx)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={exportToPDF} disabled={isExporting !== null}>
                              <FileText className="mr-2 h-4 w-4" />
                              PDF com Gráficos
                        </DropdownMenuItem>
                  </DropdownMenuContent>
            </DropdownMenu>
      );
}
