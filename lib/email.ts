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
  const acceptUrl = new URL(
    `/invite/${encodeURIComponent(opts.token)}`,
    baseUrl,
  ).toString();
  const inviterName = escapeHtml(opts.inviterName);
  const workspaceName = escapeHtml(opts.workspaceName);
  const safeAcceptUrl = escapeHtml(acceptUrl);

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: sender,
    to: opts.to,
    subject: `${opts.inviterName} invited you to ${opts.workspaceName}`,
    html: `
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background-color:#0a0a0a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:48px 20px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background-color:#161616;border:1px solid #2a2a2a;border-radius:20px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">

            <!-- Top accent bar -->
            <tr>
              <td style="height:4px;background-color:#4f46e5;line-height:4px;font-size:0;">&nbsp;</td>
            </tr>

            <!-- Logo -->
            <tr>
              <td style="padding:36px 40px 0 40px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width:30px;height:30px;background-color:#ffffff;border-radius:8px;text-align:center;vertical-align:middle;font-size:15px;font-weight:700;color:#0a0a0a;">✓</td>
                    <td style="padding-left:10px;color:#ffffff;font-size:16px;font-weight:700;letter-spacing:-0.2px;">TaskFlow</td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Heading -->
            <tr>
              <td style="padding:28px 40px 0 40px;">
                <p style="margin:0;color:#ffffff;font-size:23px;font-weight:700;letter-spacing:-0.3px;line-height:1.3;">
                  You've been invited
                </p>
              </td>
            </tr>

            <!-- Body copy -->
            <tr>
              <td style="padding:14px 40px 0 40px;">
                <p style="margin:0;color:#a3a3a3;font-size:15px;line-height:1.65;">
                  <span style="color:#ffffff;font-weight:600;">${inviterName}</span> invited you to join
                  <span style="color:#ffffff;font-weight:600;">${workspaceName}</span> on TaskFlow.
                  Accept below to get access to its projects and tasks.
                </p>
              </td>
            </tr>

            <!-- Button -->
            <tr>
              <td style="padding:32px 40px 0 40px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:10px;background-color:#4f46e5;">
                      <a href="${safeAcceptUrl}"
                         style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;
                                font-size:15px;font-weight:600;border-radius:10px;">
                        Accept invitation →
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Divider -->
            <tr>
              <td style="padding:36px 40px 0 40px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr><td style="border-top:1px solid #262626;line-height:1px;font-size:0;">&nbsp;</td></tr>
                </table>
              </td>
            </tr>

            <!-- Fallback link -->
            <tr>
              <td style="padding:20px 40px 36px 40px;">
                <p style="margin:0;color:#6b6b6b;font-size:12.5px;line-height:1.7;">
                  This link expires in 7 days. If the button doesn't work, paste this into your browser:
                </p>
                <p style="margin:8px 0 0 0;font-size:12.5px;line-height:1.6;word-break:break-all;">
                  <a href="${safeAcceptUrl}" style="color:#818cf8;text-decoration:none;">${safeAcceptUrl}</a>
                </p>
              </td>
            </tr>
          </table>

          <!-- Footer -->
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">
            <tr>
              <td style="padding:24px 8px 0 8px;text-align:center;">
                <p style="margin:0;color:#4a4a4a;font-size:12px;line-height:1.6;">
                  Sent by TaskFlow on behalf of ${workspaceName}
                </p>
              </td>
            </tr>
          </table>

        </td>
      </tr>
    </table>
  </body>
</html>`,
  });

  if (error) throw new Error(error.message);
}
