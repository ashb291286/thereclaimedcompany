import {
  parsePropYardSearchFromParams,
  propOfferToDto,
  searchPropYardOffers,
} from "@/lib/prop-yard-search";
import { PropYardSearchClient } from "./PropYardSearchClient";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PropYardSearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const filters = parsePropYardSearchFromParams(sp);
  const initialRows = await searchPropYardOffers(filters);
  const initialOffers = initialRows.map(propOfferToDto);

  const setId = typeof sp.setId === "string" ? sp.setId.trim() : "";
  const error = typeof sp.error === "string" ? sp.error : "";

  return (
    <PropYardSearchClient initialFilters={filters} initialOffers={initialOffers} setId={setId} error={error} />
  );
}
