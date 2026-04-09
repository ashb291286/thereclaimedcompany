type Quote = {
  quote: string;
  name: string;
  role: string;
};

const ROW_A: Quote[] = [
  {
    quote:
      "Matched our period door ironmongery from a single photo — would have taken weeks trawling yards.",
    name: "James M.",
    role: "Home renovator · Yorkshire",
  },
  {
    quote:
      "We list strip-out lots and hear from serious reclaimers the same day. Less in the skip, more on the marketplace.",
    name: "Sarah K.",
    role: "Site manager · refit contractor",
  },
  {
    quote:
      "Distance sort by postcode means local buyers actually show up. Fewer no-shows on collection.",
    name: "Elena R.",
    role: "Reclamation yard · Midlands",
  },
  {
    quote:
      "Wanted ads brought three yards with the right coping bricks — paid less than new and kept character.",
    name: "Tom W.",
    role: "Self-build",
  },
  {
    quote:
      "Auction format shifted a job lot of joists in a week. Clear process, no endless messages.",
    name: "Marcus D.",
    role: "Demolition contractor",
  },
  {
    quote:
      "Carbon figures on listings help our clients report reuse — nice touch for refurb projects.",
    name: "Priya S.",
    role: "Architect",
  },
];

const ROW_B: Quote[] = [
  {
    quote:
      "Found a yard twenty miles away with the exact slate we needed — search beats cold-calling every time.",
    name: "Hannah L.",
    role: "Interior designer",
  },
  {
    quote:
      "Free-to-collect pieces go fast; the platform keeps it fair and visible to yards as well as the public.",
    name: "Chris P.",
    role: "Reclamation yard · South West",
  },
  {
    quote:
      "Stripe Connect meant we were paid without handing out bank details to every buyer.",
    name: "Anna F.",
    role: "Individual seller",
  },
  {
    quote:
      "Demolition alerts let us reserve glazing before the crusher — proper programme, proper salvage.",
    name: "Oliver N.",
    role: "Specialist buyer",
  },
  {
    quote:
      "Image search is scary good for tiles and cast iron — clients think we have a magic source.",
    name: "Becca H.",
    role: "Joinery workshop",
  },
  {
    quote:
      "From listing to handover in one thread. Less WhatsApp chaos, more actual reclaim.",
    name: "Dan V.",
    role: "Yard owner",
  },
];

function MarqueeRow({ quotes, direction }: { quotes: Quote[]; direction: "left" | "right" }) {
  const doubled = [...quotes, ...quotes];
  const trackClass =
    direction === "left" ? "testimonial-marquee-track-left" : "testimonial-marquee-track-right";

  return (
    <div className="relative overflow-hidden py-2">
      <div className={`flex w-max gap-5 ${trackClass}`}>
        {doubled.map((item, i) => (
          <figure
            key={`${item.name}-${i}`}
            className="flex w-[min(100vw-2rem,22rem)] shrink-0 flex-col justify-between rounded-2xl border border-zinc-200/90 bg-white px-5 py-4 shadow-sm sm:w-[24rem]"
          >
            <blockquote className="text-sm leading-relaxed text-zinc-700">
              <span className="text-brand">&ldquo;</span>
              {item.quote}
              <span className="text-brand">&rdquo;</span>
            </blockquote>
            <figcaption className="mt-3 border-t border-zinc-100 pt-3">
              <span className="text-sm font-semibold text-zinc-900">{item.name}</span>
              <span className="mt-0.5 block text-xs text-zinc-500">{item.role}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

export function TestimonialMarqueeFeed() {
  return (
    <section
      className="mt-14 w-full border-t border-zinc-200 bg-gradient-to-b from-stone-100 to-stone-50"
      aria-labelledby="testimonial-marquee-heading"
    >
      <div className="mx-auto max-w-7xl px-4 pt-10 pb-4 text-center sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand">Community</p>
        <h2 id="testimonial-marquee-heading" className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
          What people say
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-zinc-600">
          Buyers, sellers, yards, and contractors — reclaim in the wild.
        </p>
      </div>

      <div className="sr-only">
        <p>Testimonials from marketplace users:</p>
        <ul>
          {[...ROW_A, ...ROW_B].map((item, i) => (
            <li key={`sr-${item.name}-${i}`}>
              {item.quote} — {item.name}, {item.role}
            </li>
          ))}
        </ul>
      </div>

      <div className="w-full overflow-hidden pb-10" aria-hidden="true">
        <MarqueeRow quotes={ROW_A} direction="left" />
        <MarqueeRow quotes={ROW_B} direction="right" />
      </div>
    </section>
  );
}
