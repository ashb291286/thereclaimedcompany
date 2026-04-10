import { prisma } from "@/lib/db";
import { MOCK_AUCTION_LISTING_ID } from "@/app/driven/_lib/mock-auction";

export type DrivenQaCommentNode = {
  id: string;
  parentId: string | null;
  body: string;
  createdAt: Date;
  userId: string;
  authorName: string;
  authorImage: string | null;
  isSeller: boolean;
  replies: DrivenQaCommentNode[];
};

type FlatNode = Omit<DrivenQaCommentNode, "replies">;

function buildCommentTree(flat: FlatNode[]): DrivenQaCommentNode[] {
  const byParent = new Map<string | null, FlatNode[]>();
  for (const n of flat) {
    const key = n.parentId;
    const list = byParent.get(key) ?? [];
    list.push(n);
    byParent.set(key, list);
  }
  function attach(parentId: string | null): DrivenQaCommentNode[] {
    const children = byParent.get(parentId) ?? [];
    return children.map((c) => ({
      ...c,
      replies: attach(c.id),
    }));
  }
  return attach(null);
}

const DEMO_OVERVIEW = `• Several buyers asked about gearbox feel and recent service history; the seller points to stamped entries in the passport timeline.
• Paint and panel gaps came up — discussion notes a partial respray in 2019 with photos in the lineage.
• Open point: one bidder asked for a cold-start video; seller said they can upload one before the final 48 hours.
• General tone is constructive; no disputes logged in this demo thread.`;

function demoFlatComments(): FlatNode[] {
  const t0 = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
  const t1 = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
  const t2 = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const t3 = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  return [
    {
      id: "demo-c1",
      parentId: null,
      body: "Is the G50 shift as notchy as early cars, or has the linkage been refreshed? Any invoices for clutch work?",
      createdAt: t0,
      userId: "demo-u1",
      authorName: "Alex M.",
      authorImage: null,
      isSeller: false,
    },
    {
      id: "demo-c2",
      parentId: "demo-c1",
      body: "Linkage was serviced in 2021 — there’s a service entry and PDF in the passport. Clutch feels strong; no slip under load when I filmed the walkaround.",
      createdAt: t1,
      userId: "demo-seller",
      authorName: "Seller",
      authorImage: null,
      isSeller: true,
    },
    {
      id: "demo-c3",
      parentId: null,
      body: "How much of the Guards Red is original vs respray? Any blend into the jambs?",
      createdAt: t2,
      userId: "demo-u2",
      authorName: "Sam K.",
      authorImage: null,
      isSeller: false,
    },
    {
      id: "demo-c4",
      parentId: "demo-c3",
      body: "Front wings and bonnet were resprayed in 2019 after parking dings; doors and roof are largely original paint. Jambs photos are in the DOCUMENT entry dated Mar 2019.",
      createdAt: t3,
      userId: "demo-seller",
      authorName: "Seller",
      authorImage: null,
      isSeller: true,
    },
  ];
}

export type DrivenAuctionQaPayload = {
  overview: string | null;
  overviewUpdatedAt: Date | null;
  threads: DrivenQaCommentNode[];
  commentCount: number;
  isMock: boolean;
};

export async function getDrivenAuctionQa(
  auctionId: string,
  ownerId: string | null
): Promise<DrivenAuctionQaPayload> {
  if (auctionId === MOCK_AUCTION_LISTING_ID) {
    const demo = demoFlatComments();
    return {
      overview: DEMO_OVERVIEW,
      overviewUpdatedAt: new Date(),
      threads: buildCommentTree(demo),
      commentCount: demo.length,
      isMock: true,
    };
  }

  const listing = await prisma.drivenAuctionListing.findUnique({
    where: { id: auctionId },
    select: {
      qaAiOverview: true,
      qaAiOverviewUpdatedAt: true,
      comments: {
        orderBy: { createdAt: "asc" },
        include: {
          user: { select: { id: true, name: true, image: true } },
        },
      },
    },
  });

  if (!listing) {
    return {
      overview: null,
      overviewUpdatedAt: null,
      threads: [],
      commentCount: 0,
      isMock: false,
    };
  }

  const flat: FlatNode[] = listing.comments.map((c) => ({
    id: c.id,
    parentId: c.parentId,
    body: c.body,
    createdAt: c.createdAt,
    userId: c.userId,
    authorName: c.user.name?.trim() || "Member",
    authorImage: c.user.image,
    isSeller: Boolean(ownerId && c.userId === ownerId),
  }));

  return {
    overview: listing.qaAiOverview,
    overviewUpdatedAt: listing.qaAiOverviewUpdatedAt,
    threads: buildCommentTree(flat),
    commentCount: listing.comments.length,
    isMock: false,
  };
}
