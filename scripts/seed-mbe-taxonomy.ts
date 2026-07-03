/**
 * Seed MBE (Multistate Bar Examination) taxonomy into Supabase.
 * Run: npm run seed:mbe-taxonomy
 *
 * Structure: each MBE subject → multiple topics → multiple subtopics.
 * Contracts keeps a single topic (already working well in the UI).
 */
import { supabase } from "../src/lib/supabase/client";
import { MBE_SUBJECTS, type MbeSubject } from "../src/lib/exam-config";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/ /g, "-")
    .replace(/[(),]/g, "");
}

type TopicSeed = {
  name: string;
  subtopics: string[];
};

type SubjectSeed = {
  icon: string;
  color: string;
  /** Multiple units/chapters per subject (shown as expandable topics in the UI). */
  topics: TopicSeed[];
};

const MBE_CONTENT: Record<MbeSubject, SubjectSeed> = {
  "civil-procedure": {
    icon: "⚖️",
    color: "blue",
    topics: [
      {
        name: "Jurisdiction & Venue",
        subtopics: [
          "Federal question jurisdiction",
          "Diversity jurisdiction",
          "Supplemental jurisdiction",
          "Removal & remand",
          "Personal jurisdiction",
          "Venue, transfer & forum non conveniens",
        ],
      },
      {
        name: "Pleadings & Discovery",
        subtopics: [
          "Complaint & responsive pleadings",
          "Amended & supplemental pleadings",
          "Rule 11 sanctions",
          "Discovery scope & devices",
          "Discovery disputes & sanctions",
          "Pretrial conferences & scheduling",
        ],
      },
      {
        name: "Adjudication & Appeal",
        subtopics: [
          "Summary judgment",
          "Trial, jury & verdict",
          "Post-trial motions",
          "Claim preclusion (res judicata)",
          "Issue preclusion (collateral estoppel)",
          "Final judgment & appeals",
        ],
      },
    ],
  },
  "constitutional-law": {
    icon: "📜",
    color: "purple",
    topics: [
      {
        name: "Judicial Power & Federalism",
        subtopics: [
          "Judicial review & justiciability",
          "Standing, ripeness & mootness",
          "Political question doctrine",
          "Federal legislative powers",
          "Federal executive powers",
          "State sovereignty & intergovernmental immunity",
        ],
      },
      {
        name: "Individual Rights — Due Process",
        subtopics: [
          "Procedural due process",
          "Substantive due process",
          "Takings & property rights",
          "Privacy & fundamental rights",
          "Void for vagueness & overbreadth",
        ],
      },
      {
        name: "Equal Protection & First Amendment",
        subtopics: [
          "Equal protection — rational basis",
          "Equal protection — heightened scrutiny",
          "Suspect & quasi-suspect classes",
          "Freedom of speech — content-based vs neutral",
          "Freedom of religion — Establishment Clause",
          "Freedom of religion — Free Exercise",
        ],
      },
    ],
  },
  contracts: {
    icon: "📝",
    color: "green",
    topics: [
      {
        name: "Contracts",
        subtopics: [
          "Formation (offer, acceptance, consideration)",
          "Defenses to formation",
          "Parol evidence & interpretation",
          "Conditions & performance",
          "Breach & anticipatory repudiation",
          "Remedies (expectation, reliance, restitution)",
          "Third-party beneficiaries & assignment",
          "UCC Article 2 (goods)",
        ],
      },
    ],
  },
  "criminal-law": {
    icon: "🔒",
    color: "red",
    topics: [
      {
        name: "Substantive Criminal Law",
        subtopics: [
          "Homicide",
          "Theft, robbery & property crimes",
          "Inchoate crimes (attempt, conspiracy, solicitation)",
          "Accomplice & accessory liability",
          "Defenses — justification",
          "Defenses — excuse & intoxication",
        ],
      },
      {
        name: "Criminal Procedure",
        subtopics: [
          "Fourth Amendment — search & seizure",
          "Fourth Amendment — warrants & exceptions",
          "Fifth Amendment — self-incrimination",
          "Sixth Amendment — right to counsel",
          "Identification procedures & lineups",
          "Double jeopardy & speedy trial",
        ],
      },
    ],
  },
  evidence: {
    icon: "🔍",
    color: "amber",
    topics: [
      {
        name: "Relevance & Character",
        subtopics: [
          "Relevance & probative value",
          "Rule 403 balancing",
          "Character evidence — criminal cases",
          "Character evidence — civil cases",
          "Habit & routine practice",
          "Subsequent remedial measures",
        ],
      },
      {
        name: "Hearsay & Impeachment",
        subtopics: [
          "Hearsay definition & non-hearsay uses",
          "Hearsay exceptions — declarant availability",
          "Hearsay exceptions — regardless of availability",
          "Impeachment — prior inconsistent statement",
          "Impeachment — bias, conviction & character",
          "Rehabilitation & extrinsic evidence limits",
        ],
      },
      {
        name: "Privileges & Authentication",
        subtopics: [
          "Attorney-client privilege",
          "Spousal & other common-law privileges",
          "Expert & lay opinion testimony",
          "Authentication & chain of custody",
          "Best evidence rule",
          "Presumptions & burdens of proof",
        ],
      },
    ],
  },
  "real-property": {
    icon: "🏠",
    color: "teal",
    topics: [
      {
        name: "Estates & Concurrent Ownership",
        subtopics: [
          "Present possessory estates",
          "Future interests (reversions, remainders, executory interests)",
          "Rule Against Perpetuities basics",
          "Joint tenancy & tenancy in common",
          "Landlord-tenant — creation & types",
          "Landlord-tenant — duties & remedies",
        ],
      },
      {
        name: "Land Transactions & Nonpossessory Interests",
        subtopics: [
          "Land sale contracts & marketable title",
          "Deeds & delivery",
          "Mortgages — creation & types",
          "Foreclosure & redemption",
          "Easements",
          "Real covenants & equitable servitudes",
        ],
      },
      {
        name: "Recording & Adverse Possession",
        subtopics: [
          "Recording acts — race, notice, race-notice",
          "Chain of title & bona fide purchasers",
          "Adverse possession elements",
          "Fixtures",
          "Zoning & land-use basics",
        ],
      },
    ],
  },
  torts: {
    icon: "⚠️",
    color: "orange",
    topics: [
      {
        name: "Intentional Torts",
        subtopics: [
          "Battery & assault",
          "False imprisonment",
          "IIED & NIED",
          "Trespass to land & chattels",
          "Conversion",
          "Defenses to intentional torts",
        ],
      },
      {
        name: "Negligence",
        subtopics: [
          "Duty — general & special relationships",
          "Breach — reasonable person standard",
          "Actual & proximate causation",
          "Damages — compensatory & punitive",
          "Contributory & comparative negligence",
          "Assumption of risk",
        ],
      },
      {
        name: "Strict Liability & Defamation",
        subtopics: [
          "Strict liability — abnormally dangerous activities",
          "Products liability — manufacturing defect",
          "Products liability — design & warning defects",
          "Defamation — libel & slander",
          "Defenses to defamation",
          "Nuisance & vicarious liability",
        ],
      },
    ],
  },
};

