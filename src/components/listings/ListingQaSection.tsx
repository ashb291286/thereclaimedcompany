import { getListingQa, type ListingQaCommentNode } from "@/app/(marketing)/listings/_lib/get-listing-qa";
import { ListingQaClient, type ListingQaCommentNodeJSON } from "@/components/listings/ListingQaClient";

function serializeThreads(nodes: ListingQaCommentNode[]): ListingQaCommentNodeJSON[] {
  return nodes.map((n) => ({
    id: n.id,
    body: n.body,
    createdAt: n.createdAt.toISOString(),
    authorName: n.authorName,
    authorImage: n.authorImage,
    isSeller: n.isSeller,
    replies: serializeThreads(n.replies),
  }));
}

export async function ListingQaSection(props: {
  listingId: string;
  sellerId: string;
  canPost: boolean;
  postingClosedNote: string | null;
}) {
  const { listingId, sellerId, canPost, postingClosedNote } = props;
  const qa = await getListingQa(listingId, sellerId);

  return (
    <section className="mt-8 rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm sm:mt-10 sm:p-6">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Questions &amp; comments</h2>
      <p className="mt-2 text-sm text-zinc-600">
        Public thread — the seller and other members can reply. Stay respectful and on-topic.
      </p>
      <div className="mt-6">
        <ListingQaClient
          listingId={listingId}
          canPost={canPost}
          postingClosedNote={postingClosedNote}
          overview={qa.overview}
          overviewUpdatedAt={qa.overviewUpdatedAt?.toISOString() ?? null}
          threads={serializeThreads(qa.threads)}
          threadVersion={qa.commentCount}
        />
      </div>
    </section>
  );
}
