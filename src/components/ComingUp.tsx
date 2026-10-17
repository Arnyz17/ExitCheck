"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Plus, Play, MessageCircle } from "lucide-react";
import Rise from "./Rise";
import Sheet from "./Sheet";
import BrandIcon from "./BrandIcon";
import { useToast } from "./Toast";

type Item = { id: string; kind: "reply" | "watch"; title: string; note: string; href: string; avatar: string };

/** Center-crops a picked photo to a small square JPEG so it's cheap to store. */
async function toAvatar(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const side = Math.min(bmp.width, bmp.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  canvas.getContext("2d")!.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, 128, 128);
  return canvas.toDataURL("image/jpeg", 0.82);
}

function Avatar({ name, src, onPick }: { name: string; src: string; onPick?: (f: File) => void }) {
  const inner = src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="w-10 h-10 rounded-full object-cover" />
  ) : (
    <span className="w-10 h-10 rounded-full flex items-center justify-center font-semibold" style={{ background: "var(--blue-soft)", color: "var(--blue)" }}>
      {name[0]?.toUpperCase()}
    </span>
  );
  if (!onPick) return inner;
  return (
    <label className="cursor-pointer shrink-0" title="Change photo">
      {inner}
      <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])} />
    </label>
  );
}

const APPLIANCES = [
  { name: "Dryer", left: 14, total: 60 },
  { name: "Washer", left: 0, total: 45 },
  { name: "Dishwasher", left: 42, total: 120 },
];

