"use client";

import Link from "next/link";
import { useActionState, useEffect, useId, useRef } from "react";
import { postListingQaCommentAction, type ListingQaFormState } from "@/lib/actions/listing-qa";

export type ListingQaCommentNodeJSON = {
  id: string;
  body: string;
  createdAt: string;
  authorName: string;
  authorImage: string | null;
  isSeller: boolean;
  replies: ListingQaCommentNodeJSON[];
};

const initialFormState: ListingQaFormState = {};

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
  listingId,
  parentId,
  disabled,
}: {
  listingId: string;
  parentId: string;
  disabled: boolean;
}) {
  const [state, formAction] = useActionState(postListingQaCommentAction, initialFormState);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (state.ok && taRef.current) {
      taRef.current.value = "";
    }
  }, [state.ok]);

  return (
    <form action={formAction} className="mt-3 space-y-2 border-t border-zinc-200 pt-3">
      <input type="hidden" name="listingId" value={listingId} />
      <input type="hidden" name="parentId" value={parentId} />
      <label className="sr-only" htmlFor={`listing-reply-${parentId}`}>
        Your reply
      </label>
      <textarea
        id={`listing-reply-${parentId}`}
        ref={taRef}
        name="body"
        required
        rows={3}
        disabled={disabled}
        placeholder="Write a reply…"
        className="w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25 disabled:opacity-50"
      />
      {state.error ? <p className="text-xs text-red-700">{state.error}</p> : null}
      <button
        type="submit"
        disabled={disabled}
        className="text-xs font-semibold uppercase tracking-wide text-brand hover:underline disabled:opacity-40"
      >
        Post reply
      </button>
    </form>
  );
}

function CommentCard({
  node,
  listingId,
  depth,
  canPost,
}: {
  node: ListingQaCommentNodeJSON;
  listingId: string;
  depth: number;
  canPost: boolean;
}) {
  const showReply = canPost && depth < 6;

  return (
    <li className="rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="text-xs font-semibold text-zinc-900">{node.authorName}</span>
        {node.isSeller ? (
          <span className="rounded bg-brand-soft px-1.5 py-0.5 text-[10px] font-bold uppercase text-brand">
            Seller
          </span>
        ) : null}
        <span className="text-[11px] text-zinc-500">{formatShortDate(node.createdAt)}</span>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">{node.body}</p>

      {showReply ? (
        <details className="group mt-2">
          <summary className="cursor-pointer text-xs font-medium text-zinc-500 hover:text-brand">
            Reply
          </summary>
          <ReplyForm listingId={listingId} parentId={node.id} disabled={false} />
        </details>
      ) : null}

      {node.replies.length > 0 ? (
        <ul className="mt-4 space-y-3 border-l-2 border-zinc-200 pl-4">
          {node.replies.map((r) => (
            <CommentCard key={r.id} node={r} listingId={listingId} depth={depth + 1} canPost={canPost} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function ListingQaClient(props: {
  listingId: string;
  canPost: boolean;
  /** When non-null, signed-in users see why posting is disabled (read-only thread). */
  postingClosedNote: string | null;
  overview: string | null;
  overviewUpdatedAt: string | null;
  threads: ListingQaCommentNodeJSON[];
  threadVersion: number;
}) {
  const { listingId, canPost, postingClosedNote, overview, overviewUpdatedAt, threads, threadVersion } = props;
  const [topState, topAction] = useActionState(postListingQaCommentAction, initialFormState);
  const topTaRef = useRef<HTMLTextAreaElement>(null);
  const askId = useId();

  useEffect(() => {
    if (topState.ok && topTaRef.current) {
      topTaRef.current.value = "";
    }
  }, [topState.ok]);

  const callbackUrl = `/listings/${listingId}`;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-gradient-to-b from-brand-soft/30 to-white px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-700">AI overview</h3>
          {overviewUpdatedAt ? (
            <span className="text-[11px] text-zinc-500">Updated {formatShortDate(overviewUpdatedAt)}</span>
          ) : null}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-zinc-600">
          Auto-generated from the thread below. It may be incomplete or wrong — always read the full comments and
          verify details with the seller.
        </p>
        {overview ? (
          <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">{overview}</div>
        ) : threads.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600">
            Once people start asking questions, a short summary will appear here.
          </p>
        ) : (
          <p className="mt-3 text-sm text-zinc-600">
            No summary stored yet — it refreshes when someone posts (requires{" "}
            <code className="rounded bg-zinc-100 px-1 text-xs">OPENAI_API_KEY</code> on the server).
          </p>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Discussion</h3>
        {threads.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600">No questions yet — be the first to ask.</p>
        ) : (
          <ul key={threadVersion} className="mt-4 space-y-4">
            {threads.map((t) => (
              <CommentCard key={t.id} node={t} listingId={listingId} depth={0} canPost={canPost} />
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-zinc-200 pt-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Ask a question</h3>
        {canPost ? (
          <form action={topAction} className="mt-3 space-y-2">
            <input type="hidden" name="listingId" value={listingId} />
            <label className="sr-only" htmlFor={askId}>
              Your question or comment
            </label>
            <textarea
              id={askId}
              ref={topTaRef}
              name="body"
              required
              rows={4}
              placeholder="Be specific — the seller and other buyers can reply in the thread."
              className="w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
            />
            {topState.error ? <p className="text-xs text-red-700">{topState.error}</p> : null}
            <button
              type="submit"
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
            >
              Post publicly
            </button>
          </form>
        ) : postingClosedNote ? (
          <p className="mt-3 text-sm text-zinc-600">{postingClosedNote}</p>
        ) : (
          <p className="mt-3 text-sm text-zinc-600">
            <Link href={`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="font-medium text-brand hover:underline">
              Sign in
            </Link>{" "}
            to ask a question or join the thread.
          </p>
        )}
      </div>
    </div>
  );
}
