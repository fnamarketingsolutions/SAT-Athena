-- App-level roles for authorization (platform admin, educator, learner).
-- Default is learner for all new signups.

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('learner', 'educator', 'admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS role public.app_role NOT NULL DEFAULT 'learner';

CREATE INDEX IF NOT EXISTS users_role_idx ON public.users (role);

COMMENT ON COLUMN public.users.role IS
  'App authorization role: learner (default), educator (teacher portal), admin (platform ops).';
