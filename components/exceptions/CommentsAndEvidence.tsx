import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/lib/format";
import type { EvidenceRecord, ExceptionComment } from "@/app/generated/prisma/client";

interface CommentsAndEvidenceProps {
  comments: ExceptionComment[];
  evidenceRecords: EvidenceRecord[];
}

export function CommentsAndEvidence({ comments, evidenceRecords }: CommentsAndEvidenceProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card title="Comments">
        {comments.length === 0 ? (
          <EmptyState title="No comments" description="No investigation comments have been added yet." />
        ) : (
          <ul className="flex flex-col gap-2">
            {comments.map((comment) => (
              <li key={comment.id} className="text-sm text-slate-600">
                <span className="font-medium text-slate-700">{comment.author}:</span> {comment.body}
                <span className="ml-2 text-xs text-slate-400">{formatDateTime(comment.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title="Evidence">
        {evidenceRecords.length === 0 ? (
          <EmptyState title="No evidence attached" description="No control evidence has been attached to this case." />
        ) : (
          <ul className="flex flex-col gap-2">
            {evidenceRecords.map((evidence) => (
              <li key={evidence.id} className="text-sm text-slate-600">
                <span className="font-medium text-slate-700">{evidence.evidenceRef}</span> — {evidence.title}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
