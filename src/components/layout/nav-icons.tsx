"use client";

import {
  LayoutDashboard,
  Users,
  Building2,
  Clock,
  CalendarDays,
  BarChart3,
  Settings,
  UserRound,
  FileText,
  Bell,
  PartyPopper,
  Megaphone,
  CircleHelp,
  type LucideIcon,
} from "lucide-react";
import type { NavIconName } from "@/config/nav";

export const navIcons: Record<NavIconName, LucideIcon> = {
  dashboard: LayoutDashboard,
  users: Users,
  building: Building2,
  clock: Clock,
  calendar: CalendarDays,
  chart: BarChart3,
  settings: Settings,
  user: UserRound,
  file: FileText,
  bell: Bell,
  party: PartyPopper,
  megaphone: Megaphone,
  help: CircleHelp,
};
