"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

type StudentPovSummary = {
  id: string;
  student_id: string;
  sessions_incorporated: number;
  updated_at: string;
  created_at: string;
};

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentPovSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/studio/agents/students")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch");
        return r.json() as Promise<StudentPovSummary[]>;
      })
      .then(setStudents)
      .catch(() => toast.error("Failed to load students"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-12 rounded-lg bg-card animate-pulse border border-border"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-foreground mb-2">Students</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Living POV documents maintained across sessions.
      </p>

      {students.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p>No student POVs created yet.</p>
          <p className="text-xs mt-2 text-muted-foreground/70">
            POVs are generated after sessions complete.
          </p>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-card">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Student
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Sessions
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Last Updated
                </th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-border last:border-0 hover:bg-card transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/studio/admin/students/${encodeURIComponent(s.student_id)}`}
                      className="text-sm text-primary hover:underline font-medium"
                    >
                      {s.student_id}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {s.sessions_incorporated}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {new Date(s.updated_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
