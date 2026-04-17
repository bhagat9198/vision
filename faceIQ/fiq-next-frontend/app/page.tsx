import { AppLayout } from "@/components/layout/app-layout";
import { HealthStatus } from "@/components/dashboard/health-status";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { CollectionInsights } from "@/components/dashboard/collection-insights";

export default function DashboardPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor your img-analyse-backend services
          </p>
        </div>

        <StatsCards />
        <CollectionInsights />
        <HealthStatus />
      </div>
    </AppLayout>
  );
}