export default function ComingUp({ userId }: { userId: string }) {
  const toast = useToast();
  const [items, setItems] = useState<Item[] | null>(null);
  const [adding, setAdding] = useState<null | "reply" | "watch">(null);
  const [form, setForm] = useState({ title: "", note: "", href: "", avatar: "" });

  const load = useCallback(async () => {
    const r = await fetch(`/api/inbox?user_id=${encodeURIComponent(userId)}`);
    setItems((await r.json()).items ?? []);
  }, [userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().catch(() => setItems([]));
  }, [load]);

  const replies = items?.filter((i) => i.kind === "reply") ?? [];
  const watch = items?.filter((i) => i.kind === "watch") ?? [];

  const done = async (id: string) => {
    setItems((p) => p?.filter((i) => i.id !== id) ?? p);
    await fetch("/api/inbox", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }).catch(() => {});
  };

  const changePhoto = async (id: string, file: File) => {
    try {
      const avatar = await toAvatar(file);
      setItems((p) => p?.map((i) => (i.id === id ? { ...i, avatar } : i)) ?? p);
      await fetch("/api/inbox", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, avatar }) });
    } catch {
      toast("Couldn't use that photo.");
    }
  };

  const save = async () => {
    if (!adding || !form.title.trim()) return;
    const href =
      adding === "watch"
        ? form.href.trim() || `https://www.netflix.com/search?q=${encodeURIComponent(form.title)}`
        : form.href.trim()
        ? `sms:${form.href.trim()}`
        : "sms:";
    const res = await fetch("/api/inbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: adding, title: form.title, note: form.note, href, avatar: form.avatar }),
    });
    if (!res.ok) return toast("Couldn't save that.");
    setAdding(null);
    setForm({ title: "", note: "", href: "", avatar: "" });
    await load();
  };

  const open = (kind: "reply" | "watch") => {
    setForm({ title: "", note: "", href: "", avatar: "" });
    setAdding(kind);
  };

  return (
    <Rise>
      <section className="tile p-7 lg:p-9 h-full flex flex-col">
        <p className="eyebrow">What&apos;s coming up</p>

        <div className="grid md:grid-cols-2 gap-8 mt-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="flex items-center gap-2 text-[17px] font-semibold">
                <BrandIcon brand="imessage" size={20} /> Waiting for your reply
              </h3>
              <button onClick={() => open("reply")} aria-label="Add a reply reminder" className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--surface-2)" }}>
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <ul>
              <AnimatePresence initial={false}>
                {replies.map((r, i) => (
                  <motion.li
                    key={r.id}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`flex items-center gap-3 overflow-hidden ${i > 0 ? "hairline" : ""}`}
                  >
                    <Avatar name={r.title} src={r.avatar} onPick={(f) => changePhoto(r.id, f)} />
                    <a href={r.href} className="flex items-center gap-3 flex-1 min-w-0 py-3">
                      <span className="min-w-0">
                        <span className="block text-[16px] font-medium truncate">{r.title}</span>
                        <span className="block text-[13px] truncate" style={{ color: "var(--text-2)" }}>
                          {r.note || "Tap to reply in Messages"}
                        </span>
                      </span>
                    </a>
                    <button onClick={() => done(r.id)} aria-label={`Mark ${r.title} replied`} className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--green-soft)", color: "var(--green)" }}>
                      <Check className="w-4 h-4" strokeWidth={3} />
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
            {items && replies.length === 0 && (
              <p className="text-[14px] py-2" style={{ color: "var(--text-2)" }}>
                Nobody&apos;s waiting on you. Add a name to remember to reply.
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="flex items-center gap-2 text-[17px] font-semibold">
                <BrandIcon brand="netflix" size={20} /> Pick up where you left off
              </h3>
              <button onClick={() => open("watch")} aria-label="Add something you're watching" className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--surface-2)" }}>
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <ul className="flex flex-col gap-2.5">
              {watch.map((w) => (
                <li key={w.id} className="flex items-center gap-3 rounded-2xl p-3" style={{ background: "var(--surface-2)" }}>
                  <a href={w.href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 flex-1 min-w-0">
                    {w.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={w.avatar} alt={`${w.title} poster`} className="w-[52px] h-[76px] rounded-lg object-cover shrink-0" style={{ boxShadow: "0 4px 14px rgba(0,0,0,0.35)" }} />
                    ) : (
                      <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#000" }}>
                        <Play className="w-5 h-5 text-white" fill="#fff" />
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="block text-[16px] font-medium truncate">{w.title}</span>
                      <span className="block text-[13px] truncate" style={{ color: "var(--text-2)" }}>
                        {w.note || "Resume on Netflix"}
                      </span>
                    </span>
                  </a>
                  <button onClick={() => done(w.id)} aria-label={`Remove ${w.title}`} className="text-[12px] font-medium px-2" style={{ color: "var(--text-2)" }}>
                    Done
                  </button>
                </li>
              ))}
            </ul>
            {items && watch.length === 0 && (
              <p className="text-[14px] py-2" style={{ color: "var(--text-2)" }}>
                Save what you&apos;re watching and resume it in one tap.
              </p>
            )}
          </div>
        </div>

        <div className="hairline mt-7 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="flex items-center gap-2 text-[17px] font-semibold">
              <BrandIcon brand="bosch" size={20} /> Appliances
            </h3>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            {APPLIANCES.map((a) => (
              <div key={a.name} className="rounded-2xl p-4" style={{ background: "var(--surface-2)" }}>
                <p className="text-[15px] font-medium">{a.name}</p>
                <p className="text-[13px] mt-0.5" style={{ color: a.left === 0 ? "var(--green)" : "var(--text-2)" }}>
                  {a.left === 0 ? "Finished. Ready to empty." : `${a.left} min left`}
                </p>
                <div className="h-1.5 rounded-full mt-3 overflow-hidden" style={{ background: "var(--line)" }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: a.left === 0 ? "var(--green)" : "var(--blue)" }}
                    initial={{ width: 0 }}
                    animate={{ width: `${((a.total - a.left) / a.total) * 100}%` }}
                    transition={{ type: "spring", stiffness: 60, damping: 16, delay: 0.3 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Sheet open={adding !== null} onClose={() => setAdding(null)} title={adding === "reply" ? "Remember to reply" : "Save what you're watching"}>
        <div className="flex flex-col gap-3">
          {adding === "reply" && (
            <label className="flex items-center gap-4 cursor-pointer">
              <Avatar name={form.title || "?"} src={form.avatar} />
              <span className="text-[15px] font-medium" style={{ color: "var(--blue)" }}>
                {form.avatar ? "Change photo" : "Add photo"}
              </span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) setForm({ ...form, avatar: await toAvatar(f).catch(() => "") });
                }}
              />
            </label>
          )}
          <input className="field" placeholder={adding === "reply" ? "Who? (e.g. Richie)" : "Title (e.g. Stranger Things)"} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus maxLength={60} />
          <input className="field" placeholder={adding === "reply" ? "About what? (optional)" : "Where you stopped (e.g. S2 · E4)"} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} maxLength={120} />
          <input
            className="field"
            placeholder={adding === "reply" ? "Their phone number (optional, opens the chat)" : "Netflix link (optional, we'll search otherwise)"}
            value={form.href}
            onChange={(e) => setForm({ ...form, href: e.target.value })}
            autoCapitalize="none"
            inputMode={adding === "reply" ? "tel" : "url"}
          />
          <button onClick={save} disabled={!form.title.trim()} className="pill mt-3 !h-12">
            <MessageCircle className={adding === "reply" ? "w-4 h-4" : "hidden"} /> Save
          </button>
        </div>
      </Sheet>
    </Rise>
  );
}
