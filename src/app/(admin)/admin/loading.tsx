import { PageSkeleton } from "@/components/shared/page-skeleton";

/**
 * Shown instantly while the next admin page Server Component loads.
 * Layout (sidebar/header) stays mounted — only main content swaps to this.
 */
export default function AdminLoading() {
  return <PageSkeleton variant="dashboard" />;
}
