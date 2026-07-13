export function AuthBrandHeader({
  brand,
  fallbackTitle,
}: {
  brand: {
    name: string;
    logoUrl: string | null;
    companyId: string;
  } | null;
  fallbackTitle: string;
}) {
  if (!brand) {
    return (
      <div className="mb-4">
        <p className="whitespace-nowrap text-[8px] font-bold uppercase tracking-wide text-[var(--muted-foreground)]">
          Powered by WorkPilot
        </p>
        <h1 className="mt-1 text-2xl font-black">{fallbackTitle}</h1>
      </div>
    );
  }

  const logoSrc = brand.logoUrl
    ? `/api/brand/icon?kind=logo&companyId=${brand.companyId}`
    : null;

  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-[var(--border)] bg-white shadow-[3px_3px_0_0_var(--border)]">
        {logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoSrc} alt={brand.name} className="h-full w-full object-contain p-1" />
        ) : (
          <span className="text-lg font-black text-[var(--primary)]">
            {brand.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
          {brand.name}
        </p>
        <h1 className="text-xl font-black leading-tight">{fallbackTitle}</h1>
        <p className="whitespace-nowrap text-[8px] font-semibold text-[var(--muted-foreground)]">
          Powered by WorkPilot
        </p>
      </div>
    </div>
  );
}
