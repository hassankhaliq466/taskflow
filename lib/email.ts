import { Resend } from "resend";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

export async function sendInvitationEmail(opts: {
  to: string;
  inviterName: string;
  workspaceName: string;
  token: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const sender = process.env.EMAIL_FROM;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!apiKey || !sender || !appUrl) {
    throw new Error("Invitation email is not configured");
  }

  const baseUrl = new URL(appUrl);
  if (baseUrl.protocol !== "http:" && baseUrl.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_APP_URL must use HTTP or HTTPS");
  }
  const acceptUrl = new URL(`/invite/${encodeURIComponent(opts.token)}`, baseUrl).toString();
  const inviterName = escapeHtml(opts.inviterName);
  const workspaceName = escapeHtml(opts.workspaceName);
  const safeAcceptUrl = escapeHtml(acceptUrl);

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: sender,
    to: opts.to,
    subject: `${opts.inviterName} invited you to ${opts.workspaceName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">
        <h2>You've been invited</h2>
        <p>${inviterName} invited you to join <b>${workspaceName}</b> on TaskFlow.</p>
        <a href="${safeAcceptUrl}"
           style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;
                  text-decoration:none;border-radius:6px;font-weight:bold">
          Accept invitation
        </a>
        <p style="color:#666;font-size:13px;margin-top:24px">
          This link expires in 7 days. If the button doesn't work, paste this into your browser:<br>${safeAcceptUrl}
        </p>
      </div>`,
  });

  if (error) throw new Error(error.message);
}