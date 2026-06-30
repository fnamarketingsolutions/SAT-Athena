-- Podcast + Poster (infographic) tables and storage bucket.
-- Paste into Supabase Dashboard → SQL Editor → Run.
-- Or run locally: npm run db:content-tables

-- ── podcast_scripts ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "podcast_scripts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subtopic_id" uuid NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"speakers" jsonb NOT NULL,
	"lines" jsonb NOT NULL,
	"has_guest" boolean NOT NULL DEFAULT false,
	"estimated_duration_minutes" double precision,
	"status" text DEFAULT 'generating' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "podcast_scripts_subtopic_id_unique" UNIQUE ("subtopic_id")
);

DO $$ BEGIN
	ALTER TABLE "podcast_scripts"
		ADD CONSTRAINT "podcast_scripts_subtopic_id_subtopics_id_fk"
		FOREIGN KEY ("subtopic_id") REFERENCES "public"."subtopics"("id")
		ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "podcast_scripts" ENABLE ROW LEVEL SECURITY;

-- ── infographics ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "infographics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subtopic_id" uuid NOT NULL,
	"brief" jsonb NOT NULL DEFAULT '{}'::jsonb,
	"image_url" text,
	"status" text DEFAULT 'generating' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "infographics_subtopic_id_unique" UNIQUE ("subtopic_id")
);

DO $$ BEGIN
	ALTER TABLE "infographics"
		ADD CONSTRAINT "infographics_subtopic_id_subtopics_id_fk"
		FOREIGN KEY ("subtopic_id") REFERENCES "public"."subtopics"("id")
		ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "infographics" ENABLE ROW LEVEL SECURITY;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
	'infographics',
	'infographics',
	TRUE,
	8 * 1024 * 1024,
	ARRAY['image/png']
)
ON CONFLICT (id) DO UPDATE
	SET public = EXCLUDED.public,
		file_size_limit = EXCLUDED.file_size_limit,
		allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "infographics public read" ON storage.objects;
CREATE POLICY "infographics public read"
	ON storage.objects
	FOR SELECT
	USING (bucket_id = 'infographics');

NOTIFY pgrst, 'reload schema';
