import Link from "next/link";
import { MarketingNav } from "./marketing-nav";
import { PricingPlans } from "./pricing-plans";
import { signUpForCheckoutPath } from "@/lib/stripe/checkout-paths";

const FEATURES = [
  {
    title: "Adaptive daily quests",
    body: "20-question sessions weighted to your weakest SAT skills, with stretch problems as you improve.",
  },
  {
    title: "AI tutoring on canvas",
    body: "Step-by-step micro-lessons and a voice mentor that explains Reading, Writing, and Math in plain language.",
  },
  {
    title: "Real score tracking",
    body: "Section scores, composite trends, and practice history so you always know where you stand.",
  },
];

const FAQ = [
  {
    q: "Do I need a credit card to start?",
    a: "Yes — Athena uses Stripe for secure checkout. You can manage or cancel your subscription anytime from the billing portal.",
  },
  {
    q: "What subjects are covered?",
    a: "Full Digital SAT Reading & Writing and Math, with structured lessons, quizzes, and full-length practice tests.",
  },
  {
    q: "Can I use Athena on my phone?",
    a: "Yes. The experience is mobile-first and works across phone, tablet, and desktop.",
  },
];

export function MarketingLanding() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNav />

      <section className="relative overflow-hidden px-6 pb-16 pt-20">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 0%, oklch(0.45 0.12 55 / 0.35), transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-4xl text-center">
          <p className="font-mono-hud hud-dim text-[11px] tracking-[0.35em]">
            DIGITAL SAT AI COACH
          </p>
          <h1 className="mt-4 text-4xl font-light tracking-tight md:text-6xl">
            Your personal SAT coach,
            <span className="block text-amber-400/90">every day.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Adaptive practice, AI tutoring, voice mentor, and realistic score
            tracking — built for students aiming for their target SAT score.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href={signUpForCheckoutPath("monthly")}
              className="rounded-full border border-foreground/20 bg-foreground/90 px-8 py-3 text-sm font-medium uppercase tracking-wider text-background transition hover:bg-foreground"
            >
              Start with Athena
            </Link>
            <Link
              href="#pricing"
              className="rounded-full border border-foreground/15 px-8 py-3 text-sm font-medium uppercase tracking-wider text-foreground/80 transition hover:border-foreground/30 hover:text-foreground"
            >
              See pricing
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-foreground/10 px-6 py-20">
        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-6"
            >
              <h3 className="text-lg font-medium">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <PricingPlans paymentFirst className="border-t border-foreground/10" />

      <section className="border-t border-foreground/10 px-6 py-20">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-center text-2xl font-light">FAQ</h2>
          <dl className="mt-8 space-y-6">
            {FAQ.map((item) => (
              <div key={item.q}>
                <dt className="font-medium">{item.q}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {item.a}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <footer className="border-t border-foreground/10 px-6 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Athena. SAT® is a trademark of College
        Board, which is not affiliated with Athena.
      </footer>
    </div>
  );
}
