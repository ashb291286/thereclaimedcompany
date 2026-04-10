import { getDrivenAuctionQa, type DrivenQaCommentNode } from "@/app/driven/_lib/get-driven-auction-qa";
import {
  DrivenAuctionQaClient,
  type DrivenQaCommentNodeJSON,
} from "@/components/driven/DrivenAuctionQaClient";

function serializeThreads(nodes: DrivenQaCommentNode[]): DrivenQaCommentNodeJSON[] {
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

export async function DrivenAuctionQaSection(props: {
  auctionId: string;
  ownerId: string | null;
  canPost: boolean;
}) {
  const { auctionId, ownerId, canPost } = props;
  const qa = await getDrivenAuctionQa(auctionId, ownerId);

  return (
    <section className="border border-driven-warm bg-white px-5 py-6">
      <h2 className="font-[family-name:var(--font-driven-display)] text-xl italic text-driven-ink">
        Questions &amp; comments
      </h2>
      <p className="mt-2 text-sm text-driven-muted">
        Public thread — the seller and community can reply. Stay respectful and on-topic.
      </p>
      <div className="mt-6">
        <DrivenAuctionQaClient
          auctionId={auctionId}
          canPost={canPost}
          isMock={qa.isMock}
          overview={qa.overview}
          overviewUpdatedAt={qa.overviewUpdatedAt?.toISOString() ?? null}
          threads={serializeThreads(qa.threads)}
          threadVersion={qa.commentCount}
        />
      </div>
    </section>
  );
}