function topicDefaults(name: string, subject: MbeSubject) {
  return {
    overview: `${name} — core MBE ${subject.replace(/-/g, " ")} concepts for UBE preparation.`,
    learning_objectives: [] as string[],
    sat_relevance: {
      questionCount: 0,
      percentageOfTest: 0,
      description: "Part of the Multistate Bar Examination (MBE) blueprint.",
    },
    difficulty_distribution: { easy: 33, medium: 34, hard: 33 },
    estimated_total_minutes: 120,
    prerequisites: [] as string[],
    key_concepts: [] as string[],
    pro_tips: [] as string[],
  };
}

function subtopicDefaults(name: string) {
  return {
    description: `MBE practice and lessons for ${name}.`,
    difficulty: "medium",
    estimated_minutes: 45,
    learning_objectives: [] as string[],
    conceptual_overview: {} as Record<string, unknown>,
    key_formulas: [] as string[],
    common_mistakes: [] as string[],
    tips_and_tricks: [] as string[],
    prerequisite_subtopic_slugs: [] as string[],
  };
}

async function seedTopic(
  subjectKey: MbeSubject,
  topicSeed: TopicSeed,
  meta: SubjectSeed,
  topicOrderIndex: number
) {
  const subjectLabel = MBE_SUBJECTS.find((s) => s.key === subjectKey)!.label;
  const topicSlug =
    meta.topics.length === 1 && topicSeed.name === subjectLabel
      ? subjectKey
      : `${subjectKey}-${slugify(topicSeed.name)}`;
  const defaults = topicDefaults(topicSeed.name, subjectKey);

  const { data: existingTopic } = await supabase
    .from("topics")
    .select("id")
    .eq("slug", topicSlug)
    .maybeSingle();

  let topicId = existingTopic?.id;
  let topicsAdded = 0;

  if (!topicId) {
    const { data: inserted, error } = await supabase
      .from("topics")
      .insert({
        slug: topicSlug,
        name: topicSeed.name,
        subject: subjectKey,
        icon: meta.icon,
        order_index: topicOrderIndex,
        color_scheme: meta.color,
        ...defaults,
      })
      .select("id")
      .single();
    if (error) {
      console.error(`Topic ${topicSeed.name}:`, error.message);
      return { topicsAdded: 0, subtopicsAdded: 0 };
    }
    topicId = inserted.id;
    topicsAdded = 1;
    console.log(`+ topic: ${topicSeed.name}`);
  } else {
    console.log(`= topic exists: ${topicSeed.name}`);
  }

  let subtopicsAdded = 0;
  for (let i = 0; i < topicSeed.subtopics.length; i++) {
    const subName = topicSeed.subtopics[i];
    const subSlug = slugify(subName);

    const { data: existingSub } = await supabase
      .from("subtopics")
      .select("id")
      .eq("topic_id", topicId)
      .eq("slug", subSlug)
      .maybeSingle();

    if (existingSub) continue;

    const { error } = await supabase.from("subtopics").insert({
      topic_id: topicId,
      slug: subSlug,
      name: subName,
      order_index: i,
      ...subtopicDefaults(subName),
    });
    if (error) {
      console.error(`  subtopic ${subName}:`, error.message);
      continue;
    }
    subtopicsAdded++;
    console.log(`  + subtopic: ${subName}`);
  }

  return { topicsAdded, subtopicsAdded };
}

