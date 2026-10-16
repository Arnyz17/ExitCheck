"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Nfc, Loader2 } from "lucide-react";
import AutomateSheet from "./AutomateSheet";
import { useToast } from "./Toast";

/** Shown until the first sticker exists. One tap creates it; no forms. */
export default function Welcome({ userId }: { userId: string }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const create = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Front door", location: "Entryway", icon: "door-open" }),
      });
      if (!res.ok) throw new Error();
      const tag = await res.json();
      setLink(`${window.location.origin}/exit?tag_id=${tag.tagId}&user_id=${userId}`);
      setOpen(true);
    } catch {
      toast("Couldn't create it. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <motion.section
        className="tile p-7 sm:p-9 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 120, damping: 18, delay: 0.3 }}
      >
        <motion.div
          className="w-16 h-16 rounded-full flex items-center justify-center shrink-0"
          style={{ background: "var(--blue-soft)" }}
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <Nfc className="w-8 h-8" style={{ color: "var(--blue)" }} strokeWidth={1.5} />
        </motion.div>
        <div className="flex-1">
          <h2 className="text-[24px] font-semibold tracking-tight">Make your door do the work</h2>
          <p className="text-[16px] mt-1" style={{ color: "var(--text-2)" }}>
            Stick an NFC tag by your door. Touch it with your phone on the way out and this screen appears. One tap to set up.
          </p>
        </div>
        <button onClick={create} disabled={busy} className="pill !h-12 shrink-0">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} Set up my door
        </button>
      </motion.section>
      {link && <AutomateSheet open={open} onClose={() => setOpen(false)} link={link} />}
    </>
  );
}
