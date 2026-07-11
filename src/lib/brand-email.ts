import { getPublicBrandIconUrl } from "@/lib/tenant-url";

export type BrandCompany = {
  id?: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string | null;
};

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Shared neo-brutal branded email shell for all company notifications. */
export function wrapBrandedEmail(opts: {
  company: BrandCompany;
  title: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
}) {
  const { company, title, bodyHtml, ctaLabel, ctaUrl } = opts;
  const primary = company.primaryColor || "#2563EB";
  const secondary = company.secondaryColor || "#EFF6FF";
  const logoSrc =
    company.id
      ? getPublicBrandIconUrl(company.id, "logo")
      : company.logoUrl?.startsWith("http")
        ? company.logoUrl
        : null;
  const logo = logoSrc
    ? `<img src="${logoSrc}" alt="${escapeHtml(company.name)}" height="40" style="height:40px;max-width:180px;object-fit:contain;margin-bottom:12px;" />`
    : "";

  const cta =
    ctaLabel && ctaUrl
      ? `<a href="${ctaUrl}" style="display:inline-block;margin-top:8px;background:${primary};color:#ffffff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:10px;border:2px solid #111827;box-shadow:3px 3px 0 0 #111827;">${escapeHtml(ctaLabel)}</a>`
      : "";

  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:${secondary};font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${secondary};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border:2px solid #111827;border-radius:16px;overflow:hidden;box-shadow:6px 6px 0 0 #111827;">
          <tr>
            <td style="background:linear-gradient(135deg,${primary},${primary}cc);padding:24px 28px;color:#ffffff;">
              ${logo}
              <p style="margin:0;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;opacity:0.9;">${escapeHtml(company.name)}</p>
              <h1 style="margin:8px 0 0;font-size:22px;line-height:1.25;">${escapeHtml(title)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;font-size:14px;line-height:1.55;color:#334155;">
              ${bodyHtml}
              ${cta}
            </td>
          </tr>
          <tr>
            <td style="padding:14px 28px 22px;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;">
              ${escapeHtml(company.name)} · Powered by WorkPilot
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
