/**
 * Build the HTML body for the invite email.
 * Minimal styling inline — no react-email dependency (locked in CONTEXT.md).
 */
export function buildInviteEmailHtml(
  email: string,
  role: string,
  setupUrl: string,
): string {
  return `
<!DOCTYPE html>
<html>
  <head><meta charset="utf-8" /></head>
  <body style="font-family:sans-serif;color:#111;max-width:480px;margin:40px auto;padding:0 16px;">
    <h2 style="margin-bottom:8px;">You've been invited to Token Manager</h2>
    <p style="color:#555;">You've been invited as <strong>${role}</strong>.</p>
    <p>
      <a href="${setupUrl}" style="display:inline-block;padding:10px 20px;background:#111;color:#fff;text-decoration:none;border-radius:6px;">
        Set up your account
      </a>
    </p>
    <p style="color:#888;font-size:13px;">This link expires in 7 days. If you did not expect this invitation, you can safely ignore this email.</p>
  </body>
</html>`;
}
