import { siNetflix, siBosch, siImessage } from "simple-icons";

const ICONS = { netflix: siNetflix, bosch: siBosch, imessage: siImessage } as const;

/** Brand marks used to label the services they stand for. Trademarks belong to their owners. */
export default function BrandIcon({ brand, size = 22 }: { brand: keyof typeof ICONS | "govee"; size?: number }) {
  if (brand === "govee") {
    return (
      <span className="font-bold tracking-tight" style={{ fontSize: size * 0.8, color: "var(--text)" }}>
        govee
      </span>
    );
  }
  const i = ICONS[brand];
  return (
    <svg role="img" aria-label={i.title} viewBox="0 0 24 24" width={size} height={size} fill={`#${i.hex}`}>
      <path d={i.path} />
    </svg>
  );
}
