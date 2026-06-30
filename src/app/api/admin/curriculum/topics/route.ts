import { NextResponse } from "next/server";
import { requireAthenaAdminApi } from "@/lib/auth/require-admin";
import {
  createTopic,
  type CurriculumSubject,
} from "@/lib/db/queries/admin-curriculum";

export async function POST(req: Request) {
  const denied = await requireAthenaAdminApi();
  if (denied) return denied;

  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    slug?: string;
    subject?: CurriculumSubject;
    icon?: string;
    colorScheme?: string;
    orderIndex?: number;
    overview?: string;
  };

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!body.subject) {
    return NextResponse.json({ error: "subject is required" }, { status: 400 });
  }

  try {
    const topic = await createTopic({
      name: body.name,
      slug: body.slug,
      subject: body.subject,
      icon: body.icon,
      colorScheme: body.colorScheme,
      orderIndex: body.orderIndex,
      overview: body.overview,
    });
    return NextResponse.json({ topic }, { status: 201 });
  } catch (err) {
    console.error("[admin/curriculum/topics POST]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create topic" },
      { status: 500 }
    );
  }
}
