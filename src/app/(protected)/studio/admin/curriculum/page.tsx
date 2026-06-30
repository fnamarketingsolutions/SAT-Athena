"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";

type Subject = "math" | "reading-writing" | "science" | "social-studies";

type Subtopic = {
  id: string;
  topicId: string;
  slug: string;
  name: string;
  orderIndex: number;
  description: string;
  difficulty: string;
  estimatedMinutes: number;
  problemCount: number;
};

type Topic = {
  id: string;
  slug: string;
  name: string;
  subject: string;
  icon: string;
  orderIndex: number;
  colorScheme: string;
  overview: string;
  subtopicCount: number;
  subtopics: Subtopic[];
};

const SUBJECTS: { key: Subject | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "math", label: "Math" },
  { key: "reading-writing", label: "Reading & Writing" },
  { key: "science", label: "Science" },
  { key: "social-studies", label: "Social Studies" },
];

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/ /g, "-")
    .replace(/[(),]/g, "");
}

export default function CurriculumAdminPage() {
  const [subject, setSubject] = useState<Subject | "all">("all");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [topicModal, setTopicModal] = useState<
    | { mode: "create" }
    | { mode: "edit"; topic: Topic }
    | null
  >(null);
  const [subtopicModal, setSubtopicModal] = useState<
    | { mode: "create"; topicId: string; topicName: string }
    | { mode: "edit"; subtopic: Subtopic; topicName: string }
    | null
  >(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q =
        subject === "all" ? "" : `?subject=${encodeURIComponent(subject)}`;
      const res = await fetch(`/api/admin/curriculum${q}`);
      if (!res.ok) throw new Error("Failed to load");
      const data = (await res.json()) as { topics: Topic[] };
      setTopics(data.topics);
    } catch {
      toast.error("Failed to load curriculum");
    } finally {
      setLoading(false);
    }
  }, [subject]);

  useEffect(() => {
    void load();
  }, [load]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function deleteTopic(topic: Topic) {
    if (
      !confirm(
        `Delete topic "${topic.name}" and all ${topic.subtopicCount} subtopic(s)? This also removes linked problems, lessons, and content.`
      )
    ) {
      return;
    }
    const res = await fetch(`/api/admin/curriculum/topics/${topic.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error || "Delete failed");
      return;
    }
    toast.success("Topic deleted");
    void load();
  }

  async function deleteSubtopic(sub: Subtopic) {
    if (
      !confirm(
        `Delete subtopic "${sub.name}"? (${sub.problemCount} SAT problem(s) will be removed.)`
      )
    ) {
      return;
    }
    const res = await fetch(`/api/admin/curriculum/subtopics/${sub.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error || "Delete failed");
      return;
    }
    toast.success("Subtopic deleted");
    void load();
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Curriculum</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Manage SAT topics and subtopics shown on the dashboard. Changes
            appear immediately — no seed script required. Generate practice
            problems separately via{" "}
            <code className="text-primary">npm run seed:content:math</code>.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setTopicModal({ mode: "create" })}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New topic
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {SUBJECTS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setSubject(s.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              subject === s.key
                ? "bg-secondary border-primary text-foreground"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 bg-card rounded-xl animate-pulse border border-border"
            />
          ))}
        </div>
      ) : topics.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">
          <p className="text-lg mb-2">No topics yet</p>
          <p className="text-sm">Create a topic to build your curriculum.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {topics.map((topic) => {
            const open = expanded.has(topic.id);
            return (
              <div
                key={topic.id}
                className="rounded-xl border border-border bg-card overflow-hidden"
              >
                <div className="flex items-center gap-3 p-4">
                  <button
                    type="button"
                    onClick={() => toggleExpand(topic.id)}
                    className="text-lg shrink-0"
                    aria-label={open ? "Collapse" : "Expand"}
                  >
                    {topic.icon}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleExpand(topic.id)}
                    className="flex-1 text-left min-w-0"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {topic.name}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground/70">
                        {topic.slug}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">
                        {topic.subject}
                      </span>
                      <span className="text-[10px] text-muted-foreground/70">
                        {topic.subtopicCount} subtopic
                        {topic.subtopicCount === 1 ? "" : "s"}
                      </span>
                    </div>
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      title="Add subtopic"
                      onClick={() =>
                        setSubtopicModal({
                          mode: "create",
                          topicId: topic.id,
                          topicName: topic.name,
                        })
                      }
                      className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-secondary"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="Edit topic"
                      onClick={() => setTopicModal({ mode: "edit", topic })}
                      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="Delete topic"
                      onClick={() => void deleteTopic(topic)}
                      className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-secondary"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {open && (
                  <div className="border-t border-border bg-background/50">
                    {topic.subtopics.length === 0 ? (
                      <p className="px-4 py-3 text-xs text-muted-foreground/70">
                        No subtopics — add one to make this topic visible on
                        the dashboard.
                      </p>
                    ) : (
                      <ul className="divide-y divide-border">
                        {topic.subtopics.map((sub) => (
                          <li
                            key={sub.id}
                            className="flex items-center gap-3 px-4 py-3 pl-12"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm text-foreground">
                                  {sub.name}
                                </span>
                                <span className="text-[10px] font-mono text-muted-foreground/70">
                                  {sub.slug}
                                </span>
                                <span className="text-[10px] text-muted-foreground/70">
                                  {sub.problemCount} problems
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setSubtopicModal({
                                  mode: "edit",
                                  subtopic: sub,
                                  topicName: topic.name,
                                })
                              }
                              className="p-1.5 rounded text-muted-foreground hover:text-foreground"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void deleteSubtopic(sub)}
                              className="p-1.5 rounded text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {topicModal && (
        <TopicModal
          mode={topicModal.mode}
          topic={topicModal.mode === "edit" ? topicModal.topic : undefined}
          defaultSubject={subject === "all" ? "math" : subject}
          onClose={() => setTopicModal(null)}
          onSaved={() => {
            setTopicModal(null);
            void load();
          }}
        />
      )}

      {subtopicModal && (
        <SubtopicModal
          mode={subtopicModal.mode}
          topicId={
            subtopicModal.mode === "create"
              ? subtopicModal.topicId
              : subtopicModal.subtopic.topicId
          }
          topicName={subtopicModal.topicName}
          subtopic={
            subtopicModal.mode === "edit" ? subtopicModal.subtopic : undefined
          }
          onClose={() => setSubtopicModal(null)}
          onSaved={() => {
            setSubtopicModal(null);
            void load();
          }}
        />
      )}
    </div>
  );
}

function ModalShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-lg leading-none"
          >
            ×
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block mb-4">
      <span className="text-xs text-muted-foreground mb-1 block">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground outline-none focus:border-ring";

function TopicModal({
  mode,
  topic,
  defaultSubject,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  topic?: Topic;
  defaultSubject: Subject;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(topic?.name ?? "");
  const [slug, setSlug] = useState(topic?.slug ?? "");
  const [subjectVal, setSubjectVal] = useState<Subject>(
    (topic?.subject as Subject) ?? defaultSubject
  );
  const [icon, setIcon] = useState(topic?.icon ?? "📚");
  const [orderIndex, setOrderIndex] = useState(
    String(topic?.orderIndex ?? 1)
  );
  const [overview, setOverview] = useState(topic?.overview ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name,
        slug: slug.trim() || slugify(name),
        subject: subjectVal,
        icon,
        orderIndex: Number(orderIndex) || 1,
        overview,
      };
      const res = await fetch(
        mode === "create"
          ? "/api/admin/curriculum/topics"
          : `/api/admin/curriculum/topics/${topic!.id}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Save failed");
      }
      toast.success(mode === "create" ? "Topic created" : "Topic updated");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      title={mode === "create" ? "New topic" : "Edit topic"}
      onClose={onClose}
    >
      <Field label="Name">
        <input
          className={inputClass}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (mode === "create" && !slug) setSlug(slugify(e.target.value));
          }}
        />
      </Field>
      <Field label="Slug (URL)">
        <input
          className={inputClass}
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder={slugify(name) || "algebra"}
        />
      </Field>
      <Field label="Subject">
        <select
          className={inputClass}
          value={subjectVal}
          onChange={(e) => setSubjectVal(e.target.value as Subject)}
        >
          {SUBJECTS.filter((s) => s.key !== "all").map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Icon (emoji)">
          <input
            className={inputClass}
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
          />
        </Field>
        <Field label="Order">
          <input
            type="number"
            className={inputClass}
            value={orderIndex}
            onChange={(e) => setOrderIndex(e.target.value)}
            min={1}
          />
        </Field>
      </div>
      <Field label="Overview">
        <textarea
          className={`${inputClass} min-h-[72px] resize-y`}
          value={overview}
          onChange={(e) => setOverview(e.target.value)}
        />
      </Field>
      <div className="flex justify-end gap-2 mt-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </ModalShell>
  );
}

function SubtopicModal({
  mode,
  topicId,
  topicName,
  subtopic,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  topicId: string;
  topicName: string;
  subtopic?: Subtopic;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(subtopic?.name ?? "");
  const [slug, setSlug] = useState(subtopic?.slug ?? "");
  const [orderIndex, setOrderIndex] = useState(
    String(subtopic?.orderIndex ?? 0)
  );
  const [difficulty, setDifficulty] = useState(
    subtopic?.difficulty ?? "medium"
  );
  const [description, setDescription] = useState(subtopic?.description ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        topicId,
        name,
        slug: slug.trim() || slugify(name),
        orderIndex: Number(orderIndex),
        difficulty,
        description,
      };
      const res = await fetch(
        mode === "create"
          ? "/api/admin/curriculum/subtopics"
          : `/api/admin/curriculum/subtopics/${subtopic!.id}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Save failed");
      }
      toast.success(
        mode === "create" ? "Subtopic created" : "Subtopic updated"
      );
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      title={
        mode === "create"
          ? `New subtopic — ${topicName}`
          : `Edit subtopic — ${topicName}`
      }
      onClose={onClose}
    >
      <Field label="Name">
        <input
          className={inputClass}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (mode === "create" && !slug) setSlug(slugify(e.target.value));
          }}
        />
      </Field>
      <Field label="Slug">
        <input
          className={inputClass}
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Order">
          <input
            type="number"
            className={inputClass}
            value={orderIndex}
            onChange={(e) => setOrderIndex(e.target.value)}
            min={0}
          />
        </Field>
        <Field label="Difficulty">
          <select
            className={inputClass}
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </Field>
      </div>
      <Field label="Description">
        <textarea
          className={`${inputClass} min-h-[72px] resize-y`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>
      <div className="flex justify-end gap-2 mt-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </ModalShell>
  );
}
