"use client";

import { Copy, Nfc, Zap, Check } from "lucide-react";
import Sheet from "./Sheet";
import { useToast } from "./Toast";

const Step = ({ n, children }: { n: number; children: React.ReactNode }) => (
  <li className="flex gap-3.5 py-3">
    <span
      className="w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-semibold shrink-0 mt-0.5"
      style={{ background: "var(--blue-soft)", color: "var(--blue)" }}
    >
      {n}
    </span>
    <span className="text-[16px] leading-snug">{children}</span>
  </li>
);

export default function AutomateSheet({ open, onClose, link }: { open: boolean; onClose: () => void; link: string }) {
  const toast = useToast();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast("Link copied");
    } catch {
      toast("Couldn't copy the link");
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Make it automatic">
      <p className="text-[15px] -mt-3 mb-5" style={{ color: "var(--text-2)" }}>
        Do this once. After that, holding your iPhone to the sticker opens your check by itself.
      </p>

      <button onClick={copy} className="pill w-full !h-12 mb-6">
        <Copy className="w-4 h-4" /> Copy this sticker&apos;s link
      </button>

      <div className="flex items-center gap-2 mb-1">
        <Nfc className="w-4 h-4" style={{ color: "var(--blue)" }} />
        <h3 className="text-[17px] font-semibold">Step 1 · Put the link on the sticker</h3>
      </div>
      <ol className="mb-6">
        <Step n={1}>Download any free NFC writer app (for example “NFC Tools”).</Step>
        <Step n={2}>Choose Write → Add a record → URL, and paste the link.</Step>
        <Step n={3}>Hold the phone to the sticker. Done. Android can do this right here with “Write to sticker”.</Step>
      </ol>

      <div className="flex items-center gap-2 mb-1">
        <Zap className="w-4 h-4" style={{ color: "var(--blue)" }} />
        <h3 className="text-[17px] font-semibold">Step 2 · Skip the tap on the banner (iPhone)</h3>
      </div>
      <ol className="mb-5">
        <Step n={1}>Open Shortcuts → Automation → New Automation → NFC.</Step>
        <Step n={2}>Tap Scan and hold the phone to the sticker.</Step>
        <Step n={3}>Add action “Open URLs”, paste the link, and choose Run Immediately.</Step>
      </ol>

      <div className="rounded-2xl p-4 flex gap-3" style={{ background: "var(--green-soft)" }}>
        <Check className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "var(--green)" }} />
        <p className="text-[14px]">
          From then on: walk to the door, touch the sticker with your phone, and your check opens instantly. No app to find, no sign-in.
        </p>
      </div>
      <p className="text-[12px] mt-3" style={{ color: "var(--text-3)" }}>
        iPhones read NFC only within an inch or two, and a web app can&apos;t detect when you walk by on its own. The tap is what makes it reliable and private.
      </p>
    </Sheet>
  );
}
