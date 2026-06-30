import { getAuthIdentity, getAppUser } from "@/lib/auth/current-user";
import { updateOnboardingProgress } from "@/lib/db/queries/onboarding";
import {
  deleteUserSchedules,
  createSchedules,
} from "@/lib/db/queries/schedules";
import {
  createSessions,
  deleteFuturePendingSessions,
} from "@/lib/db/queries/sessions";
import { updateUser } from "@/lib/db/queries/users";
import { generateSessionDates } from "@/lib/schedule-utils";
import { NextResponse } from "next/server";

type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export async function POST(req: Request) {
  const { userId: externalId } = await getAuthIdentity();
  if (!externalId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getAppUser(externalId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = (await req.json()) as {
    targetScore?: number;
    slots?: {
      dayOfWeek: DayOfWeek;
      startTime: string;
      endTime: string;
    }[];
    timezone?: string;
  };

  if (body.targetScore !== undefined) {
    const target = Math.round(body.targetScore);
    if (target < 400 || target > 1600) {
      return NextResponse.json(
        { error: "Target score must be between 400 and 1600" },
        { status: 400 }
      );
    }
    await updateUser(externalId, { targetScore: target });
  }

  if (body.slots && body.slots.length > 0) {
    await Promise.all([
      deleteUserSchedules(user.id),
      deleteFuturePendingSessions(user.id),
    ]);

    const createdSchedules = await createSchedules(
      body.slots.map((s) => ({
        userId: user.id,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
      }))
    );

    const sessionDates = generateSessionDates(
      createdSchedules.map((s) => ({
        id: s.id,
        dayOfWeek: s.dayOfWeek as DayOfWeek,
      })),
      4
    );

    await createSessions(
      sessionDates.map((s) => ({
        userId: user.id,
        scheduleId: s.scheduleId,
        scheduledDate: s.scheduledDate,
      }))
    );
  }

  if (body.timezone) {
    await updateUser(externalId, { timezone: body.timezone });
  }

  await updateUser(externalId, { onboardingCompleted: true });
  await updateOnboardingProgress(user.id, { currentStep: "done" });

  return NextResponse.json({ ok: true });
}