/** Remove old single-topic rows (slug = subject key) after multi-topic migration. */
async function removeLegacySingleTopics() {
  const multiTopicSubjects = MBE_SUBJECTS.filter((s) => s.key !== "contracts").map(
    (s) => s.key
  );

  for (const subjectKey of multiTopicSubjects) {
    const { data: legacy } = await supabase
      .from("topics")
      .select("id, name")
      .eq("slug", subjectKey)
      .eq("subject", subjectKey)
      .maybeSingle();

    if (!legacy) continue;

    const { count } = await supabase
      .from("subtopics")
      .select("id", { count: "exact", head: true })
      .eq("topic_id", legacy.id);

    await supabase.from("subtopics").delete().eq("topic_id", legacy.id);
    await supabase.from("topics").delete().eq("id", legacy.id);
    console.log(
      `Removed legacy topic "${legacy.name}" (${count ?? 0} old subtopics) — replaced by multi-topic units`
    );
  }
}

async function seedMbeSubject(subjectKey: MbeSubject, meta: SubjectSeed, subjectOrder: number) {
  let topicsAdded = 0;
  let subtopicsAdded = 0;

  for (let i = 0; i < meta.topics.length; i++) {
    const result = await seedTopic(subjectKey, meta.topics[i], meta, subjectOrder * 10 + i);
    topicsAdded += result.topicsAdded;
    subtopicsAdded += result.subtopicsAdded;
  }

  return { topicsAdded, subtopicsAdded };
}

async function main() {
  console.log("Seeding MBE taxonomy (multi-topic structure)...\n");

  let totalTopics = 0;
  let totalSubtopics = 0;

  for (let i = 0; i < MBE_SUBJECTS.length; i++) {
    const { key, label } = MBE_SUBJECTS[i];
    console.log(`\n── ${label} ──`);
    const result = await seedMbeSubject(key, MBE_CONTENT[key], i + 1);
    totalTopics += result.topicsAdded;
    totalSubtopics += result.subtopicsAdded;
  }

  console.log("\n── Cleanup legacy single-topic rows ──");
  await removeLegacySingleTopics();

  const { count: topicCount } = await supabase
    .from("topics")
    .select("id", { count: "exact", head: true });
  const { count: subCount } = await supabase
    .from("subtopics")
    .select("id", { count: "exact", head: true });

  console.log("\nDone.");
  console.log(`Added ${totalTopics} topics, ${totalSubtopics} subtopics this run.`);
  console.log(`DB now has ${topicCount} topics, ${subCount} subtopics.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
