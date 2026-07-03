import { NextResponse } from "next/server";
import { requireAthenaAdminApi } from "@/lib/auth/require-admin";
import {
  listCurriculum,
  type CurriculumSubject,
} from "@/lib/db/queries/admin-curriculum";
import { MBE_SUBJECTS } from "@/lib/exam-config";

const SUBJECTS: CurriculumSubject[] = MBE_SUBJECTS.map((s) => s.key);

export async function GET(req: Request) {
  const denied = await requireAthenaAdminApi();
  if (denied) return denied;

  const url = new URL(req.url);
  const subjectParam = url.searchParams.get("subject");
  const subject =
    subjectParam && SUBJECTS.includes(subjectParam as CurriculumSubject)
      ? (subjectParam as CurriculumSubject)
      : undefined;

  try {
    const data = await listCurriculum(subject);
    return NextResponse.json(data);
  } catch (err) {
    console.error("[admin/curriculum]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load curriculum" },
      { status: 500 }
    );
  }
}
