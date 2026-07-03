import { APP_BRANDING } from "@/lib/exam-config";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `Profile — ${APP_BRANDING.shortName}`,
  description: `Your ${APP_BRANDING.examLabel} prep profile, accuracy, streaks, and progress.`,
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
