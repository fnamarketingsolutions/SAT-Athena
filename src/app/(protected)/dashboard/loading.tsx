export default function DashboardLoading() {
  return (
    <div className="dashboard-surface fixed inset-0 z-50 flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
    </div>
  );
}
