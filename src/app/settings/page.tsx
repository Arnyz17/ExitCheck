"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, X, Loader2, Check } from "lucide-react";
import Rise from "@/components/Rise";
import { useToast } from "@/components/Toast";

type GearItem = { id: string; name: string };
type Profile = {
  name: string | null;
  homeAddress: string | null;
  workAddress: string | null;
  gearItems: GearItem[];
};

const ACCENTS = [
  { name: "Blue", value: "#0071e3" },
  { name: "Green", value: "#1d9b3f" },
  { name: "Orange", value: "#e07b00" },
  { name: "Pink", value: "#e0245e" },
  { name: "Purple", value: "#8944ab" },
  { name: "Graphite", value: "#636366" },
];

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <Rise>
      <section className="mb-12">
        <h2 className="headline">{title}</h2>
        {subtitle && (
          <p className="text-[17px] mt-1.5 mb-5" style={{ color: "var(--text-2)" }}>
            {subtitle}
          </p>
        )}
        <div className={subtitle ? "" : "mt-5"}>{children}</div>
      </section>
    </Rise>
  );
}

export default function YouPage() {
  const toast = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [failed, setFailed] = useState(false);
  const [name, setName] = useState("");
  const [home, setHome] = useState("");
  const [work, setWork] = useState("");
  const [gear, setGear] = useState("");
  const [accent, setAccent] = useState<string | null>(null);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAccent(localStorage.getItem("exitcheck.accent"));
    } catch {}
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((p: Profile) => {
        setProfile(p);
        setName(p.name && p.name !== "ExitCheck User" ? p.name : "");
        setHome(p.homeAddress ?? "");
        setWork(p.workAddress ?? "");
      })
      .catch(() => setFailed(true));
  }, []);

  if (failed)
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center p-6">
        <h1 className="text-[24px] font-semibold">Couldn&apos;t load your profile</h1>
        <button className="pill" onClick={() => window.location.reload()}>
          Try again
        </button>
      </div>
    );

  if (!profile)
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--text-3)" }} />
      </div>
    );

  const save = async (field: "name" | "homeAddress" | "workAddress", value: string) => {
    const v = value.trim();
    const current = field === "name" ? (profile.name && profile.name !== "ExitCheck User" ? profile.name : "") : profile[field] ?? "";
    if (current === v) return;
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: v }),
      });
      if (!res.ok) throw new Error();
      setProfile({ ...profile, [field]: v });
      toast("Saved");
    } catch {
      toast("Couldn't save. Check your connection.");
    }
  };

  const pick = (value: string) => {
    setAccent(value);
    document.documentElement.style.setProperty("--blue", value);
    try {
      localStorage.setItem("exitcheck.accent", value);
    } catch {}
  };

  const addGear = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = gear.trim();
    if (!n) return;
    try {
      const res = await fetch("/api/settings/gear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n }),
      });
      if (!res.ok) throw new Error();
      const item: GearItem = await res.json();
      setProfile({ ...profile, gearItems: [...profile.gearItems, item] });
      setGear("");
    } catch {
      toast("Couldn't add that.");
    }
  };

  const removeGear = async (id: string) => {
    const prev = profile.gearItems;
    setProfile({ ...profile, gearItems: prev.filter((g) => g.id !== id) });
    try {
      const res = await fetch(`/api/settings/gear?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setProfile((p) => (p ? { ...p, gearItems: prev } : p));
      toast("Couldn't remove that.");
    }
  };

  const commit = (e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && e.currentTarget.blur();

  return (
    <div className="w-full max-w-[720px] mx-auto px-4 sm:px-6 pb-24">
      <section className="text-center pt-12 sm:pt-20 pb-12">
        <p className="eyebrow">You</p>
        <h1 className="display gradient-text mt-3">Make it yours.</h1>
      </section>

      <Section title="Your name" subtitle="Used to greet you each time you leave.">
        <input
          className="field"
          placeholder="What should we call you?"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => save("name", name)}
          onKeyDown={commit}
          autoComplete="given-name"
          maxLength={40}
        />
      </Section>

      <Section title="Accent color" subtitle="Pick the color that runs through the app.">
        <div className="flex flex-wrap gap-4">
          {ACCENTS.map((a) => {
            const on = (accent ?? ACCENTS[0].value) === a.value;
            return (
              <motion.button
                key={a.value}
                onClick={() => pick(a.value)}
                aria-label={a.name}
                aria-pressed={on}
                whileTap={{ scale: 0.88 }}
                whileHover={{ scale: 1.08 }}
                className="relative w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: a.value }}
              >
                <AnimatePresence>
                  {on && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 500, damping: 24 }}>
                      <Check className="w-5 h-5 text-white" strokeWidth={3} />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>
      </Section>

      <Section title="Places" subtitle="We use these to work out how long it takes to get there.">
        <div className="flex flex-col gap-3">
          <label className="block">
            <span className="eyebrow block mb-2 px-1">Home</span>
            <input className="field" placeholder="Add your home address" value={home} onChange={(e) => setHome(e.target.value)} onBlur={() => save("homeAddress", home)} onKeyDown={commit} autoComplete="street-address" />
          </label>
          <label className="block">
            <span className="eyebrow block mb-2 px-1">Work</span>
            <input className="field" placeholder="Add your work address" value={work} onChange={(e) => setWork(e.target.value)} onBlur={() => save("workAddress", work)} onKeyDown={commit} autoComplete="street-address" />
          </label>
        </div>
      </Section>

      <Section title="Things to bring" subtitle="These show up on your checklist every time.">
        <div className="flex flex-wrap gap-2.5 mb-5">
          <AnimatePresence mode="popLayout">
            {profile.gearItems.map((g) => (
              <motion.span
                key={g.id}
                layout
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
                className="inline-flex items-center gap-1 pl-4 pr-1.5 h-11 rounded-full text-[16px] font-medium"
                style={{ background: "var(--surface)", boxShadow: "var(--shadow)" }}
              >
                {g.name}
                <button onClick={() => removeGear(g.id)} aria-label={`Remove ${g.name}`} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ color: "var(--text-2)" }}>
                  <X className="w-4 h-4" />
                </button>
              </motion.span>
            ))}
          </AnimatePresence>
          {profile.gearItems.length === 0 && (
            <p className="text-[15px]" style={{ color: "var(--text-2)" }}>
              Nothing yet. Add keys, a wallet, a badge…
            </p>
          )}
        </div>
        <form onSubmit={addGear} className="flex gap-2.5">
          <input className="field" placeholder="Add an item" value={gear} onChange={(e) => setGear(e.target.value)} aria-label="New item" maxLength={40} />
          <button type="submit" disabled={!gear.trim()} className="pill !h-[50px]">
            <Plus className="w-4 h-4" /> Add
          </button>
        </form>
      </Section>
    </div>
  );
}
