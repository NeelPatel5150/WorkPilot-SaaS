import { PageSkeleton } from "@/components/shared/page-skeleton";

/** Covers employee list-style routes under /employee/* */
export default function EmployeeLoading() {
  return <PageSkeleton variant="list" />;
}
