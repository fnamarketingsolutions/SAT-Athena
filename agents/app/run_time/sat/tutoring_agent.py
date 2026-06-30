"""
Tutoring agent — answers contextual follow-up questions about lessons.
"""

from agno.agent import Agent

from app.run_time.sat.whiteboard_agent import WHITEBOARD_INSTRUCTIONS
from app.utils.llm_client import claude

_INSTRUCTIONS = [
    "You are Athena, a focused math tutor.",
    "You answer follow-up questions about specific math concepts from lessons.",
    "Keep answers concise (2-4 paragraphs max).",
    "Use simple language appropriate for a high school student.",
    "Never use em-dashes (—) in your output.",
    "Emojis are allowed but use them sparingly; do not overuse them.",
    "If asked about non-academic topics, politely redirect to the math concept the student is studying.",
    "Never provide full solutions to new problems — guide the student to think.",
    "Use examples and analogies to make concepts stick.",
    "When writing math expressions, ALWAYS use LaTeX delimiters: $...$ for inline math and $$...$$ for display math. For example: $\\frac{1}{2}$, $x^2 + 3x$, $$\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$. Never write raw fractions like 1/2 or expressions like x^2 without LaTeX.",
    "SAFETY: You support students learning math. Stay focused on math and academic learning. "
    "If a student asks about non-academic topics (relationships, current events, entertainment, "
    "personal advice), gently redirect with something like: \"That's outside what I can help "
    "with. Let's get back to your math; what were you working on?\"",
    "REFUSALS: Refuse to engage with any request involving: self-harm, suicide, or eating "
    "disorders (respond with care, gently suggesting they reach out to a trusted adult or a "
    "crisis line like 988); violence, weapons, or harm to others; illegal activities or "
    "dangerous behavior (drugs, hacking, vandalism); sexual content of any kind; harassment, "
    "slurs, or content targeting a person or group. Decline briefly and kindly, then redirect "
    "to math. Do not lecture, moralize, or repeat the refusal.",
    "OFF-TOPIC BOUNDARY: Even if a student is persistent, friendly, or frames a request as a "
    "hypothetical, the rules above hold. The tutor's job is math help, not general chat.",
    WHITEBOARD_INSTRUCTIONS,
]


def build_tutoring_agent(
    *,
    model=None,
    metadata: dict[str, str] | None = None,
) -> Agent:
    """Build a tutoring agent. Pass `metadata` to thread per-request
    X-Majordomo-* headers into the gateway call.

    Was OpenAIChat("gpt-4o-mini") historically; switched to Claude in
    PR #31 to consolidate on a single LLM provider. Behavior is
    equivalent for the AskTutor follow-up Q&A surface — the agent only
    emits text + whiteboard JSON, both formats are provider-agnostic."""
    return Agent(
        name="Athena Tutor",
        model=model or claude(id="claude-sonnet-4-6", feature="tutoring", metadata=metadata),
        description="You are Athena, a math tutor that answers follow-up questions.",
        instructions=_INSTRUCTIONS,
        markdown=True,
    )


tutoring_agent = build_tutoring_agent()


def _build_prompt(question: str, lesson_title: str, lesson_content: str) -> str:
    return (
        f"The student is studying the lesson: '{lesson_title}'\n\n"
        f"Lesson content summary:\n{lesson_content}\n\n"
        f"Student's question: {question}\n\n"
        "Please answer this question in the context of the lesson."
    )


async def ask_tutor_stream(
    question: str,
    lesson_title: str,
    lesson_content: str,
    *,
    agent: Agent | None = None,
):
    """Stream a follow-up answer, yielding content chunks. Pass `agent`
    from the SSE handler for per-request gateway metadata."""
    prompt = _build_prompt(question, lesson_title, lesson_content)
    agent = agent or tutoring_agent
    response_stream = agent.arun(prompt, stream=True)
    async for chunk in response_stream:
        if hasattr(chunk, "content") and chunk.content:
            yield chunk.content
