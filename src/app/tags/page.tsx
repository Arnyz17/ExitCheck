"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Copy, Nfc, ExternalLink, Trash2, Pencil, Loader2, Smartphone, ScanLine, Link2 } from "lucide-react";
import Sheet from "@/components/Sheet";
import AutomateSheet from "@/components/AutomateSheet";
import Rise from "@/components/Rise";
import { useToast } from "@/components/Toast";
import { ICON_NAMES, iconFor } from "@/lib/icons";

type Tag = {
  id: string;
  tagId: string;
  name: string;
  location: string;
  icon: string;
  scanCount: number;
  lastScannedAt: string | null;
  items: string;
};

const PRESETS = [
  { name: "Front door", location: "Entryway", icon: "door-open" },
  { name: "Garage", location: "Garage", icon: "car" },
  { name: "Office", location: "Desk", icon: "briefcase" },
  { name: "Gym bag", location: "Closet", icon: "dumbbell" },
];

function ago(iso: string | null) {
  if (!iso) return "Never scanned";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "Scanned just now";
  if (s < 3600) return `Scanned ${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `Scanned ${Math.floor(s / 3600)} h ago`;
  return `Scanned ${Math.floor(s / 86400)} d ago`;
}

export default function TagsPage() {
  const toast = useToast();
  const [tags, setTags] = useState<Tag[] | null>(null);
  const [userId, setUserId] = useState("usr_123");
  const [origin, setOrigin] = useState("");
  const [editing, setEditing] = useState<Tag | "new" | null>(null);
  const [form, setForm] = useState({ name: "", location: "", icon: "door-open", items: "" });
  const [saving, setSaving] = useState(false);
  const [nfcSupported, setNfcSupported] = useState(false);
  const [automate, setAutomate] = useState<Tag | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrigin(window.location.origin);
    setNfcSupported("NDEFReader" in window);
  }, []);

  const load = useCallback(async () => {
    const res = await fetch("/api/tags");
    const data = await res.json();
    setTags(data.tags);
    setUserId(data.userId);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().catch(() => setTags([]));
  }, [load]);

  const urlFor = (t: Tag) => `${origin}/exit?tag_id=${t.tagId}&user_id=${userId}`;
  const isLocal = /^(localhost|127\.|192\.168\.|10\.)/.test(origin.replace(/^https?:\/\//, ""));

  const open = (t: Tag | "new", preset?: (typeof PRESETS)[number]) => {
    setForm(t === "new" ? { items: "", ...(preset ?? { name: "", location: "", icon: "door-open" }) } : { name: t.name, location: t.location, icon: t.icon, items: t.items });
    setEditing(t);
  };

  const save = async () => {
    if (!form.name.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/tags", {
        method: editing === "new" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing === "new" ? form : { id: (editing as Tag).id, ...form }),
      });
      if (!res.ok) throw new Error();
      await load();
      setEditing(null);
      toast(editing === "new" ? "Sticker added" : "Saved");
    } catch {
      toast("Couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (t: Tag) => {
    const prev = tags;
    setTags((p) => p?.filter((x) => x.id !== t.id) ?? p);
    try {
      const res = await fetch(`/api/tags?id=${encodeURIComponent(t.id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast("Sticker removed");
    } catch {
      setTags(prev);
      toast("Couldn't remove it.");
    }
  };

  const copy = async (t: Tag) => {
    try {
      await navigator.clipboard.writeText(urlFor(t));
      toast("Link copied");
    } catch {
      toast("Couldn't copy. Long-press the link instead.");
    }
  };

  const write = async (t: Tag) => {
    try {
      // @ts-expect-error: Web NFC isn't in the standard DOM typings
      const reader = new NDEFReader();
      toast("Hold your phone to the sticker");
      await reader.write({ records: [{ recordType: "url", data: urlFor(t) }] });
      toast("Written to sticker ✓");
    } catch {
      toast("Couldn't write. Hold the phone closer and try again.");
    }
  };

  return (
    <div className="w-full max-w-[1024px] mx-auto px-4 sm:px-6 pb-24">
      <section className="text-center pt-12 sm:pt-20 pb-10 sm:pb-14">
        <p className="eyebrow">Stickers</p>
        <h1 className="display gradient-text mt-3">Tap. Know.</h1>
        <p className="text-[19px] sm:text-[22px] mt-4 max-w-[560px] mx-auto" style={{ color: "var(--text-2)" }}>
          Put an NFC sticker by every door. One tap with your phone opens your ExitCheck for that spot.
        </p>
        <button onClick={() => open("new")} className="pill mt-7">
          <Plus className="w-4 h-4" /> Add a sticker
        </button>
      </section>

      {isLocal && (
        <Rise>
          <div className="tile p-5 mb-5 flex gap-3 items-start" style={{ background: "var(--orange-soft)", boxShadow: "none" }}>
            <Smartphone className="w-5 h-5 mt-0.5 shrink-0" style={{ color: "var(--orange)" }} />
            <p className="text-[14px]">
              You&apos;re on <b>{origin.replace(/^https?:\/\//, "")}</b>, which your phone can&apos;t reach from a sticker. Open ExitCheck at its
              deployed address (or your computer&apos;s network address) before writing stickers so the link works everywhere.
            </p>
          </div>
        </Rise>
      )}

      {tags === null ? (
        <div className="grid md:grid-cols-2 gap-5">
          {[0, 1].map((i) => (
            <div key={i} className="shimmer rounded-[28px] h-[200px]" />
          ))}
        </div>
      ) : tags.length === 0 ? (
        <Rise>
          <div className="tile p-8 sm:p-12 text-center">
            <motion.div
              className="w-20 h-20 rounded-full mx-auto flex items-center justify-center"
              style={{ background: "var(--blue-soft)" }}
              animate={{ scale: [1, 1.07, 1] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
            >
              <Nfc className="w-9 h-9" style={{ color: "var(--blue)" }} strokeWidth={1.5} />
            </motion.div>
            <h2 className="headline mt-6">Add your first sticker</h2>
            <p className="text-[17px] mt-2 mb-7" style={{ color: "var(--text-2)" }}>
              Start with a spot you walk past every day.
            </p>
            <div className="flex flex-wrap justify-center gap-2.5">
              {PRESETS.map((p) => {
                const Icon = iconFor(p.icon);
                return (
                  <button key={p.name} onClick={() => open("new", p)} className="pill pill-plain">
                    <Icon className="w-4 h-4" /> {p.name}
                  </button>
                );
              })}
            </div>
          </div>
        </Rise>
      ) : (
        <div className="grid md:grid-cols-2 gap-4 sm:gap-5">
          <AnimatePresence mode="popLayout">
            {tags.map((t) => {
              const Icon = iconFor(t.icon);
              return (
                <motion.article
                  key={t.id}
                  layout
                  initial={{ opacity: 0, scale: 0.94, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 260, damping: 26 }}
                  className="tile p-6"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "var(--blue-soft)" }}>
                      <Icon className="w-7 h-7" style={{ color: "var(--blue)" }} strokeWidth={1.6} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[22px] font-semibold tracking-tight truncate">{t.name}</h3>
                      <p className="text-[15px] truncate" style={{ color: "var(--text-2)" }}>
                        {t.location || "No location"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[28px] font-semibold leading-none tracking-tight">{t.scanCount}</p>
                      <p className="text-[12px] mt-1" style={{ color: "var(--text-2)" }}>
                        scans
                      </p>
                    </div>
                  </div>

                  <p className="flex items-center gap-1.5 text-[13px] mt-4" style={{ color: "var(--text-2)" }}>
                    <ScanLine className="w-3.5 h-3.5" /> {ago(t.lastScannedAt)}
                  </p>

                  <div className="flex flex-wrap gap-2 mt-5">
                    {nfcSupported && (
                      <button onClick={() => write(t)} className="pill">
                        <Nfc className="w-4 h-4" /> Write to sticker
                      </button>
                    )}
                    <button onClick={() => copy(t)} className={nfcSupported ? "pill pill-quiet" : "pill"}>
                      <Copy className="w-4 h-4" /> Copy link
                    </button>
                    <button onClick={() => setAutomate(t)} className="pill pill-quiet">
                      <Smartphone className="w-4 h-4" /> Make it automatic
                    </button>
                    <a href={urlFor(t)} target="_blank" rel="noopener noreferrer" className="pill pill-plain">
                      <ExternalLink className="w-4 h-4" /> Test
                    </a>
                    <button onClick={() => open(t)} aria-label={`Edit ${t.name}`} className="pill pill-plain !px-3.5">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => remove(t)} aria-label={`Delete ${t.name}`} className="pill pill-danger !px-3.5">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <Rise>
        <section className="mt-16">
          <h2 className="headline text-center mb-8">How it works</h2>
          <div className="grid md:grid-cols-3 gap-4 sm:gap-5">
            {[
              { icon: Plus, title: "1. Add a sticker", body: "Name the spot it lives: front door, gym bag, car." },
              { icon: Link2, title: "2. Write the link", body: "Use “Write to sticker” on Android, or paste the copied link into any NFC writer app on iPhone." },
              { icon: Nfc, title: "3. Tap to check", body: "Hold your phone to the sticker and your checklist opens instantly." },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="tile p-6">
                <Icon className="w-7 h-7" style={{ color: "var(--blue)" }} strokeWidth={1.6} />
                <h3 className="text-[19px] font-semibold mt-4">{title}</h3>
                <p className="text-[15px] mt-1.5" style={{ color: "var(--text-2)" }}>
                  {body}
                </p>
              </div>
            ))}
          </div>
        </section>
      </Rise>

      <AutomateSheet open={automate !== null} onClose={() => setAutomate(null)} link={automate ? urlFor(automate) : ""} />

      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "New sticker" : "Edit sticker"}>
        <div className="flex flex-col gap-3">
          <input
            className="field"
            placeholder="Name (e.g. Front door)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            autoFocus
            maxLength={40}
          />
          <input
            className="field"
            placeholder="Where is it? (optional)"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            maxLength={60}
          />
          <input
            className="field"
            placeholder="Also bring from here (e.g. Gym shoes, Towel)"
            value={form.items}
            onChange={(e) => setForm({ ...form, items: e.target.value })}
            maxLength={200}
          />
          <p className="text-[13px] px-1 -mt-1" style={{ color: "var(--text-2)" }}>
            Separate items with commas. They appear only when you tap this sticker.
          </p>
          <p className="eyebrow mt-3">Icon</p>
          <div className="grid grid-cols-5 gap-2">
            {ICON_NAMES.map((n) => {
              const Icon = iconFor(n);
              const on = form.icon === n;
              return (
                <button
                  key={n}
                  onClick={() => setForm({ ...form, icon: n })}
                  aria-label={n}
                  aria-pressed={on}
                  className="aspect-square rounded-2xl flex items-center justify-center transition-colors"
                  style={{ background: on ? "var(--blue)" : "var(--surface-2)", color: on ? "#fff" : "var(--text)" }}
                >
                  <Icon className="w-5 h-5" />
                </button>
              );
            })}
          </div>
          <button onClick={save} disabled={!form.name.trim() || saving} className="pill mt-4 !h-12">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {editing === "new" ? "Add sticker" : "Save"}
          </button>
        </div>
      </Sheet>
    </div>
  );
}
