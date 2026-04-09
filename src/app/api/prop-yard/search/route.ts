import { NextRequest, NextResponse } from "next/server";
import { parsePropYardSearchFromParams, propOfferToDto, searchPropYardOffers } from "@/lib/prop-yard-search";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const settingMulti = sp.getAll("setting");
  const settingParam =
    settingMulti.length > 0 ? settingMulti : sp.get("setting") ?? undefined;

  const params: Record<string, string | string[] | undefined> = {
    q: sp.get("q") ?? undefined,
    condition: sp.get("condition") ?? undefined,
    geographicOrigin: sp.get("geographicOrigin") ?? undefined,
    availableNow: sp.get("availableNow") ?? undefined,
    era: sp.getAll("era"),
    genre: sp.getAll("genre"),
    style: sp.getAll("style"),
    settingInterior: sp.getAll("settingInterior"),
    settingExterior: sp.getAll("settingExterior"),
    setting: settingParam,
    category: sp.getAll("category"),
  };

  const filters = parsePropYardSearchFromParams(params);
  const offers = await searchPropYardOffers(filters);

  const payload = offers.map(propOfferToDto);

  return NextResponse.json({ count: payload.length, offers: payload });
}
