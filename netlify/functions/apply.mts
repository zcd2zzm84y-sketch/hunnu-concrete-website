import type { Config, Context } from "@netlify/functions"
import { applicantStore, cleanApplicant, isOpen, json } from "../lib/store.mts"
import { assess } from "../../public/assets/interview.mjs"

// Emails HR a short summary (Resend, or the Netlify form "new-applicant" as fallback) and, if set, posts to Teams. Never fails the submission.
async function notify(site: string, row: any) {
  const pct = row.max ? Math.round(row.score / row.max * 100) : 0, r = assess(row)
  const body = new URLSearchParams({
    // Field names are the labels HR sees in the email, so they are in Mongolian
    "form-name": "new-applicant", "Нэр": row.name, "Албан тушаал": `${row.position} (${row.dept})`, "Утас": row.phone || "",
    "Шалгалтын оноо": `${pct}%`, "Зөвлөмж": `${r.verdict} (${r.score}/100)`, "Гэрийн хаяг": [row.district, row.khoroo ? row.khoroo + "-р хороо" : ""].filter(Boolean).join(", "),
    "HR самбар": "https://hunnu.asia/talent/admin#app",
  })
  // With RESEND_API_KEY the alert comes from info@hunnu.asia; otherwise from Netlify's form notification
  const resend = Netlify.env.get("RESEND_API_KEY")
  const esc = (v: string) => String(v ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!))
  const rows = [...body].filter(([k]) => k !== "form-name" && k !== "HR самбар")
  // Email layout follows a printed application form: logo + number/date, charcoal title band, bordered sections
  const no = String(row.id).slice(-8).toUpperCase()
  const date = new Date(row.submittedAt).toLocaleString("mn-MN", { timeZone: "Asia/Ulaanbaatar", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })
  const tone = ({ good: ["#1e6b3f", "#e3f1e8"], warn: ["#7a5600", "#fdf1cc"], bad: ["#9b2c2c", "#f8e5e5"] } as Record<string, string[]>)[r.cls] || ["#333333", "#eeeeee"]
  const badge = (t: string) => `<span style="display:inline-block;padding:3px 10px;border-radius:4px;background:${tone[1]};color:${tone[0]};font-weight:700">${esc(t)}</span>`
  const F = "font-family:Arial,Helvetica,sans-serif"
  const tr = (k: string, v: string, raw = false) => `<tr><td style="${F};font-size:13px;color:#4E5452;padding:9px 14px;border-top:1px solid #e3e5e4;width:38%;vertical-align:top">${esc(k)}</td><td style="${F};font-size:14px;color:#333333;font-weight:700;padding:9px 14px;border-top:1px solid #e3e5e4">${raw ? v : esc(v) || "—"}</td></tr>`
  const sec = (title: string, body: string) => `<tr><td style="padding:18px 28px 0"><div style="${F};font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#4E5452;font-weight:700;margin:0 0 6px">${title}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #d5d8d6;border-collapse:collapse">${body}</table></td></tr>`
  const html = `<!doctype html><html><body style="margin:0;padding:24px 12px;background:#f2f3f3"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #d5d8d6">
<tr><td style="padding:22px 28px 14px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td><img src="https://hunnu.asia/talent/assets/logo.png" width="120" height="45" alt="HUNNU RMC" style="display:block;border:0"></td><td align="right" style="${F};font-size:12px;color:#4E5452;line-height:1.6">Анкетын № <b style="color:#333333">${no}</b><br>${esc(date)}</td></tr></table></td></tr>
<tr><td style="padding:0 28px"><div style="border-top:2px solid #333333;font-size:0;line-height:0">&nbsp;</div><div style="width:48px;border-top:2px solid #f2c200;font-size:0;line-height:0">&nbsp;</div><div style="${F};font-size:16px;font-weight:700;color:#333333;letter-spacing:.5px;margin-top:12px">АЖЛЫН АНКЕТ</div><div style="${F};font-size:12px;color:#4E5452;margin-top:2px">Шинэ горилогч бүртгүүллээ</div></td></tr>
${sec("Ажлын байр", tr("Албан тушаал", row.position) + tr("Алба", row.dept))}
${sec("Горилогч", tr("Овог нэр", row.name) + tr("Утас", row.phone) + (row.email ? tr("Имэйл", row.email) : "") + tr("Гэрийн хаяг", body.get("Гэрийн хаяг") || ""))}
${sec("Үнэлгээ", tr("Шалгалтын оноо", `${pct}%`) + tr("Зөвлөмж", `${badge(r.verdict)} <span style="font-weight:400;color:#4E5452">${r.score}/100</span>`, true))}
<tr><td style="padding:22px 28px 26px"><a href="https://hunnu.asia/talent/admin#app" style="${F};display:inline-block;background:#333333;color:#ffffff;font-size:14px;font-weight:700;padding:11px 20px;text-decoration:none;border-radius:4px">HR самбарт нээх</a></td></tr>
<tr><td style="padding:14px 28px;border-top:1px solid #e3e5e4;${F};font-size:11px;color:#4E5452;line-height:1.6"><b style="color:#333333">Хүннү Конкрет ХХК</b> · Хүний нөөц 8806 6831 · 7575 4040 · info@hunnu.asia · <a href="https://hunnu.asia/" style="color:#4E5452">www.hunnu.asia</a><br>Энэ мэдэгдлийг ажлын анкетын системээс автоматаар илгээв.</td></tr>
</table></td></tr></table></body></html>`
  const viaForm = () => fetch(new URL("/", site), { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body, signal: AbortSignal.timeout(4000) })
  // If Resend refuses (e.g. domain not verified yet), fall back to the Netlify form email so HR still hears about it
  const jobs: Promise<unknown>[] = [resend
    ? fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${resend}`, "content-type": "application/json" }, signal: AbortSignal.timeout(4000), body: JSON.stringify({
        from: "Хүннү Конкрет Хүний нөөц <info@hunnu.asia>", to: (Netlify.env.get("ALERT_TO") || "munkhmandakh@teso.mn,info@hunnu.asia").split(",").map(s => s.trim()),
        reply_to: "munkhmandakh@teso.mn", subject: `Шинэ анкет: ${row.name}, ${row.position}`, html,
        text: rows.map(([k, v]) => `${k}: ${v}`).join("\n") + "\n\nHR самбар: https://hunnu.asia/talent/admin#app" }) })
        .then(r => r.ok ? r : viaForm(), () => viaForm())
    : viaForm()]
  // Optional Teams channel post through a Teams Workflows webhook
  const hook = Netlify.env.get("TEAMS_WEBHOOK_URL")
  if (hook) {
    const fact = (title: string, value: string) => ({ title, value: value || "—" })
    const card = {
      type: "AdaptiveCard", $schema: "http://adaptivecards.io/schemas/adaptive-card.json", version: "1.4",
      body: [
        { type: "TextBlock", text: "Шинэ ажлын анкет ирлээ", weight: "Bolder", size: "Medium" },
        { type: "FactSet", facts: [fact("Нэр", row.name), fact("Албан тушаал", `${row.position} (${row.dept})`), fact("Утас", row.phone), fact("Шалгалт", `${pct}%`), fact("Зөвлөмж", `${r.verdict} (${r.score}/100)`), fact("Гэр", body.get("Гэрийн хаяг") || "")] },
      ],
      actions: [{ type: "Action.OpenUrl", title: "HR самбарт харах", url: "https://hunnu.asia/talent/admin#app" }],
    }
    jobs.push(fetch(hook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "message", attachments: [{ contentType: "application/vnd.microsoft.card.adaptive", content: card }] }), signal: AbortSignal.timeout(4000) }))
  }
  await Promise.allSettled(jobs)
}

export default async (req: Request, context: Context) => {
  let body: any
  try { body = await req.json() } catch { return json({ error: "Хүсэлт буруу байна." }, 400) }
  let app
  try { app = cleanApplicant(body?.applicant) } catch (e: any) { return json({ error: e?.message || "Мэдээлэл буруу байна." }, 400) }
  if (!(await isOpen(app.dept, app.position))) return json({ error: "Энэ ажлын байрны бүртгэл хаагдсан байна." }, 400)
  const id = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
  const row = { ...app, id, submittedAt: Date.now() }
  await applicantStore().setJSON(id, row)
  await notify(context?.site?.url || Netlify.env.get("URL") || "https://hunnu-talent.netlify.app", row)
  return json({ ok: true })
}

export const config: Config = {
  path: "/api/apply",
  method: "POST",
  rateLimit: { windowLimit: 5, windowSize: 60, aggregateBy: ["ip", "domain"] },
}
