'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
      LayoutDashboard,
      Users,
      Tags,
      RefreshCw,
      Database,
} from 'lucide-react';

import {
      Sidebar,
      SidebarContent,
      SidebarFooter,
      SidebarGroup,
      SidebarGroupContent,
      SidebarGroupLabel,
      SidebarHeader,
      SidebarMenu,
      SidebarMenuButton,
      SidebarMenuItem,
      SidebarProvider,
      SidebarInset,
      SidebarTrigger,
} from '@/components/ui/sidebar';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CacheStatusDrawer } from '@/components/dashboard/cache-status-drawer';

const menuItems = [
      {
            title: 'Visão Geral',
            url: '/dashboard',
            icon: LayoutDashboard,
      },
      {
            title: 'Por Responsável',
            url: '/dashboard/responsaveis',
            icon: Users,
      },
      {
            title: 'Por Departamento',
            url: '/dashboard/departamentos',
            icon: Tags,
      },
      {
            title: 'Cache',
            url: '/dashboard/cache',
            icon: Database,
      },
];

interface DashboardSidebarProps {
      children: React.ReactNode;
      onRefresh?: () => void;
      isLoading?: boolean;
}

export function DashboardSidebar({
      children,
      onRefresh,
      isLoading,
}: DashboardSidebarProps) {
      const pathname = usePathname();

      return (
            <SidebarProvider>
                  <Sidebar>
                        <SidebarHeader className="p-4">
                              <Link href="/dashboard" className="flex items-center gap-2">
                                    <Image
                                          src="/logo.svg"
                                          alt="RedPeak"
                                          width={40}
                                          height={40}
                                          className="rounded"
                                    />
                                    <span className="font-semibold text-lg">RedPeak</span>
                              </Link>
                        </SidebarHeader>

                        <SidebarContent>
                              <SidebarGroup>
                                    <SidebarGroupLabel>Dashboard</SidebarGroupLabel>
                                    <SidebarGroupContent>
                                          <SidebarMenu>
                                                {menuItems.map((item) => (
                                                      <SidebarMenuItem key={item.title}>
                                                            <SidebarMenuButton
                                                                  asChild
                                                                  isActive={pathname === item.url}
                                                            >
                                                                  <Link href={item.url}>
                                                                        <item.icon className="h-4 w-4" />
                                                                        <span>{item.title}</span>
                                                                  </Link>
                                                            </SidebarMenuButton>
                                                      </SidebarMenuItem>
                                                ))}
                                          </SidebarMenu>
                                    </SidebarGroupContent>
                              </SidebarGroup>
                        </SidebarContent>

                        <SidebarFooter className="p-4">
                              <div className="flex items-center justify-between">
                                    <ThemeToggle />
                                    <CacheStatusDrawer />
                                    {onRefresh && (
                                          <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={onRefresh}
                                                disabled={isLoading}
                                          >
                                                <RefreshCw
                                                      className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
                                                />
                                                <span className="sr-only">Atualizar dados</span>
                                          </Button>
                                    )}
                              </div>
                        </SidebarFooter>
                  </Sidebar>

                  <SidebarInset>
                        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
                              <SidebarTrigger className="-ml-1" />
                              <Separator orientation="vertical" className="mr-2 h-4" />
                              <div className="flex-1">
                                    <h1 className="text-lg font-semibold">
                                          {menuItems.find((item) => item.url === pathname)?.title ||
                                                'Dashboard'}
                                    </h1>
                              </div>
                        </header>

                        <main className="flex-1 overflow-auto p-6">{children}</main>
                  </SidebarInset>
            </SidebarProvider>
      );
}
