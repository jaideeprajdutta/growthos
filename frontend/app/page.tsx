import Link from "next/link";
import { Building2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export default function HomePage() {
  return (
    <EmptyState
      icon={<Building2 className="h-10 w-10" />}
      title="Welcome to GrowthOS"
      description="Your GrowthOS workspace is ready. Add a company to start the growth workflow: Research → Diagnose → Prioritise → Experiment → Execute → Measure → Learn."
      action={
        <Link
          href="/companies/onboarding"
          className="inline-flex h-10 items-center rounded-lg bg-accent px-5 text-sm font-medium text-on-accent transition-colors hover:bg-accent/90"
        >
          Add a company
        </Link>
      }
    />
  );
}
