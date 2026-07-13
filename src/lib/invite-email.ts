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
  const primary = company.primaryColor || "#2563EB";
  const secondary = company.secondaryColor || "#EFF6FF";

  const subject = `You're invited to join ${company.name}`;
  const bodyHtml = `
    <p style="margin:0 0 14px;font-size:16px;color:#0f172a;">
      Hi <strong>${escapeHtml(employeeName)}</strong>,
    </p>
    <p style="margin:0 0 18px;">
      <strong>${escapeHtml(company.name)}</strong> has invited you to WorkPilot.
      Click the button below to accept your invite and set your password. That is all you need to start.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 22px;">
      <tr>
        <td align="center">
          <a href="${acceptUrl}"
             style="display:inline-block;background:${primary};color:#ffffff;text-decoration:none;font-weight:800;font-size:15px;padding:14px 28px;border-radius:12px;border:2px solid #111827;box-shadow:4px 4px 0 0 #111827;">
            Accept invite &amp; set password
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">
      Your account details
    </p>
    <table role="presentation" width="100%" style="background:${secondary};border:2px solid #111827;border-radius:12px;margin:0 0 16px;">
      <tr>
        <td style="padding:16px 18px;font-size:14px;line-height:1.8;color:#0f172a;">
          <div><strong>Company:</strong> ${escapeHtml(company.name)}</div>
          <div><strong>Employee code:</strong> ${escapeHtml(employeeCode)}</div>
          <div><strong>Email:</strong> ${escapeHtml(email)}</div>
          <div>
            <strong>Default password:</strong>
            <code style="display:inline-block;margin-left:4px;padding:3px 8px;background:#fff;border:1px solid #111827;border-radius:6px;font-weight:700;">${escapeHtml(tempPassword)}</code>
          </div>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 8px;font-size:13px;color:#475569;">
      Prefer the button? It opens a secure page where you choose your own password. The default password above is only a backup if you need it.
    </p>
    <p style="margin:0;font-size:12px;color:#94a3b8;">
      If the button does not work, copy this link:<br/>
      <a href="${acceptUrl}" style="color:${primary};word-break:break-all;">${escapeHtml(acceptUrl)}</a>
    </p>
    <p style="margin:14px 0 0;font-size:12px;color:#94a3b8;">
      After setup you can sign in anytime at
      <a href="${loginUrl}" style="color:${primary};">${escapeHtml(loginUrl)}</a>
    </p>
  `;

  const html = wrapBrandedEmail({
    company,
    title: `Join ${company.name}`,
    bodyHtml,
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
  inviteToken: string;
}) {
  const { getTenantAcceptUrl, getTenantLoginUrl } = await import("@/lib/tenant-url");
  const acceptUrl = getTenantAcceptUrl(opts.company, opts.email, opts.inviteToken);
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
