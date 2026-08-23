import { Construction } from "lucide-react";
import { EmptyState, PageHeader, Section } from "../ui";

/**
 * Route stub. Every route in CONTRACT.md §6 resolves from day one so the shell,
 * the router and the agent rail can be exercised before the feature slices
 * land. Wave-2 agents replace these wholesale.
 */
export function Placeholder({ title, owner }: { title: string; owner: string }) {
  return (
    <Section>
      <PageHeader eyebrow="Not built yet" title={title} />
      <EmptyState
        kraft
        icon={<Construction />}
        title={`${title} is not built yet`}
        description={`This screen belongs to the ${owner} slice.`}
      />
    </Section>
  );
}
