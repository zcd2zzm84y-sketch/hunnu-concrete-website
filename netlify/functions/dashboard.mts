import type { Config, Context } from "@netlify/functions"
import { settingsStore, json, clip } from "../lib/store.mts"
import { createHash, timingSafeEqual, scryptSync, randomBytes } from "node:crypto"

// Зөвлөх's private overview (hunnu.asia/dashboard): live progress of delegated work.
// Marketing statuses are read from the marketing board (mkt-status); HR and Зөвлөх tasks are kept here (hy-tasks).
// Own password (scrypt hash in Blobs, hy-key); first setup needs the HR dashboard key (ADMIN_KEY).
const sha = (t: string) => createHash("sha256").update(t).digest()
const same = (a: string, b: string) => timingSafeEqual(sha(a), sha(b))
const ST = ["todo", "doing", "ok", "wait"]
const LOCK_N = 8, LOCK_MS = 15 * 60 * 1000
const MK: { k: string, t: string, w: boolean }[] = [{"k": "t16vwoll", "t": "Facebook үндсэн хуудас: Оффисын газрын зургийн пинийг Министер Товер руу зөөх. Meta Business Suite апп › Settings › Page info › Location. Болохгүй бол Meta support.", "w": false}, {"k": "t195iybi", "t": "Facebook үндсэн хуудас: Пин постыг boost хийх. Хэмжээ, хугацааг Зөвлөхтэй тохирно.", "w": false}, {"k": "tpo19cw", "t": "Facebook үндсэн хуудас: Lead ad (захиалгын маягт) бэлдэж Зөвлөхөөр батлуулах. Текст нь доорх «Lead ad» хэсэгт.", "w": false}, {"k": "t1oa4w0i", "t": "Messenger, лийд: Лийдүүдийг 7 хоног тутам шалгаж, HOT лийдэд залгах.", "w": false}, {"k": "thic1v6", "t": "Instagram: Профайлд hunnu.asia холбоос нэмэх (зөвхөн утасны апп-аас).", "w": false}, {"k": "tybbiho", "t": "X: @HunnuConcrete болгох. 11-10-нд дахин оролдох.", "w": true}, {"k": "t52lyl9", "t": "X: Нэр солигдвол FB, вэб, Maps дахь x.com холбоосыг солих.", "w": false}, {"k": "t20r4dw", "t": "YouTube: Тайлбараас «Бэлэн»-ийг хасах, auto-dubbing унтраах.", "w": false}, {"k": "t16h0qs6", "t": "Google Maps 1.0: Шинэ нэр Google-ийн шалгалтад.", "w": true}, {"k": "t1jd0qfz", "t": "Google Maps 1.0: Нэр гармагц тайлбарыг засах (M550, «бэлэн» хасах).", "w": false}, {"k": "t1rmvxb1", "t": "Google Maps 2.0: Тайлбараас «бэлэн»-ийг хасаж, M550-ийг M650 болгох.", "w": false}, {"k": "t1cydoev", "t": "barilga.mn: Админ эрхийн хүсэлт хүлээгдэж байна. info@hunnu.asia-аар нэвтэрч шалгаад, зөвшөөрөгдвөл текст, зургийг тавих. Админ эрх өгөхгүй бол barilga.mn-ээс профайлыг устгуулах хүсэлт гаргах. Утас 9100 0233.", "w": true}, {"k": "tw8pign", "t": "Вэбсайт, домэйн: Домэйн авсны дараа сайтыг hunnuconcrete.mn руу шилжүүлж, hunnu.asia-г дамжуулалт болгох.", "w": false}, {"k": "t1wdizjr", "t": "zangia.mn: Нэвтрэх эрх олох, тайлбар бөглөх, ажлын зар тавих.", "w": false}, {"k": "thbz88x", "t": "REPORT360 дэлгүүр: App Store борлуулагчийг Хүннү Конкрет ХХК болгох. Google Play имэйлийг info@hunnu.asia болгох.", "w": false}]
const SEED: Record<string, { t: string, s: string, at: string }[]> = {"hr": [{"t": "FB HR хуудасны урилгаа хүлээж авах (11-11 10:00, Зөвлөхтэй хамт)", "s": "wait", "at": ""}, {"t": "Ирсэн анкетад ХН самбараас «Шалгалт эхлүүлэх» холбоос үүсгэж оффис дээр шалгалт авах", "s": "doing", "at": ""}, {"t": "HR Messenger-ийн хариултыг 7 хоногт 2 удаа шалгах", "s": "doing", "at": ""}, {"t": "Хуучин «Hunnu HR» профайлыг устгах", "s": "ok", "at": "2026-11-09T03:00:00Z"}], "zov": [{"t": "Маркетингийн хуудсыг Бат-Эрдэнэтэй засах эрхтэй Share хийх (товч дарахад хэрэгтэй)", "s": "todo", "at": ""}, {"t": "Мандахад FB HR хуудасны Админ эрх олгох (11-11)", "s": "todo", "at": ""}, {"t": "Бат-Эрдэнэд YouTube Manager эрх өгөх", "s": "todo", "at": ""}, {"t": "hunnuconcrete.mn домэйн худалдаж авах", "s": "todo", "at": ""}, {"t": "Захиргаа, Хуулийн албанд утасны дугаар авах", "s": "todo", "at": ""}, {"t": "Lead ad-ыг батлах (2-р сард эхлүүлэх санал)", "s": "wait", "at": ""}]}
const AREAS = { hr: { name: "Хүний нөөц", who: "Мандах", page: "/talent/admin" }, zov: { name: "Зөвлөх", who: "Таны хийх", page: "" } }

