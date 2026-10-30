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
  // With RESEND_API_KEY the alert comes from hr@hunnu.asia; otherwise from Netlify's form notification
  const resend = Netlify.env.get("RESEND_API_KEY")
  const esc = (v: string) => String(v ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!))
  const rows = [...body].filter(([k]) => k !== "form-name" && k !== "HR самбар")
  const html = `<p style="font:16px sans-serif;margin:0 0 12px"><b>Шинэ ажлын анкет ирлээ</b></p><table style="font:14px sans-serif;border-collapse:collapse">${rows.map(([k, v]) => `<tr><td style="padding:4px 16px 4px 0;color:#4E5452">${esc(k)}</td><td style="padding:4px 0"><b>${esc(v) || "—"}</b></td></tr>`).join("")}</table><p style="font:14px sans-serif;margin:16px 0 0"><a href="https://hunnu.asia/talent/admin#app" style="background:#333;color:#fff;padding:10px 16px;text-decoration:none;border-radius:6px">HR самбарт харах</a></p>`
  const jobs = [resend
    ? fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${resend}`, "content-type": "application/json" }, signal: AbortSignal.timeout(4000), body: JSON.stringify({
        from: "HUNNU HR <hr@hunnu.asia>", to: (Netlify.env.get("ALERT_TO") || "munkhmandakh@teso.mn,info@hunnu.asia").split(",").map(s => s.trim()),
        reply_to: "info@hunnu.asia", subject: `Шинэ анкет: ${row.name}, ${row.position}`, html,
        text: rows.map(([k, v]) => `${k}: ${v}`).join("\n") + "\n\nHR самбар: https://hunnu.asia/talent/admin#app" }) })
    : fetch(new URL("/", site), { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body, signal: AbortSignal.timeout(4000) })]
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
