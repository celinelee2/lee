import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.RESEND_FROM ?? "noreply@artpresso.example.com";
const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export async function sendWelcomeEmail(to: string, name: string, token: string) {
  const url = `${APP_URL}/reset-password/${token}`;
  if (!resend) return { url, skipped: true };
  await resend.emails.send({
    from: FROM,
    to,
    subject: "歡迎加入 Artpresso 點名系統",
    html: `<p>親愛的 ${name} 老師，您好！</p>
<p>管理者已為您建立帳號，請點擊以下連結設定您的密碼：</p>
<p><a href="${url}">${url}</a></p>
<p>此連結將於 7 天後失效。</p>`,
  });
  return { url, skipped: false };
}

export async function sendPasswordResetEmail(to: string, name: string, token: string) {
  const url = `${APP_URL}/reset-password/${token}`;
  if (!resend) return { url, skipped: true };
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Artpresso 點名系統 — 重設密碼",
    html: `<p>親愛的 ${name} 老師，您好！</p>
<p>您已請求重設密碼，請點擊以下連結：</p>
<p><a href="${url}">${url}</a></p>
<p>此連結將於 24 小時後失效。若非您本人操作，請忽略此信。</p>`,
  });
  return { url, skipped: false };
}
