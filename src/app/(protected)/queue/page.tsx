import { QueueList } from "@/components/learn/queue-list";

export default function QueuePage() {
  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-2 text-2xl font-bold tracking-tight">My Queue</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Lessons queued from incorrect quiz answers — review them here.
      </p>
      <QueueList />
    </div>
  );
}
