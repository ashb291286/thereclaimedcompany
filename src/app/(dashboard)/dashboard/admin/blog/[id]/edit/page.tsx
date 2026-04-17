import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { isCarbonAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { adminUpdateBlogPostAction } from "@/lib/actions/admin-overview";
import { BlogFeaturedImageField } from "../../../BlogFeaturedImageField";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function AdminBlogEditPage({ params, searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  if (!isCarbonAdmin(session)) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950">
        You don&apos;t have access. Add your email to{" "}
        <code className="rounded bg-amber-100 px-1">ADMIN_EMAILS</code>.
      </div>
    );
  }

  const { id } = await params;
  const { error } = await searchParams;

  const post = await prisma.blogPost.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      featuredImageUrl: true,
      htmlContent: true,
      published: true,
      publishedAt: true,
      createdAt: true,
    },
  });
  if (!post) notFound();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Edit blog post</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-600">
            Update title, slug, excerpt, featured image, HTML, and publish state. View, unpublish, and delete remain on
            the{" "}
            <Link href="/dashboard/admin" className="font-medium text-brand hover:underline">
              admin overview
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/admin" className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50">
            Admin overview
          </Link>
          {post.published ? (
            <Link
              href={`/blog/${post.slug}`}
              target="_blank"
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
            >
              View live post
            </Link>
          ) : (
            <span className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-600">
              Draft — not public until published
            </span>
          )}
        </div>
      </div>

      {error === "blog_slug_taken" ? (
        <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
          That slug is already used by another post. Choose a different slug.
        </p>
      ) : null}

      <form action={adminUpdateBlogPostAction} className="grid max-w-4xl gap-3 rounded-xl border border-zinc-200 bg-white p-4">
        <input type="hidden" name="id" value={post.id} />
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-zinc-700">Title</span>
            <input
              name="title"
              required
              maxLength={180}
              defaultValue={post.title}
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-zinc-700">Slug</span>
            <input
              name="slug"
              maxLength={140}
              defaultValue={post.slug}
              className="w-full rounded border border-zinc-300 px-3 py-2 font-mono text-xs"
            />
          </label>
        </div>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-zinc-700">Excerpt (optional)</span>
          <input
            name="excerpt"
            maxLength={300}
            defaultValue={post.excerpt ?? ""}
            placeholder="Short summary for homepage and blog list."
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        <BlogFeaturedImageField defaultUrl={post.featuredImageUrl} />
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-zinc-700">HTML content</span>
          <textarea
            name="htmlContent"
            required
            rows={16}
            defaultValue={post.htmlContent}
            className="w-full rounded border border-zinc-300 px-3 py-2 font-mono text-xs"
          />
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
          <input type="checkbox" name="published" defaultChecked={post.published} />
          Published
        </label>
        <p className="text-xs text-zinc-500">
          Date line on the post uses: {(post.publishedAt ?? post.createdAt).toISOString().slice(0, 10)}. Unpublishing clears the published date; publishing again sets a new first-published date.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800">
            Save changes
          </button>
          <Link href="/dashboard/admin" className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
