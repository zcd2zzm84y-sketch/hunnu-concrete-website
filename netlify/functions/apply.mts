import type { Config, Context } from "@netlify/functions"
import { applicantStore, cleanApplicant, isOpen, json } from "../lib/store.mts"
import { assess } from "../../public/assets/interview.mjs"

// Posts a short summary to the Netlify form "new-applicant" (its email notification alerts HR) and, if set, to Teams. Never fails the submission.
async function notify(site: string, row: any) {
  const pct = row.max ? Math.round(row.score / row.max * 100) : 0, r = assess(row)
  const body = new URLSearchParams({
    // Field names are the labels HR sees in the email, so they are in Mongolian
    "form-name": "new-applicant", "Нэр": row.name, "Албан тушаал": `${row.position} (${row.dept})`, "Утас": row.phone || "",
    "Шалгалтын оноо": `${pct}%`, "Зөвлөмж": `${r.verdict} (${r.score}/100)`, "Гэрийн хаяг": [row.district, row.khoroo ? row.khoroo + "-р хороо" : ""].filter(Boolean).join(", "),
    "HR самбар": "https://hunnu.asia/talent/admin#app",
  })
  const jobs = [fetch(new URL("/", site), { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body, signal: AbortSignal.timeout(4000) })]
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
