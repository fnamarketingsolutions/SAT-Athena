import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  BarChart3,
  User,
  Swords,
  MessageCircle,
  Settings,
  ClipboardList,
} from "lucide-react";
import { MOCK_EXAM_ROUTE } from "@/lib/exam-config";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const learnerNavItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/quest", label: "Daily Quest", icon: Swords },
  { href: MOCK_EXAM_ROUTE, label: "Mock Exam", icon: ClipboardList },
  { href: "/learning", label: "Learning", icon: GraduationCap },
  { href: "/queue", label: "My Queue", icon: BookOpen },
  { href: "/mentor", label: "Mentor", icon: MessageCircle },
  { href: "/profile", label: "Profile", icon: User },
];

export const adminNavItem: NavItem = {
  href: "/studio/admin/overview",
  label: "Admin",
  icon: Settings,
};