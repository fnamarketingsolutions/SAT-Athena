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
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const learnerNavItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/quest", label: "Daily Quest", icon: Swords },
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