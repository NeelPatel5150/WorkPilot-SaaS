import { sendEmail } from "@/lib/email";
import { wrapBrandedEmail, escapeHtml, type BrandCompany } from "@/lib/brand-email";

export function buildEmployeeInviteEmail(opts: {
  company: BrandCompany;
  employeeName: string;
  employeeCode: string;
  email: string;
  tempPassword: string;
  acceptUrl: string;
  loginUrl: string;
}) {
  const { company, employeeName, employeeCode, email, tempPassword, acceptUrl, loginUrl } =
    opts;

  const subject = `You're invited to ${company.name}`;
  const bodyHtml = `
    <p style="margin:0 0 12px;font-size:16px;color:#0f172a;">Hi ${escapeHtml(employeeName)},</p>
    <p style="margin:0 0 18px;">
      Your employee account for <strong>${escapeHtml(company.name)}</strong> is ready.
      Use the default login below, then set your own password.
    </p>
    <table role="presentation" width="100%" style="background:${company.secondaryColor || "#EFF6FF"};border:2px solid #111827;border-radius:12px;margin:0 0 12px;">
      <tr>
        <td style="padding:16px 18px;font-size:14px;line-height:1.7;color:#0f172a;">
          <strong>Employee code:</strong> ${escapeHtml(employeeCode)}<br/>
          <strong>Email:</strong> ${escapeHtml(email)}<br/>
          <strong>Default password:</strong>
          <code style="display:inline-block;margin-top:4px;padding:4px 8px;background:#fff;border:1px solid #111827;border-radius:6px;font-weight:700;">${escapeHtml(tempPassword)}</code>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:12px;color:#64748b;">
      Or sign in at <a href="${loginUrl}" style="color:${company.primaryColor || "#2563EB"};">${escapeHtml(loginUrl)}</a>
    </p>
  `;

  const html = wrapBrandedEmail({
    company,
    title: `Welcome to ${company.name}`,
    bodyHtml,
    ctaLabel: "Accept & set new password",
    ctaUrl: acceptUrl,
  });

  return { subject, html };
}

export async function sendEmployeeInviteEmail(opts: {
  companyId: string;
  company: BrandCompany & { slug: string; customDomain?: string | null };
  employeeName: string;
  employeeCode: string;
  email: string;
  tempPassword: string;
}) {
  const { getTenantAcceptUrl, getTenantLoginUrl } = await import("@/lib/tenant-url");
  const acceptUrl = getTenantAcceptUrl(opts.company, opts.email);
  const loginUrl = getTenantLoginUrl(opts.company);
  const { subject, html } = buildEmployeeInviteEmail({
    company: { ...opts.company, id: opts.companyId },
    employeeName: opts.employeeName,
    employeeCode: opts.employeeCode,
    email: opts.email,
    tempPassword: opts.tempPassword,
    acceptUrl,
    loginUrl,
  });

  return sendEmail({
    companyId: opts.companyId,
    to: opts.email,
    subject,
    html,
  });
}
