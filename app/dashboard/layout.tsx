'use client';

import { useState, useCallback } from 'react';
import { DashboardSidebar } from '@/components/dashboard/sidebar';

export default function DashboardLayout({
      children,
}: {
      children: React.ReactNode;
}) {
      const [isLoading, setIsLoading] = useState(false);

      const handleRefresh = useCallback(() => {
            setIsLoading(true);
            // Trigger a page refresh or data refetch
            window.location.reload();
      }, []);

      return (
            <DashboardSidebar onRefresh={handleRefresh} isLoading={isLoading}>
                  {children}
            </DashboardSidebar>
      );
}
