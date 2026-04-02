import { DrivenAddCarForm } from "@/components/driven/DrivenAddCarForm";
import Link from "next/link";

const ERROR_MESSAGES: Record<string, string> = {
  "missing-fields": "Please fill in registration, make, model, and year.",
  "disclaimer-required": "To save personal condition scores, confirm the disclaimer checkbox.",
  "invalid-inspection-scores": "Each condition score must be a whole number from 0 to 100.",
};

type Props = { searchParams: Promise<{ error?: string }> };

export default async function DrivenGarageAddPage({ searchParams }: Props) {
  const sp = await searchParams;
  const errorKey = sp.error;
  const error = errorKey ? (ERROR_MESSAGES[errorKey] ?? errorKey) : null;

  return (
    <div>
      <nav className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-wide text-driven-muted">
        <Link href="/driven/garage" className="hover:text-driven-ink">
          Garage
        </Link>
        <span className="mx-2">/</span>
        <span className="text-driven-ink">Add car</span>
      </nav>
      <h1 className="mt-6 font-[family-name:var(--font-driven-display)] text-3xl italic text-driven-ink">Add a vehicle</h1>
      <p className="mt-2 max-w-xl text-sm text-driven-muted">
        We&apos;ll create your Reclaimed passport and take you to upload history. Registration can be prefilled with a DVLA lookup
        where configured.
      </p>
      <div className="mx-auto mt-10 max-w-2xl">
        <DrivenAddCarForm error={error} />
      </div>
    </div>
  );
}
