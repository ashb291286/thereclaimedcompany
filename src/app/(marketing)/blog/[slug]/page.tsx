import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSiteBaseUrl } from "@/lib/site-url";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await prisma.blogPost.findFirst({
    where: { slug, published: true },
    select: { title: true, excerpt: true, htmlContent: true },
  });
  if (!post) return { title: "Blog post" };
  const description = (post.excerpt || post.htmlContent.replace(/<[^>]*>/g, " ").trim()).slice(0, 160);
  return {
    title: post.title,
    description,
    alternates: { canonical: `${getSiteBaseUrl()}/blog/${slug}` },
    openGraph: { title: post.title, description, type: "article" },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await prisma.blogPost.findFirst({
    where: { slug, published: true },
    select: { title: true, htmlContent: true, publishedAt: true, createdAt: true },
  });
  if (!post) notFound();

  return (
    <article className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-6 border-b border-zinc-200 pb-4">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">{post.title}</h1>
        <p className="mt-2 text-sm text-zinc-500">{(post.publishedAt ?? post.createdAt).toISOString().slice(0, 10)}</p>
      </header>
      <div
        className="prose prose-zinc max-w-none prose-headings:scroll-mt-24 prose-a:text-brand"
        dangerouslySetInnerHTML={{ __html: post.htmlContent }}
      />
    </article>
  );
}
