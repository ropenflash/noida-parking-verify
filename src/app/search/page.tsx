import { searchParking } from "@/lib/actions/search";
import { StatusBadge } from "@/components/status-badge";
import Link from "next/link";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const { results } = q ? await searchParking(q) : { results: { sites: [], contractors: [], sources: [], reports: [] } };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">Search</h1>
      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Sector 142, Advant, Arvind Yadav, Parking 142"
          className="h-12 flex-1 rounded-md border bg-white px-3 text-sm"
        />
        <button className="h-12 rounded-md bg-zinc-900 px-4 text-sm text-white">Search</button>
      </form>

      <Group title="Parking sites">
        {results.sites.map((s) => (
          <p key={s.id} className="rounded-md border bg-white p-3 text-sm">
            {s.name}
            {s.sector ? ` · Sector ${s.sector}` : ""}
            {s.is_demo ? " · DEMO DATA" : ""}
          </p>
        ))}
        {q && results.sites.length === 0 ? <p className="text-sm text-zinc-600">No sites.</p> : null}
      </Group>
      <Group title="Contractors">
        {results.contractors.map((c) => (
          <p key={c.id} className="rounded-md border bg-white p-3 text-sm">
            {c.display_name || c.legal_name} · {c.verification_status}
            {c.is_demo ? " · DEMO DATA" : ""}
          </p>
        ))}
      </Group>
      <Group title="Authority records">
        {results.sources.map((s) => (
          <p key={s.id} className="rounded-md border bg-white p-3 text-sm">
            {s.source_title}
            {s.is_demo ? " · DEMO DATA" : ""}
          </p>
        ))}
      </Group>
      <Group title="Reports you can see">
        {results.reports.map((r) => (
          <Link key={r.id} href={`/reports/${r.id}`} className="flex items-center justify-between rounded-md border bg-white p-3 text-sm">
            <span>{r.location_name ?? r.sector}</span>
            <StatusBadge classification={r.classification} />
          </Link>
        ))}
      </Group>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}
