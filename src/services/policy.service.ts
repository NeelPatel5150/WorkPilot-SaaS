import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/session";
import type { UserRole } from "@/generated/prisma";

export type WorkPolicy = {
  workStartHour: number;
  workStartMinute: number;
  graceMinutes: number;
  standardHours: number;
  weeklyOffs: number[];
  officeLat: number | null;
  officeLng: number | null;
  geofenceRadiusM: number;
  officeIpAllowlist: string | null;
  timezone: string;
};

const DEFAULT_OFFS = [0];

export async function getWorkPolicy(companyId: string): Promise<WorkPolicy> {
  const c = await prisma.company.findUniqueOrThrow({ where: { id: companyId } });
  const offs = Array.isArray(c.weeklyOffs)
    ? (c.weeklyOffs as number[])
    : DEFAULT_OFFS;
  return {
    workStartHour: c.workStartHour,
    workStartMinute: c.workStartMinute,
    graceMinutes: c.graceMinutes,
    standardHours: c.standardHours,
    weeklyOffs: offs.map(Number),
    officeLat: c.officeLat,
    officeLng: c.officeLng,
    geofenceRadiusM: c.geofenceRadiusM,
    officeIpAllowlist: c.officeIpAllowlist,
    timezone: c.timezone,
  };
}

export async function updateWorkPolicy(
  actor: { companyId: string; role: UserRole },
  patch: Partial<{
    workStartHour: number;
    workStartMinute: number;
    graceMinutes: number;
    standardHours: number;
    weeklyOffs: number[];
    officeLat: number | null;
    officeLng: number | null;
    geofenceRadiusM: number;
    officeIpAllowlist: string | null;
  }>
) {
  assertPermission(actor.role, "settings:manage");
  return prisma.company.update({
    where: { id: actor.companyId },
    data: {
      ...patch,
      weeklyOffs: patch.weeklyOffs ?? undefined,
    },
  });
}

export function isWeeklyOff(policy: WorkPolicy, date: Date) {
  // Use UTC day for stored @db.Date consistency
  const day = date.getUTCDay();
  return policy.weeklyOffs.includes(day);
}

export function isLatePunch(policy: WorkPolicy, when: Date) {
  const startMins = policy.workStartHour * 60 + policy.workStartMinute + policy.graceMinutes;
  const punchMins = when.getHours() * 60 + when.getMinutes();
  return punchMins > startMins;
}

/** Haversine distance in meters */
export function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function ipAllowed(policy: WorkPolicy, ip?: string | null) {
  if (!policy.officeIpAllowlist?.trim()) return true;
  if (!ip) return false;
  const clean = ip.split(",")[0]?.trim() ?? "";
  return policy.officeIpAllowlist
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .some((prefix) => clean === prefix || clean.startsWith(prefix));
}
