import { prisma } from "@/lib/db";

export type ListingQaCommentNode = {
  id: string;
  parentId: string | null;
  body: string;
  createdAt: Date;
  userId: string;
  authorName: string;
  authorImage: string | null;
  isSeller: boolean;
  replies: ListingQaCommentNode[];
};

type FlatNode = Omit<ListingQaCommentNode, "replies">;

function buildCommentTree(flat: FlatNode[]): ListingQaCommentNode[] {
  const byParent = new Map<string | null, FlatNode[]>();
  for (const n of flat) {
    const key = n.parentId;
    const list = byParent.get(key) ?? [];
    list.push(n);
    byParent.set(key, list);
  }
  function attach(parentId: string | null): ListingQaCommentNode[] {
    const children = byParent.get(parentId) ?? [];
    return children.map((c) => ({
      ...c,
      replies: attach(c.id),
    }));
  }
  return attach(null);
}

export type ListingQaPayload = {
  overview: string | null;
  overviewUpdatedAt: Date | null;
  threads: ListingQaCommentNode[];
  commentCount: number;
};

export async function getListingQa(listingId: string, sellerId: string | null): Promise<ListingQaPayload> {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: {
      qaAiOverview: true,
      qaAiOverviewUpdatedAt: true,
      qaComments: {
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
    };
  }

  const flat: FlatNode[] = listing.qaComments.map((c) => ({
    id: c.id,
    parentId: c.parentId,
    body: c.body,
    createdAt: c.createdAt,
    userId: c.userId,
    authorName: c.user.name?.trim() || "Member",
    authorImage: c.user.image,
    isSeller: Boolean(sellerId && c.userId === sellerId),
  }));

  return {
    overview: listing.qaAiOverview,
    overviewUpdatedAt: listing.qaAiOverviewUpdatedAt,
    threads: buildCommentTree(flat),
    commentCount: listing.qaComments.length,
  };
}
