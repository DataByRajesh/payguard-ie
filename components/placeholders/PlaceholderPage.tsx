import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";

interface PlaceholderPageProps {
  title: string;
  description: string;
  upcoming: string[];
  preview?: ReactNode;
}

export function PlaceholderPage({ title, description, upcoming, preview }: PlaceholderPageProps) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title} description={description} />
      <Card title="Planned for a future sprint">
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-600">
          {upcoming.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Card>
      {preview}
    </div>
  );
}
