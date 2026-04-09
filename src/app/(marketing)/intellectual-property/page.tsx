import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Intellectual Property | The Reclaimed Company",
  description:
    "Everything Deserves A Second Chance. The Reclaimed Company intellectual property, mission, process, and trademark details.",
};

export default function IntellectualPropertyPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="border-b border-zinc-200 pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Everything Deserves A Second Chance™
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-zinc-900 sm:text-4xl">
          Intellectual Property
        </h1>
      </header>

      <section className="mt-8 space-y-4 text-sm leading-7 text-zinc-700 sm:text-base">
        <p>
          Welcome to The Reclaimed Company&apos;s Intellectual Property page. Our platform is dedicated to promoting unique
          salvaged, reclaimed, and antique items. We encourage you to explore the treasures available on our site.
          Together, let&apos;s celebrate and protect the artistry that inspires our mission to repurpose and reuse,
          fostering a greener and more sustainable future.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold text-zinc-900">Our Vision</h2>
        <p className="mt-3 text-sm leading-7 text-zinc-700 sm:text-base">
          Our vision at The Reclaimed Company is to create a world where every reclaimed item tells a story, inspiring
          communities to embrace sustainability, celebrate craftsmanship, and preserve the environment by giving new
          life to materials and treasures from the past.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold text-zinc-900">Our Mission</h2>
        <p className="mt-3 text-sm leading-7 text-zinc-700 sm:text-base">
          Our mission at The Reclaimed Company is to promote sustainable living by connecting individuals with salvaged,
          reclaimed, and antique items, fostering a culture of creativity and environmental responsibility through the
          repurposing of materials.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold text-zinc-900">Our Process</h2>
        <div className="mt-3 space-y-4 text-sm leading-7 text-zinc-700 sm:text-base">
          <p>
            With years of experience in reclamation, we now want to embrace the wider industry and the public by
            creating a dedicated, cost-effective online marketplace - not just for ourselves, but for fellow salvage
            yards, independent reclaimers, and anyone with surplus materials to sell.
          </p>
          <p>
            Our goal: To become the go-to platform where reclamation yards can list and sell their stock, tradespeople
            and homeowners can turn leftover bricks and stone into cash, and buyers can easily find reclaimed and
            surplus materials locally, affordably, and sustainably.
          </p>
          <p>
            We&apos;re opening up our digital platform so the entire community can benefit - giving industry professionals
            and the public alike the tools to buy and sell online efficiently, and to move surplus materials faster,
            with less waste and more impact.
          </p>
          <p className="font-medium text-zinc-900">
            The Reclaimed Company ® Marketplace
            <br />
            Built for the trade. Open to all. Powered by sustainability.
          </p>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold text-zinc-900">The values we live by</h2>
        <p className="mt-3 text-sm leading-7 text-zinc-700 sm:text-base">
          At The Reclaimed Company, we understand the importance of protecting our unique brand identity and messaging;
          therefore, all key phrases associated with our marketplace are trademarked to ensure the integrity of our
          mission and offerings.
        </p>
        <ul className="mt-4 space-y-2 text-sm font-medium text-zinc-900 sm:text-base">
          <li>&quot;Everything Deserves a Second Chance™&quot;</li>
          <li>&quot;On The Salvage Scene™&quot;</li>
          <li>&quot;Where The Past Finds New Purpose™&quot;</li>
          <li>&quot;Revive, Resuse, Reclaim!™&quot;</li>
          <li>&quot;Salvage The Past, Sustain The Future™&quot;</li>
          <li>&quot;Connecting Buyers &amp; Sellers Locally Around The World™&quot;</li>
        </ul>
      </section>

      <section className="mt-10 rounded-xl border border-zinc-200 bg-white p-5 sm:p-6">
        <h2 className="text-xl font-semibold text-zinc-900">Intellectual Property - thereclaimedcompany.com</h2>
        <p className="mt-1 text-sm text-zinc-700">The Reclaimed Company</p>
        <dl className="mt-4 grid gap-x-4 gap-y-2 text-sm text-zinc-700 sm:grid-cols-[180px_1fr]">
          <dt className="font-medium text-zinc-900">Trademark</dt>
          <dd>UK00003295083</dd>
          <dt className="font-medium text-zinc-900">Status</dt>
          <dd>Registered</dd>
          <dt className="font-medium text-zinc-900">Mark type</dt>
          <dd>Word</dd>
          <dt className="font-medium text-zinc-900">Mark text</dt>
          <dd>THE RECLAIMED COMPANY</dd>
          <dt className="font-medium text-zinc-900">File date</dt>
          <dd>07 March 2018</dd>
          <dt className="font-medium text-zinc-900">Classes</dt>
          <dd>6, 19, 35, 39, 42</dd>
          <dt className="font-medium text-zinc-900">Record</dt>
          <dd>
            <Link
              href="https://trademarks.ipo.gov.uk/ipo-tmcase/page/Results/1/UK00003295083"
              target="_blank"
              rel="noreferrer"
              className="text-brand underline hover:text-brand-hover"
            >
              View Trademark
            </Link>
          </dd>
        </dl>
      </section>
    </div>
  );
}
