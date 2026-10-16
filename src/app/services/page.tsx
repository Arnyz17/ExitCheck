"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { signIn, signOut, useSession } from "next-auth/react";
import { Plus, Trash2, Loader2, Calendar, CloudSun, House, Webhook, Command, ExternalLink, Play } from "lucide-react";
import Sheet from "@/components/Sheet";
import Rise from "@/components/Rise";
import { useToast } from "@/components/Toast";
import { ICON_NAMES, iconFor } from "@/lib/icons";
import { isEnabled } from "@/lib/services";

type Action = { id: string; label: string; kind: "webhook" | "shortcut" | "link"; target: string; icon: string };
type Row = { provider: string; status: string };

const KINDS = [
  { id: "webhook", label: "Webhook", icon: Webhook, hint: "Calls a URL when you tap. Works with Home Assistant, IFTTT, Zapier and more.", placeholder: "https://…/api/webhook/your-id" },
  { id: "shortcut", label: "Shortcut", icon: Command, hint: "Runs an Apple Shortcut on your iPhone, iPad or Mac.", placeholder: "Name of your shortcut" },
  { id: "link", label: "App link", icon: ExternalLink, hint: "Opens any app or website, like tesla:// or a Spotify playlist.", placeholder: "https://… or app://" },
] as const;

const TEMPLATES = [
  { label: "Home Assistant", kind: "webhook", icon: "lightbulb", placeholder: "http://homeassistant.local:8123/api/webhook/…" },
  { label: "IFTTT", kind: "webhook", icon: "zap", placeholder: "https://maker.ifttt.com/trigger/…/with/key/…" },
  { label: "Apple Shortcut", kind: "shortcut", icon: "power", placeholder: "Goodbye" },
  { label: "Open an app", kind: "link", icon: "car", placeholder: "tesla://" },
] as const;

