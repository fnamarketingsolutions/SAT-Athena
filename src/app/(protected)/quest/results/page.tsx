import { QuestResultsScreen } from "@/components/daily-quest/quest-results-screen";

export default function QuestResultsPage() {
  return (
    <div className="fixed inset-x-0 bottom-0 top-14 z-40 flex flex-col overflow-y-auto bg-background md:left-[15rem] md:top-0">
      <QuestResultsScreen />
    </div>
  );
}
