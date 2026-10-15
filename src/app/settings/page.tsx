"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";
import { ChevronLeft, Plus, Minus, Loader2 } from "lucide-react";

type GearItem = { id: string; name: string };
type Integration = { id: string; provider: string; status: string };
type UserProfile = {
  id: string;
  homeAddress: string | null;
  workAddress: string | null;
  gearItems: GearItem[];
  integrations: Integration[];
};

const SERVICES: { provider: string; name: string; detail: string }[] = [
  { provider: "google_calendar", name: "Google Calendar", detail: "Shows your next event" },
  { provider: "home_assistant", name: "Home Assistant", detail: "Door, window and appliance status" },
  { provider: "weather_api", name: "Weather", detail: "Forecast for your route" },
  { provider: "tesla_api", name: "Tesla", detail: "Pre-condition your car" },
];

function Group({ title, footer, children }: { title: string; footer?: string; children: React.ReactNode }) {
  return (
    <section className="mb-7">
      <h2 className="eyebrow px-4 mb-2">{title}</h2>
      <div className="card overflow-hidden">{children}</div>
      {footer && (
        <p className="text-[13px] px-4 mt-2" style={{ color: "var(--text-2)" }}>
          {footer}
        </p>
      )}
    </section>
  );
}

function Row({ first, children }: { first?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 min-h-[52px]" style={first ? undefined : { borderTop: "1px solid var(--line)" }}>
      {children}
    </div>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      className="relative w-[51px] h-[31px] rounded-full shrink-0 transition-colors"
      style={{ background: on ? "var(--green)" : "var(--surface-2)", border: on ? "none" : "1px solid var(--line)" }}
    >
      <span
        className="absolute top-[2px] w-[27px] h-[27px] rounded-full bg-white shadow transition-all"
        style={{ left: on ? 22 : 2 }}
      />
    </button>
  );
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [home, setHome] = useState("");
  const [work, setWork] = useState("");
  const [newGear, setNewGear] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const say = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  };

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: UserProfile) => {
        setProfile(data);
        setHome(data.homeAddress ?? "");
        setWork(data.workAddress ?? "");
      })
      .catch(() => setLoadError(true));
  }, []);

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-[22px] font-semibold">Couldn&apos;t load settings</h1>
          <button className="btn mt-5" onClick={() => window.location.reload()}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--text-3)" }} />
      </div>
    );
  }

  const saveAddress = async (field: "homeAddress" | "workAddress", value: string) => {
    const trimmed = value.trim();
    if ((profile[field] ?? "") === trimmed) return;
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: trimmed }),
      });
      if (!res.ok) throw new Error();
      setProfile({ ...profile, [field]: trimmed });
      say("Saved");
    } catch {
      say("Couldn't save. Check your connection.");
    }
  };

  const addGear = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newGear.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/settings/gear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error();
      const added: GearItem = await res.json();
      setProfile({ ...profile, gearItems: [...profile.gearItems, added] });
      setNewGear("");
    } catch {
      say("Couldn't add item.");
    } finally {
      setBusy(false);
    }
  };

  const removeGear = async (id: string) => {
    const previous = profile.gearItems;
    setProfile({ ...profile, gearItems: previous.filter((g) => g.id !== id) });
    try {
      const res = await fetch(`/api/settings/gear?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setProfile((p) => (p ? { ...p, gearItems: previous } : p));
      say("Couldn't remove item.");
    }
  };

  const statusOf = (provider: string) => {
    if (provider === "google_calendar") return !!session;
    return profile.integrations.find((i) => i.provider === provider)?.status === "connected";
  };

  const toggleService = async (provider: string) => {
    if (provider === "google_calendar") {
      if (session) signOut({ callbackUrl: "/settings" });
      else signIn("google", { callbackUrl: "/settings" });
      return;
    }
    const next = statusOf(provider) ? "disconnected" : "connected";
    const prevList = profile.integrations;
    const exists = prevList.some((i) => i.provider === provider);
    setProfile({
      ...profile,
      integrations: exists
        ? prevList.map((i) => (i.provider === provider ? { ...i, status: next } : i))
        : [...prevList, { id: provider, provider, status: next }],
    });
    try {
      const res = await fetch("/api/settings/integrations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, status: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setProfile((p) => (p ? { ...p, integrations: prevList } : p));
      say("Couldn't update. Try again.");
    }
  };

  return (
    <div className="w-full max-w-[560px] mx-auto px-4 pb-16" style={{ paddingTop: "max(16px, env(safe-area-inset-top))" }}>
      <nav className="pt-3 pb-1">
        <Link href="/exit" className="inline-flex items-center -ml-1.5 text-[17px]" style={{ color: "var(--blue)" }}>
          <ChevronLeft className="w-6 h-6" />
          Back
        </Link>
      </nav>
      <h1 className="text-[34px] font-bold tracking-tight mb-6 mt-1">Settings</h1>

      <Group title="Places" footer="Used to calculate drive, transit and walking times when you leave.">
        <Row first>
          <label htmlFor="home" className="w-16 text-[16px] shrink-0">
            Home
          </label>
          <input
            id="home"
            value={home}
            onChange={(e) => setHome(e.target.value)}
            onBlur={() => saveAddress("homeAddress", home)}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            placeholder="Add address"
            autoComplete="street-address"
            className="flex-1 min-w-0 h-[52px] bg-transparent text-[16px] text-right focus:outline-none placeholder:text-[var(--text-3)]"
          />
        </Row>
        <Row>
          <label htmlFor="work" className="w-16 text-[16px] shrink-0">
            Work
          </label>
          <input
            id="work"
            value={work}
            onChange={(e) => setWork(e.target.value)}
            onBlur={() => saveAddress("workAddress", work)}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            placeholder="Add address"
            autoComplete="street-address"
            className="flex-1 min-w-0 h-[52px] bg-transparent text-[16px] text-right focus:outline-none placeholder:text-[var(--text-3)]"
          />
        </Row>
      </Group>

      <Group title="Things to bring" footer="These appear on your checklist every time you leave.">
        {profile.gearItems.map((g, i) => (
          <Row key={g.id} first={i === 0}>
            <button
              onClick={() => removeGear(g.id)}
              aria-label={`Remove ${g.name}`}
              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "var(--red)" }}
            >
              <Minus className="w-4 h-4 text-white" strokeWidth={3} />
            </button>
            <span className="text-[16px] py-3">{g.name}</span>
          </Row>
        ))}
        <form onSubmit={addGear} className="flex items-center gap-3 px-4 min-h-[52px]" style={profile.gearItems.length ? { borderTop: "1px solid var(--line)" } : undefined}>
          <button
            type="submit"
            disabled={!newGear.trim() || busy}
            aria-label="Add item"
            className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 disabled:opacity-40"
            style={{ background: "var(--green)" }}
          >
            <Plus className="w-4 h-4 text-white" strokeWidth={3} />
          </button>
          <input
            value={newGear}
            onChange={(e) => setNewGear(e.target.value)}
            placeholder="Add item"
            aria-label="New item"
            className="flex-1 min-w-0 h-[52px] bg-transparent text-[16px] focus:outline-none placeholder:text-[var(--text-3)]"
          />
        </form>
      </Group>

      <Group title="Connected services">
        {SERVICES.map((s, i) => {
          const on = statusOf(s.provider);
          const isGoogle = s.provider === "google_calendar";
          return (
            <Row key={s.provider} first={i === 0}>
              <div className="flex-1 min-w-0 py-2.5">
                <p className="text-[16px]">{s.name}</p>
                <p className="text-[13px] truncate" style={{ color: "var(--text-2)" }}>
                  {isGoogle && session?.user?.email ? session.user.email : s.detail}
                </p>
              </div>
              <Toggle on={on} onChange={() => toggleService(s.provider)} label={s.name} />
            </Row>
          );
        })}
      </Group>

      {toast && (
        <div
          role="status"
          className="toast fixed left-1/2 bottom-8 -translate-x-1/2 px-4 py-2.5 rounded-full text-[14px] font-medium shadow-lg"
          style={{ background: "var(--text)", color: "var(--bg)" }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