function Toggle({ on, onChange, label, busy }: { on: boolean; onChange: () => void; label: string; busy?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      disabled={busy}
      className="relative w-[52px] h-[32px] rounded-full shrink-0"
      style={{ background: on ? "var(--green)" : "var(--surface-2)", boxShadow: on ? "none" : "inset 0 0 0 1px var(--line)", transition: "background 0.25s" }}
    >
      <motion.span
        className="absolute top-[2px] left-[2px] w-[28px] h-[28px] rounded-full bg-white"
        style={{ boxShadow: "0 2px 6px rgba(0,0,0,0.25)" }}
        animate={{ x: on ? 20 : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
    </button>
  );
}

export default function ServicesPage() {
  const toast = useToast();
  const { data: session } = useSession();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [actions, setActions] = useState<Action[] | null>(null);
  const [sheet, setSheet] = useState(false);
  const [form, setForm] = useState<{ label: string; kind: Action["kind"]; target: string; icon: string }>({
    label: "",
    kind: "webhook",
    target: "",
    icon: "power",
  });
  const [placeholder, setPlaceholder] = useState<string>(KINDS[0].placeholder);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [s, a] = await Promise.all([fetch("/api/settings").then((r) => r.json()), fetch("/api/actions").then((r) => r.json())]);
    setRows(s.integrations ?? []);
    setActions(a.actions ?? []);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().catch(() => {
      setRows([]);
      setActions([]);
    });
  }, [load]);

  const toggleBuiltin = async (provider: string) => {
    if (!rows) return;
    const next = isEnabled(provider, rows) ? "disconnected" : "connected";
    const prev = rows;
    setRows([...rows.filter((r) => r.provider !== provider), { provider, status: next }]);
    try {
      const res = await fetch("/api/settings/integrations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, status: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setRows(prev);
      toast("Couldn't update. Try again.");
    }
  };

  const openSheet = (preset?: (typeof TEMPLATES)[number]) => {
    const kind = preset?.kind ?? "webhook";
    setForm({ label: preset && preset.label !== "Open an app" && preset.label !== "Apple Shortcut" ? preset.label : "", kind, target: "", icon: preset?.icon ?? "power" });
    setPlaceholder(preset?.placeholder ?? KINDS.find((k) => k.id === kind)!.placeholder);
    setSheet(true);
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Couldn't save");
      await load();
      setSheet(false);
      toast("Action added to Today");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (a: Action) => {
    const prev = actions;
    setActions((p) => p?.filter((x) => x.id !== a.id) ?? p);
    try {
      const res = await fetch(`/api/actions?id=${encodeURIComponent(a.id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setActions(prev);
      toast("Couldn't remove it.");
    }
  };

  const test = async (a: Action) => {
    if (a.kind === "shortcut") return void window.open(`shortcuts://run-shortcut?name=${encodeURIComponent(a.target)}`, "_self");
    if (a.kind === "link") return void window.open(a.target, "_blank");
    setTesting(a.id);
    try {
      const res = await fetch("/api/actions/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId: a.id }),
      });
      const body = await res.json();
      toast(res.ok ? body.message : body.error);
    } catch {
      toast("Couldn't reach the service");
    } finally {
      setTesting(null);
    }
  };

  const services = [
    {
      key: "google_calendar",
      title: "Google Calendar",
      body: session?.user?.email ? `Connected as ${session.user.email}` : "Show your next event and how long to get there.",
      icon: Calendar,
      color: "var(--blue)",
      on: !!session,
      change: () => (session ? signOut({ callbackUrl: "/services" }) : signIn("google", { callbackUrl: "/services" })),
    },
    {
      key: "weather_api",
      title: "Weather",
      body: "Live conditions and an umbrella reminder. Powered by Open-Meteo.",
      icon: CloudSun,
      color: "var(--orange)",
      on: rows ? isEnabled("weather_api", rows) : false,
      change: () => toggleBuiltin("weather_api"),
    },
    {
      key: "home_assistant",
      title: "Home status",
      body: "Doors, windows and appliances. Uses demo sensor data until a hub is linked.",
      icon: House,
      color: "var(--green)",
      on: rows ? isEnabled("home_assistant", rows) : false,
      change: () => toggleBuiltin("home_assistant"),
    },
  ];

  const kindMeta = (k: string) => KINDS.find((x) => x.id === k)!;

  return (
    <div className="w-full max-w-[1024px] mx-auto px-4 sm:px-6 pb-24">
      <section className="text-center pt-12 sm:pt-20 pb-10 sm:pb-14">
        <p className="eyebrow">Services</p>
        <h1 className="display gradient-text mt-3">Connect everything.</h1>
        <p className="text-[19px] sm:text-[22px] mt-4 max-w-[600px] mx-auto" style={{ color: "var(--text-2)" }}>
          Bring your calendar, your home, and your favorite apps into one glance.
        </p>
      </section>

      <Rise>
        <h2 className="eyebrow mb-3 px-1">Built in</h2>
      </Rise>
      <div className="grid md:grid-cols-3 gap-4 sm:gap-5">
        {services.map((s, i) => (
          <Rise key={s.key} delay={i * 0.06}>
            <article className="tile p-6 h-full flex flex-col">
              <div className="flex items-start justify-between">
                <s.icon className="w-9 h-9" strokeWidth={1.5} style={{ color: s.color }} />
                <Toggle on={s.on} onChange={s.change} label={s.title} busy={rows === null} />
              </div>
              <h3 className="text-[21px] font-semibold tracking-tight mt-5">{s.title}</h3>
              <p className="text-[14px] mt-1.5" style={{ color: "var(--text-2)" }}>
                {s.body}
              </p>
              <p className="text-[13px] font-semibold mt-auto pt-4" style={{ color: s.on ? "var(--green)" : "var(--text-3)" }}>
                {s.on ? "On" : "Off"}
              </p>
            </article>
          </Rise>
        ))}
      </div>

      <Rise>
        <div className="flex items-end justify-between mt-16 mb-4 px-1">
          <div>
            <p className="eyebrow">Quick actions</p>
            <h2 className="headline mt-1">Your apps</h2>
          </div>
          <button onClick={() => openSheet()} className="pill">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </Rise>

      {actions === null ? (
        <div className="shimmer rounded-[28px] h-[140px]" />
      ) : actions.length === 0 ? (
        <Rise>
          <div className="tile p-8 text-center">
            <p className="text-[19px] font-semibold">Nothing connected yet</p>
            <p className="text-[15px] mt-1 mb-6" style={{ color: "var(--text-2)" }}>
              Add a button for the apps you use. It shows up on Today and runs with one tap.
            </p>
            <div className="flex flex-wrap justify-center gap-2.5">
              {TEMPLATES.map((t) => {
                const Icon = iconFor(t.icon);
                return (
                  <button key={t.label} onClick={() => openSheet(t)} className="pill pill-plain">
                    <Icon className="w-4 h-4" /> {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        </Rise>
      ) : (
        <div className="tile overflow-hidden">
          <AnimatePresence initial={false}>
            {actions.map((a, i) => {
              const Icon = iconFor(a.icon);
              const K = kindMeta(a.kind);
              return (
                <motion.div
                  key={a.id}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                  <div className={`flex items-center gap-4 p-5 ${i > 0 ? "hairline" : ""}`}>
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "var(--blue-soft)" }}>
                      <Icon className="w-6 h-6" style={{ color: "var(--blue)" }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[17px] font-semibold truncate">{a.label}</p>
                      <p className="text-[13px] truncate flex items-center gap-1.5" style={{ color: "var(--text-2)" }}>
                        <K.icon className="w-3.5 h-3.5 shrink-0" /> {K.label} · {a.target}
                      </p>
                    </div>
                    <button onClick={() => test(a)} aria-label={`Test ${a.label}`} className="pill pill-quiet !px-4">
                      {testing === a.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                      Test
                    </button>
                    <button onClick={() => remove(a)} aria-label={`Delete ${a.label}`} className="pill pill-danger !px-3.5">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <Sheet open={sheet} onClose={() => setSheet(false)} title="Add a quick action">
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-2 p-1 rounded-2xl" style={{ background: "var(--surface-2)" }}>
            {KINDS.map((k) => {
              const on = form.kind === k.id;
              return (
                <button
                  key={k.id}
                  onClick={() => {
                    setForm({ ...form, kind: k.id });
                    setPlaceholder(k.placeholder);
                  }}
                  className="relative h-10 rounded-xl text-[14px] font-medium"
                  style={{ color: on ? "var(--text)" : "var(--text-2)" }}
                >
                  {on && (
                    <motion.span
                      layoutId="kind-pill"
                      className="absolute inset-0 rounded-xl"
                      style={{ background: "var(--surface)", boxShadow: "0 1px 4px rgba(0,0,0,0.12)" }}
                      transition={{ type: "spring", stiffness: 500, damping: 36 }}
                    />
                  )}
                  <span className="relative">{k.label}</span>
                </button>
              );
            })}
          </div>
          <p className="text-[13px] px-1" style={{ color: "var(--text-2)" }}>
            {kindMeta(form.kind).hint}
          </p>
          <input className="field" placeholder="Button name (e.g. Lights off)" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} maxLength={30} autoFocus />
          <input className="field" placeholder={placeholder} value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} autoCapitalize="none" autoCorrect="off" />
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
          <button onClick={save} disabled={!form.label.trim() || !form.target.trim() || saving} className="pill mt-4 !h-12">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Add to Today
          </button>
        </div>
      </Sheet>
    </div>
  );
}
