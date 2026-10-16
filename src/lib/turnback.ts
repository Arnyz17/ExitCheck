export interface TurnBackInput {
  curToHome: number; // minutes
  homeToDest: number;
  curToDest: number;
  /** Minutes until you need to be there (null when there is no deadline). */
  minutesLeft: number | null;
}

export type TurnBackResult = {
  extraMinutes: number;
  verdict: "turn_back" | "keep_going" | "no_deadline";
  spareIfTurn: number | null;
  spareIfStay: number | null;
  message: string;
};

/** Is it worth going back for the thing you forgot? Compares the detour with your slack. */
export function turnBack(i: TurnBackInput): TurnBackResult {
  const extra = Math.max(0, Math.round(i.curToHome + i.homeToDest - i.curToDest));
  if (i.minutesLeft === null) {
    return {
      extraMinutes: extra,
      verdict: "no_deadline",
      spareIfTurn: null,
      spareIfStay: null,
      message: `Going back adds about ${extra} min to your trip.`,
    };
  }
  const spareStay = Math.round(i.minutesLeft - i.curToDest);
  const spareTurn = spareStay - extra;
  if (spareTurn >= 0) {
    return {
      extraMinutes: extra,
      verdict: "turn_back",
      spareIfTurn: spareTurn,
      spareIfStay: spareStay,
      message: `Go back. It adds ${extra} min and you'd still arrive ${spareTurn} min early.`,
    };
  }
  return {
    extraMinutes: extra,
    verdict: "keep_going",
    spareIfTurn: spareTurn,
    spareIfStay: spareStay,
    message:
      spareStay >= 0
        ? `Keep going. Turning back adds ${extra} min and you'd be ${Math.abs(spareTurn)} min late.`
        : `You're already running ${Math.abs(spareStay)} min late. Turning back makes it ${Math.abs(spareTurn)} min.`,
  };
}
