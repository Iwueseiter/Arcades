/**
 * Sends email through Resend (https://resend.com). Set RESEND_API_KEY and XURRI_EMAIL_FROM, e.g.
 * "Xurri <play@yourdomain.com>" on a domain verified in Resend. Without a key, development logs the
 * email to the console so sign-in can still be tested.
 */
export async function sendEmail({ to, subject, html, text }: { to: string; subject: string; html: string; text: string }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV === 'production') throw new Error('Email is not configured (RESEND_API_KEY missing)');
    console.info(`[email] to ${to}: ${subject}\n${text}`);
    return;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.XURRI_EMAIL_FROM ?? 'Xurri <onboarding@resend.dev>', to, subject, html, text }),
  });
  if (!response.ok) throw new Error(`Email failed (${response.status}): ${(await response.text()).slice(0, 200)}`);
}
