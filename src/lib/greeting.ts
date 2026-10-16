export interface DaySummary {
  total: number;
  done: number;
  hasClass: boolean;
}

const pick = <T,>(options: T[], seed: number) => options[Math.abs(seed) % options.length];

/** One warm, slightly playful line that reflects the time of day and (if linked) the calendar. */
export function dayMessage(now: Date, day: DaySummary | null | undefined): string {
  const h = now.getHours();
  const dow = now.getDay();
  const seed = now.getFullYear() * 400 + now.getMonth() * 31 + now.getDate();
  const friday = dow === 5;
  const weekend = dow === 0 || dow === 6;

  if (h < 5) return "Burning the midnight oil? Get some rest soon.";

  if (day) {
    const left = day.total - day.done;
    if (day.total === 0) return weekend ? "Nothing on the calendar. Enjoy the open day." : "A clear calendar today. Make it count.";
    if (h < 12 && day.done === 0) {
      return day.hasClass
        ? pick(["Hope your classes go smoothly today.", "Go get 'em in class today."], seed)
        : pick(["Hope your day goes smoothly.", "Big day ahead. You've got this."], seed);
    }
    if (left > 0 && h < 18) return day.hasClass ? "Hope class isn't too painful. Almost through it." : `${left} thing${left > 1 ? "s" : ""} left on your calendar. Nearly there.`;
    if (day.done > 0) {
      if (day.hasClass) {
        return pick(
          ["Hope class today wasn't too painful.", "Survived class today. Nice work.", "Classes done. Time to unwind."],
          seed
        );
      }
      return "Hope you had a great day.";
    }
  }

  if (h < 12) return friday ? "Happy Friday. Make it a good one." : pick(["Make it a good one today.", "Fresh day. Let's go."], seed);
  if (h < 18) return "Hope the day's treating you well.";
  return pick(["Hope you had a great day.", "Hope today was kind to you."], seed);
}
