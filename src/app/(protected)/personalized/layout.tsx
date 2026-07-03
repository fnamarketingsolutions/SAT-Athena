import { APP_BRANDING } from "@/lib/exam-config";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `Personalized Practice — ${APP_BRANDING.shortName}`,
  description: `Paste your bar prep notes and get matched bar exam multiple-choice practice from ${APP_BRANDING.examLabel}.`,
};

export default function PersonalizedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
