#!/usr/bin/env python3
"""
Athena CLI — admin/utility commands moved out of the HTTP surface.

Usage:
    python -m cli.main health
    python -m cli.main seed-practice-problems --topic "..." --subtopic "..." [--subject civil-procedure] [--count 60] [--subtopic-id ...] [--start-order-index 0]
"""

import argparse
import asyncio
import sys
import time

from dotenv import load_dotenv

load_dotenv()


async def cmd_health(args):
    print('{"status": "ok", "service": "athena-agents"}')


async def cmd_seed_practice_problems(args):
    from app.pre_generation.practice_problem_seeder import generate_practice_problems

    count = max(50, min(100, args.count))

    print("╔══════════════════════════════════════════╗")
    print("║  Athena — Practice Problem Seeder        ║")
    print("╚══════════════════════════════════════════╝")
    print(f"  Topic:    {args.topic}")
    print(f"  Subtopic: {args.subtopic}")
    print(f"  Subject:  {args.subject}")
    print(f"  Count:    {count}")
    if args.subtopic_id:
        print(f"  ID:       {args.subtopic_id}")
    print()

    start = time.time()
    try:
        problems = await generate_practice_problems(
            topic=args.topic,
            subtopic=args.subtopic,
            subject=args.subject,
            count=count,
            subtopic_id=args.subtopic_id,
            start_order_index=args.start_order_index,
        )
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    elapsed = time.time() - start
    minutes = int(elapsed // 60)
    seconds = int(elapsed % 60)
    print(f"\n✅ Seeded {len(problems)} problems in {minutes}m {seconds}s")


def main():
    parser = argparse.ArgumentParser(prog="athena-cli", description="Athena admin utilities")
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("health", help="Check service status")

    p_seed = subparsers.add_parser("seed-practice-problems", help="Seed practice problems into the DB")
    p_seed.add_argument("--topic", required=True)
    p_seed.add_argument("--subtopic", required=True)
    p_seed.add_argument("--subject", default="civil-procedure")
    p_seed.add_argument("--count", type=int, default=60)
    p_seed.add_argument("--subtopic-id", default=None)
    p_seed.add_argument("--start-order-index", type=int, default=0)

    args = parser.parse_args()

    dispatch = {
        "health": cmd_health,
        "seed-practice-problems": cmd_seed_practice_problems,
    }

    asyncio.run(dispatch[args.command](args))


if __name__ == "__main__":
    main()