const getJ = async (k: string) => (await settingsStore().get(k, { type: "json" })) as any
const ipKey = (ctx: Context) => "hy-fail-" + createHash("sha256").update(ctx.ip || "x").digest("hex").slice(0, 16)
const hashKey = (k: string, salt: string) => scryptSync(k, salt, 32).toString("hex")
const keyOk = async (k: string): Promise<boolean | null> => {
  const st: any = await getJ("hy-key")
  if (!st?.hash) return null
  return timingSafeEqual(Buffer.from(hashKey(k, st.salt), "hex"), Buffer.from(st.hash, "hex"))
}
const saveKey = async (k: string) => { const salt = randomBytes(16).toString("hex"); await settingsStore().setJSON("hy-key", { salt, hash: hashKey(k, salt), at: new Date().toISOString() }) }
const tid = () => "h" + randomBytes(6).toString("hex")
async function getTasks() {
  let v: any = await getJ("hy-tasks")
  if (!v || typeof v !== "object") {
    v = {}
    for (const [a, list] of Object.entries(SEED)) v[a] = list.map(x => ({ id: tid(), ...x }))
    await settingsStore().setJSON("hy-tasks", v)
  }
  return v as Record<string, { id: string, t: string, s: string, at: string }[]>
}
async function view() {
  const mst: any = (await getJ("mkt-status")) || {}, tasks = await getTasks()
  return { at: new Date().toISOString(), areas: [
    { id: "mk", name: "Маркетинг", who: "Бат-Эрдэнэ", page: "/marketing", ro: true,
      tasks: MK.map(x => { const v = mst[x.k]; return { id: x.k, t: x.t, s: v?.s || (x.w ? "wait" : "todo"), at: v?.at || "", by: v?.by || "" } }) },
    ...Object.entries(AREAS).map(([id, a]) => ({ id, ...a, ro: false, tasks: (tasks[id] || []).map(x => ({ ...x, by: "" })) })),
  ] }
}

export default async (req: Request, ctx: Context) => {
  const configured = await keyOk("probe")
  if (configured === null) {
    if (req.method !== "POST") return json({ error: "Нууц үг тохируулаагүй байна.", setup: true }, 503)
    let b: any
    try { b = await req.json() } catch { return json({ error: "Хүсэлт буруу байна." }, 400) }
    const admin = Netlify.env.get("ADMIN_KEY"), a = (req.headers.get("x-admin-key") || "").trim()
    if (b?.action !== "setup" || !admin || !a || !same(a, admin)) return json({ error: "HR самбарын түлхүүр буруу байна.", setup: true }, 401)
    const nk = String(b.key || "").trim()
    if (nk.length < 10) return json({ error: "Нууц үг дор хаяж 10 тэмдэгт байна.", setup: true }, 400)
    await saveKey(nk)
    return json({ ok: true })
  }
  const k = (req.headers.get("x-hy-key") || "").trim()
  if (!k) return json({ error: "Нэвтэрнэ үү." }, 401)
  const fk = ipKey(ctx), fail: any = (await getJ(fk)) || { n: 0, t: 0 }
  if (fail.n >= LOCK_N && Date.now() - fail.t < LOCK_MS) return json({ error: "Олон удаа буруу оруулсан. 15 минутын дараа дахин оролдоно уу." }, 429)
  if (!(await keyOk(k))) {
    await settingsStore().setJSON(fk, { n: (Date.now() - fail.t < LOCK_MS ? fail.n : 0) + 1, t: Date.now() })
    return json({ error: "Нууц үг буруу байна." }, 401)
  }
  if (fail.n) await settingsStore().delete(fk)
  if (req.method === "GET") return json(await view())

  let b: any
  try { b = await req.json() } catch { return json({ error: "Хүсэлт буруу байна." }, 400) }
  const area = String(b?.area || "")
  if (!(area in AREAS)) return json({ error: "Хэсэг буруу." }, 400)
  const tasks = await getTasks(), list = tasks[area] || (tasks[area] = [])
  if (b.action === "status") {
    const t = list.find(x => x.id === b.id), s = String(b.s || "")
    if (!t || !ST.includes(s)) return json({ error: "Ажил олдсонгүй." }, 400)
    t.s = s; t.at = new Date().toISOString()
  } else if (b.action === "add") {
    const t = clip(b.t, 300).trim()
    if (!t) return json({ error: "Ажлаа бичнэ үү." }, 400)
    if (list.length >= 40) return json({ error: "Хэт олон ажил байна." }, 400)
    list.push({ id: tid(), t, s: "todo", at: new Date().toISOString() })
  } else if (b.action === "del") {
    const i = list.findIndex(x => x.id === b.id)
    if (i < 0) return json({ error: "Ажил олдсонгүй." }, 400)
    list.splice(i, 1)
  } else return json({ error: "Үйлдэл буруу." }, 400)
  await settingsStore().setJSON("hy-tasks", tasks)
  return json(await view())
}

export const config: Config = { path: "/api/dashboard", method: ["GET", "POST"] }
