"use client";

import Link from "next/link";
import { useActionState, useEffect, useId, useRef } from "react";
import {
  postDrivenAuctionCommentAction,
  type DrivenQaFormState,
} from "@/lib/actions/driven-auction-qa";

export type DrivenQaCommentNodeJSON = {
  id: string;
  body: string;
  createdAt: string;
  authorName: string;
  authorImage: string | null;
  isSeller: boolean;
  replies: DrivenQaCommentNodeJSON[];
};

const initialFormState: DrivenQaFormState = {};

function formatShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function ReplyForm({
  auctionId,
  parentId,
  disabled,
}: {
  auctionId: string;
  parentId: string;
  disabled: boolean;
}) {
  const [state, formAction] = useActionState(postDrivenAuctionCommentAction, initialFormState);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (state.ok && taRef.current) {
      taRef.current.value = "";
    }
  }, [state.ok]);

  return (
    <form action={formAction} className="mt-3 space-y-2 border-t border-driven-warm/60 pt-3">
      <input type="hidden" name="auctionId" value={auctionId} />
      <input type="hidden" name="parentId" value={parentId} />
      <label className="sr-only" htmlFor={`reply-${parentId}`}>
        Your reply
      </label>
      <textarea
        id={`reply-${parentId}`}
        ref={taRef}
        name="body"
        required
        rows={3}
        disabled={disabled}
        placeholder="Write a reply…"
        className="w-full resize-y rounded-sm border border-driven-warm bg-driven-paper px-3 py-2 text-sm text-driven-ink placeholder:text-driven-muted focus:border-driven-accent focus:outline-none focus:ring-1 focus:ring-driven-accent disabled:opacity-50"
      />
      {state.error ? <p className="text-xs text-red-700">{state.error}</p> : null}
      <button
        type="submit"
        disabled={disabled}
        className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-[0.15em] text-driven-accent underline disabled:opacity-40"
      >
        Post reply
      </button>
    </form>
  );
}

function CommentCard({
  node,
  auctionId,
  depth,
  canPost,
  isMock,
}: {
  node: DrivenQaCommentNodeJSON;
  auctionId: string;
  depth: number;
  canPost: boolean;
  isMock: boolean;
}) {
  const showReply = canPost && !isMock && depth < 6;

  return (
    <li className="rounded-sm border border-driven-warm bg-white/40 px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="font-[family-name:var(--font-driven-mono)] text-[11px] font-medium text-driven-ink">
          {node.authorName}
        </span>
        {node.isSeller ? (
          <span className="font-[family-name:var(--font-driven-mono)] text-[9px] uppercase tracking-wider text-driven-accent">
            Seller
          </span>
        ) : null}
        <span className="font-[family-name:var(--font-driven-mono)] text-[10px] text-driven-muted">
          {formatShortDate(node.createdAt)}
        </span>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-driven-ink">{node.body}</p>

      {showReply ? (
        <details className="group mt-2">
          <summary className="cursor-pointer font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-wide text-driven-muted hover:text-driven-accent">
            Reply
          </summary>
          <ReplyForm auctionId={auctionId} parentId={node.id} disabled={isMock} />
        </details>
      ) : null}

      {node.replies.length > 0 ? (
        <ul className="mt-4 space-y-3 border-l border-driven-warm/80 pl-4">
          {node.replies.map((r) => (
            <CommentCard
              key={r.id}
              node={r}
              auctionId={auctionId}
              depth={depth + 1}
              canPost={canPost}
              isMock={isMock}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function DrivenAuctionQaClient(props: {
  auctionId: string;
  canPost: boolean;
  isMock: boolean;
  overview: string | null;
  overviewUpdatedAt: string | null;
  threads: DrivenQaCommentNodeJSON[];
  threadVersion: number;
}) {
  const { auctionId, canPost, isMock, overview, overviewUpdatedAt, threads, threadVersion } = props;
  const [topState, topAction] = useActionState(postDrivenAuctionCommentAction, initialFormState);
  const topTaRef = useRef<HTMLTextAreaElement>(null);
  const askId = useId();

  useEffect(() => {
    if (topState.ok && topTaRef.current) {
      topTaRef.current.value = "";
    }
  }, [topState.ok]);

  const callbackUrl = `/driven/auctions/${auctionId}`;

  return (
    <div className="space-y-6">
      {isMock ? (
        <p className="rounded-sm border border-driven-warm bg-driven-accent-light/30 px-3 py-2 font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-wide text-driven-ink">
          Demo listing — thread below is illustrative. Posting is enabled on live auctions only.
        </p>
      ) : null}

      <div className="rounded-sm border border-driven-warm bg-driven-accent-light/20 px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-[family-name:var(--font-driven-display)] text-lg italic text-driven-ink">
            AI overview
          </h3>
          {overviewUpdatedAt ? (
            <span className="font-[family-name:var(--font-driven-mono)] text-[9px] uppercase tracking-wider text-driven-muted">
              Updated {formatShortDate(overviewUpdatedAt)}
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-driven-muted">
          Auto-generated from the thread below. It may be incomplete or wrong — always read the full comments and
          verify facts with the seller.
        </p>
        {overview ? (
          <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-driven-ink">{overview}</div>
        ) : threads.length === 0 ? (
          <p className="mt-3 text-sm text-driven-muted">
            Once people start asking questions, a short summary will appear here.
          </p>
        ) : (
          <p className="mt-3 text-sm text-driven-muted">
            No summary stored yet — it will refresh when someone posts a new comment (requires OPENAI_API_KEY on
            the server).
          </p>
        )}
      </div>

      <div>
        <h3 className="font-[family-name:var(--font-driven-display)] text-lg italic text-driven-ink">
          Thread
        </h3>
        {threads.length === 0 ? (
          <p className="mt-3 text-sm text-driven-muted">No questions yet — be the first to ask.</p>
        ) : (
          <ul key={threadVersion} className="mt-4 space-y-4">
            {threads.map((t) => (
              <CommentCard
                key={t.id}
                node={t}
                auctionId={auctionId}
                depth={0}
                canPost={canPost}
                isMock={isMock}
              />
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-driven-warm pt-6">
        <h3 className="font-[family-name:var(--font-driven-display)] text-lg italic text-driven-ink">
          Ask a question
        </h3>
        {canPost && !isMock ? (
          <form action={topAction} className="mt-3 space-y-2">
            <input type="hidden" name="auctionId" value={auctionId} />
            <label className="sr-only" htmlFor={askId}>
              Your question or comment
            </label>
            <textarea
              id={askId}
              ref={topTaRef}
              name="body"
              required
              rows={4}
              placeholder="Be specific — sellers and other bidders can reply in the thread."
              className="w-full resize-y rounded-sm border border-driven-warm bg-white px-3 py-2 text-sm text-driven-ink placeholder:text-driven-muted focus:border-driven-accent focus:outline-none focus:ring-1 focus:ring-driven-accent"
            />
            {topState.error ? <p className="text-xs text-red-700">{topState.error}</p> : null}
            <button
              type="submit"
              className="rounded-sm bg-driven-ink px-4 py-2 font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-[0.2em] text-driven-paper hover:opacity-90"
            >
              Post publicly
            </button>
          </form>
        ) : isMock ? (
          <p className="mt-3 text-sm text-driven-muted">
            Switch to a live auction to post — this page is a static preview.
          </p>
        ) : (
          <p className="mt-3 text-sm text-driven-muted">
            <Link href={`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="text-driven-accent underline">
              Sign in
            </Link>{" "}
            to ask a question or join the thread.
          </p>
        )}
      </div>
    </div>
  );
}
