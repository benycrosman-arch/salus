/**
 * Minimal Resend wrapper. Uses fetch — no SDK dependency.
 * Returns { ok: true } when delivery is dispatched, { ok: false } with reason
 * when Resend isn't configured (callers should treat this as non-fatal so the
 * invite/signup still works without email).
 */

type SendArgs = {
  to: string
  subject: string
  html: string
  from?: string
  replyTo?: string
}

export type SendResult =
  | { ok: true; id: string }
  | { ok: false; reason: 'not_configured' | 'send_failed'; message?: string }

const DEFAULT_FROM = process.env.RESEND_FROM || 'Salus <convites@salus.nulllabs.org>'

export async function sendEmail({ to, subject, html, from, replyTo }: SendArgs): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { ok: false, reason: 'not_configured' }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: from || DEFAULT_FROM,
        to: [to],
        subject,
        html,
        reply_to: replyTo,
      }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error('Resend send failed:', res.status, text)
      return { ok: false, reason: 'send_failed', message: text || `HTTP ${res.status}` }
    }
    const data = (await res.json().catch(() => ({}))) as { id?: string }
    return { ok: true, id: data.id ?? '' }
  } catch (err) {
    console.error('Resend network error:', err)
    return { ok: false, reason: 'send_failed', message: err instanceof Error ? err.message : 'unknown' }
  }
}

/**
 * Email template for a nutricionista inviting a patient.
 *
 * The access code is intentionally NOT in the email — the nutri shares it
 * out-of-band (WhatsApp / verbal / in consultation) within a 5-minute
 * window after creating the invite. Two-channel design: someone who only
 * intercepts the email can't accept; they need the code too. The email
 * mentions the code requirement so the patient knows to ask their nutri.
 */
export function nutriInviteEmail({
  nutriName,
  patientEmail,
  link,
}: {
  nutriName: string
  patientEmail: string
  link: string
  accessCode?: string
}) {
  const safeNutri = (nutriName?.trim() || 'Seu nutricionista').replace(/[\r\n]+/g, ' ')
  const safeLink = escapeHtml(link)
  const subject = `${safeNutri} convidou você para a Salus`
  const html = `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:0;background:#faf8f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a3a2a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf8f4;padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;box-shadow:0 1px 3px rgba(0,0,0,0.04);overflow:hidden;">
            <tr>
              <td style="padding:32px 40px 24px 40px;">
                <div style="display:flex;align-items:center;gap:10px;">
                  <div style="width:32px;height:32px;border-radius:10px;background:#1a3a2a;display:inline-block;text-align:center;line-height:32px;color:#fff;font-weight:700;">S</div>
                  <span style="font-family:Georgia,serif;font-style:italic;font-size:20px;color:#1a3a2a;">Salus</span>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 40px 8px 40px;">
                <h1 style="font-family:Georgia,serif;font-style:italic;font-size:28px;line-height:1.25;color:#1a3a2a;margin:0 0 12px 0;">
                  ${escapeHtml(safeNutri)} convidou você para a Salus
                </h1>
                <p style="font-size:15px;line-height:1.6;color:#1a3a2a;opacity:0.85;margin:0 0 16px 0;">
                  A Salus é o aplicativo que ${escapeHtml(safeNutri)} usa para acompanhar suas refeições, exames e progresso entre as consultas. Você fotografa o prato, a IA analisa, e seu nutricionista vê tudo no painel dele(a).
                </p>
                <p style="font-size:14px;line-height:1.6;color:#1a3a2a;opacity:0.75;margin:0 0 20px 0;background:#faf8f4;border-radius:12px;padding:12px 14px;">
                  <strong>Você vai precisar de um código de 6 caracteres</strong> que ${escapeHtml(safeNutri)} te enviou separadamente (WhatsApp, mensagem ou pessoalmente). Por segurança, ele não está neste e-mail.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 40px 32px 40px;" align="left">
                <a href="${safeLink}" style="display:inline-block;background:#1a3a2a;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 24px;border-radius:999px;">
                  Abrir convite
                </a>
                <p style="font-size:13px;line-height:1.6;color:#1a3a2a;opacity:0.6;margin:18px 0 0 0;">
                  Ou copie e cole este link no navegador:<br />
                  <span style="word-break:break-all;color:#1a3a2a;">${safeLink}</span>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 32px 40px;border-top:1px solid #e4ddd4;padding-top:24px;">
                <p style="font-size:12px;line-height:1.6;color:#1a3a2a;opacity:0.5;margin:0;">
                  Este convite foi enviado para ${escapeHtml(patientEmail)} a pedido de ${escapeHtml(safeNutri)}.
                  Se você não esperava este e-mail, pode ignorá-lo — o convite expira em 24 horas.
                </p>
              </td>
            </tr>
          </table>
          <p style="font-size:11px;color:#1a3a2a;opacity:0.4;margin:16px 0 0 0;">
            Salus · NullLabs · suporte@nulllabs.org
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`
  return { subject, html }
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
