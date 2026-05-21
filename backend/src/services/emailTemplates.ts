// Inline styles are required — email clients (Gmail, Outlook) strip <style> tags.

function baseLayout(content: string, preheader = ''): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1ece3;font-family:Arial,Helvetica,sans-serif;">
  ${preheader ? `<span style="display:none;max-height:0;overflow:hidden;">${preheader}</span>` : ''}
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="600" cellpadding="0" cellspacing="0"
             style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <tr><td style="background:#0073ea;padding:24px 32px;">
          <span style="color:#fff;font-size:20px;font-weight:700;">Boilerplate App</span>
        </td></tr>
        <tr><td style="padding:32px;">${content}</td></tr>
        <tr><td style="padding:16px 32px;background:#f9f9f9;color:#888;font-size:12px;text-align:center;">
          © ${new Date().getFullYear()} Aniston Technologies LLP. All rights reserved.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function renderWelcome(p: { name: string; appName: string; loginUrl: string }): string {
  return baseLayout(
    `<h1 style="color:#1a1a1a;font-size:24px;margin:0 0 16px;">Welcome, ${p.name}!</h1>
     <p style="color:#555;line-height:1.6;">Your account on <strong>${p.appName}</strong> is ready.</p>
     <a href="${p.loginUrl}"
        style="display:inline-block;margin-top:24px;padding:12px 28px;background:#0073ea;
               color:#fff;border-radius:4px;text-decoration:none;font-weight:600;">
       Sign in
     </a>`,
    `Your ${p.appName} account is ready`,
  );
}

export function renderPasswordReset(p: { name: string; resetUrl: string; expiresIn: string }): string {
  return baseLayout(
    `<h1 style="color:#1a1a1a;font-size:24px;margin:0 0 16px;">Reset your password</h1>
     <p style="color:#555;line-height:1.6;">Hi ${p.name}, click below to reset your password.
       This link expires in <strong>${p.expiresIn}</strong>.</p>
     <a href="${p.resetUrl}"
        style="display:inline-block;margin-top:24px;padding:12px 28px;background:#0073ea;
               color:#fff;border-radius:4px;text-decoration:none;font-weight:600;">
       Reset password
     </a>
     <p style="color:#999;font-size:12px;margin-top:24px;">
       If you didn't request this, you can safely ignore this email.
     </p>`,
    'Reset your password',
  );
}

export function renderOtp(p: { otp: string; expiresIn: string }): string {
  return baseLayout(
    `<h1 style="color:#1a1a1a;font-size:24px;margin:0 0 16px;">Your verification code</h1>
     <p style="color:#555;">Use this one-time code to verify your account:</p>
     <div style="margin:24px 0;text-align:center;font-size:40px;font-weight:700;
                 letter-spacing:12px;color:#0073ea;font-family:monospace;">${p.otp}</div>
     <p style="color:#999;font-size:12px;">Expires in ${p.expiresIn}. Never share this code with anyone.</p>`,
    'Your verification code',
  );
}
