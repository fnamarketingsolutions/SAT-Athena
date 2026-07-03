import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";
import { APP_BRANDING } from "@/lib/exam-config";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `Analytics — ${APP_BRANDING.shortName}`,
  description: `Track your ${APP_BRANDING.examLabel} practice accuracy, subject mastery, and study consistency.`,
};

export default function AnalyticsPage() {
  return <AnalyticsDashboard />;
}