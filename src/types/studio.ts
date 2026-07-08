export interface StudioAgent {
  id: string;
  display_name: string;
  tagline: string | null;
  description: string | null;
  icon_url: string | null;
  avatar_color: string;
  domain: string;
  status: "draft" | "active" | "archived";
  sort_order: number;
  archetype_id: string | null;
  agent_config: Record<string, unknown>;
  cloned_from: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudioSessionSummary {
  id: string;
  agent_id: string;
  deployment_id: string | null;
  skill_id: string;
  skill_name: string | null;
  title: string | null;
  subtitle: string | null;
  current_phase: string;
  started_at: string;
  completed_at: string | null;
  duration_secs: number | null;
  score: number | null;
}

export interface StudioSessionDetail extends StudioSessionSummary {
  skill_description: string | null;
  agent_config_snapshot: Record<string, unknown>;
  resolved_prompts: Record<string, string>;
  messages: Record<string, unknown>[];
  steps: Record<string, unknown>[];
  phases_completed: string[];
  evaluator_run_id: string | null;
  metadata: Record<string, unknown>;
}
