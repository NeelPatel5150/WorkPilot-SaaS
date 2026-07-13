import { cn } from "@/lib/utils";

/** Initials from first + last name (e.g. King Patel → KP). */
export function nameInitials(firstName?: string | null, lastName?: string | null, fallback = "?") {
  const a = (firstName || "").trim().charAt(0);
  const b = (lastName || "").trim().charAt(0);
  const initials = `${a}${b}`.toUpperCase();
  if (initials) return initials;
  const single = (firstName || lastName || "").trim().charAt(0);
  return single ? single.toUpperCase() : fallback;
}

export function UserAvatar({
  image,
  firstName,
  lastName,
  size = "md",
  className,
}: {
  image?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClass =
    size === "sm" ? "h-8 w-8 text-[10px]" : size === "lg" ? "h-12 w-12 text-sm" : "h-10 w-10 text-xs";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--border)] bg-[var(--secondary)] font-black shadow-[2px_2px_0_0_var(--border)]",
        sizeClass,
        className
      )}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="h-full w-full object-cover" />
      ) : (
        nameInitials(firstName, lastName)
      )}
    </span>
  );
}
