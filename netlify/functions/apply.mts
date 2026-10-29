import type { Config, Context } from "@netlify/functions"
import { applicantStore, cleanApplicant, isOpen, json } from "../lib/store.mts"
import { assess } from "../../public/assets/interview.mjs"

// Posts a short summary to the Netlify form "new-applicant"; its email notification alerts HR. Never blocks the submission.
async function notify(site: string, row: any) {
  const pct = row.max ? Math.round(row.score / row.max * 100) : 0, r = assess(row)
  const body = new URLSearchParams({
    "form-name": "new-applicant", name: row.name, position: `${row.position} (${row.dept})`, phone: row.phone || "",
    score: `${pct}%`, recommendation: `${r.verdict} (${r.score}/100)`, home: [row.district, row.khoroo ? row.khoroo + "-р хороо" : ""].filter(Boolean).join(", "),
    dashboard: "https://hunnu.asia/talent/admin#app",
  })
  try {
    await fetch(new URL("/", site), { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body, signal: AbortSignal.timeout(4000) })
  } catch { }
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
