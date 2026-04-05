import { CheckCircle2, Clock3, LockKeyhole, Sparkles, Waves } from "lucide-react";

import { PLAYER_STATUS, ROOM_STATUS } from "@/lib/faultline/constants";
import type { FaultlineRoomAccount } from "@/lib/faultline/types";
import { cn, formatCountdown, formatLamports } from "@/lib/utils";

type TimelineState = "complete" | "live" | "upcoming";

function getStateTone(state: TimelineState) {
  return state === "live" ? "text-fault-flare" : state === "complete" ? "text-fault-signal" : "text-white/48";
}

function getWindowLabel(room: FaultlineRoomAccount, currentSlot: number) {
  if (room.status === ROOM_STATUS.Open) {
    return room.playerCount === 0 || Number(room.joinDeadlineSlot) === 0 ? "starts on first seat" : formatCountdown(Number(room.joinDeadlineSlot) - currentSlot);
  }
  if (room.status === ROOM_STATUS.Commit) {
    return Number(room.commitDeadlineSlot) === 0 ? "live" : formatCountdown(Number(room.commitDeadlineSlot) - currentSlot);
  }
  if (room.status === ROOM_STATUS.Reveal) {
    return Number(room.revealDeadlineSlot) === 0 ? "live" : formatCountdown(Number(room.revealDeadlineSlot) - currentSlot);
  }
  return "settled";
}

export function RoomTimeline({ room, currentSlot }: { room: FaultlineRoomAccount; currentSlot: number }) {
  const claimableSeats = Array.from({ length: room.playerCount }, (_, index) => index).filter(
    (index) => room.playerRewardsLamports[index] > 0n && !room.playerClaimed[index]
  ).length;
  const committedSeats = Array.from({ length: room.playerCount }, (_, index) => index).filter((index) => room.playerStatuses[index] === PLAYER_STATUS.Committed).length;

  const steps = [
    {
      title: "Seat pressure starts",
      body:
        room.playerCount === 0
          ? "The lane is armed but empty. The next wallet starts the public join clock."
          : `${room.playerCount} seat${room.playerCount === 1 ? " is" : "s are"} visible and the current window is ${getWindowLabel(room, currentSlot)}.`,
      state: room.playerCount > 0 ? (room.status === ROOM_STATUS.Open ? "live" : "complete") : "upcoming",
      icon: Clock3
    },
    {
      title: "Private reads lock",
      body:
        room.status === ROOM_STATUS.Open
          ? "Commit pressure unlocks once the room has enough seats and the first lock lands."
          : `${room.committedCount} commit${room.committedCount === 1 ? " is" : "s are"} already sealed in this round.`,
      state: room.status === ROOM_STATUS.Commit ? "live" : room.status > ROOM_STATUS.Commit ? "complete" : "upcoming",
      icon: LockKeyhole
    },
    {
      title: "Reveal makes the crowd real",
      body:
        room.status === ROOM_STATUS.Reveal || room.status === ROOM_STATUS.Resolved
          ? `${room.revealedCount} reveal${room.revealedCount === 1 ? " is" : "s are"} public. ${committedSeats > 0 ? `${committedSeats} sealed read${committedSeats === 1 ? " remains" : "s remain"} to open.` : "The room has no sealed read left."}`
          : "No zone is public yet. The histogram is still hidden behind the commit layer.",
      state: room.status === ROOM_STATUS.Reveal ? "live" : room.status > ROOM_STATUS.Reveal ? "complete" : "upcoming",
      icon: Waves
    },
    {
      title: "Settlement and claims",
      body:
        room.status === ROOM_STATUS.Resolved
          ? claimableSeats > 0
            ? `${claimableSeats} payout${claimableSeats === 1 ? " is" : "s are"} still claimable from a total pot of ${formatLamports(room.totalStakedLamports)}.`
            : `The room is fully settled and every visible payout has already left the vault.`
          : room.status === ROOM_STATUS.Cancelled
            ? "This round voided and fell back to refunds instead of score-based settlement."
            : "The room has not settled yet. Any spectator can still watch the live proof enter before resolve.",
      state: room.status === ROOM_STATUS.Resolved || room.status === ROOM_STATUS.Cancelled ? "live" : "upcoming",
      icon: Sparkles
    }
  ] as const;

  return (
    <div className="fault-card rounded-[1.75rem] p-6">
      <p className="arena-kicker">Watch Timeline</p>
      <h2 className="mt-3 font-display text-2xl text-white">See where this room sits in the live protocol loop.</h2>
      <div className="mt-6 space-y-3">
        {steps.map((step, index) => (
          <div key={step.title} className="arena-surface rounded-2xl p-4">
            <div className="flex items-start gap-4">
              <div className={cn("mt-1 flex size-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/20", getStateTone(step.state))}>
                <step.icon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="font-display text-lg text-white">{index + 1}. {step.title}</p>
                  <span className="arena-chip" data-tone={step.state === "live" ? "flare" : step.state === "complete" ? "signal" : undefined}>
                    {step.state === "live" ? "Live" : step.state === "complete" ? "Complete" : "Standby"}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-7 text-white/68">{step.body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-7 text-white/68">
        <p className="inline-flex items-center gap-2 text-white/84">
          <CheckCircle2 className="size-4 text-fault-signal" />
          Every step above is derived from confirmed on-chain room state, not from client-local guesses.
        </p>
      </div>
    </div>
  );
}