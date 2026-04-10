"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  images: string[];
  title: string;
};

export function ListingImageGallery({ images, title }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const updateIndexFromScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || images.length <= 1) return;
    const w = el.clientWidth;
    if (w <= 0) return;
    const i = Math.round(el.scrollLeft / w);
    setIndex(Math.min(images.length - 1, Math.max(0, i)));
  }, [images.length]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || images.length <= 1) return;
    updateIndexFromScroll();
    el.addEventListener("scroll", updateIndexFromScroll, { passive: true });
    return () => el.removeEventListener("scroll", updateIndexFromScroll);
  }, [images.length, updateIndexFromScroll]);

  const scrollBySlide = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth, behavior: "smooth" });
  };

  const goToSlide = (i: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const w = el.clientWidth;
    el.scrollTo({ left: i * w, behavior: "smooth" });
  };

  if (images.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-xl bg-zinc-100 text-zinc-500">
        No image
      </div>
    );
  }

  if (images.length === 1) {
    return (
      <div className="relative aspect-square overflow-hidden rounded-xl bg-zinc-100">
        <Image
          src={images[0]}
          alt={title}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, min(896px, 100vw - 22rem)"
          unoptimized
        />
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        className="flex aspect-square snap-x snap-mandatory overflow-x-auto scroll-smooth rounded-xl bg-zinc-100 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((url, i) => (
          <div
            key={`${url}-${i}`}
            className="relative min-w-full flex-[0_0_100%] snap-center"
          >
            <div className="relative aspect-square w-full">
              <Image
                src={url}
                alt={`${title} — photo ${i + 1} of ${images.length}`}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, min(896px, 100vw - 22rem)"
                unoptimized
                priority={i === 0}
              />
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        aria-label="Previous photo"
        disabled={index <= 0}
        onClick={() => scrollBySlide(-1)}
        className="absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-zinc-900/55 text-white shadow-md backdrop-blur-sm transition hover:bg-zinc-900/75 disabled:pointer-events-none disabled:opacity-30"
      >
        <Chevron direction="left" />
      </button>
      <button
        type="button"
        aria-label="Next photo"
        disabled={index >= images.length - 1}
        onClick={() => scrollBySlide(1)}
        className="absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-zinc-900/55 text-white shadow-md backdrop-blur-sm transition hover:bg-zinc-900/75 disabled:pointer-events-none disabled:opacity-30"
      >
        <Chevron direction="right" />
      </button>

      <div className="pointer-events-none absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
        {images.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Show photo ${i + 1}`}
            aria-current={i === index ? "true" : undefined}
            onClick={() => goToSlide(i)}
            className={`pointer-events-auto h-2 w-2 rounded-full transition ${
              i === index ? "scale-110 bg-white shadow" : "bg-white/50 hover:bg-white/80"
            }`}
          />
        ))}
      </div>

      <p className="sr-only" aria-live="polite">
        Photo {index + 1} of {images.length}
      </p>
    </div>
  );
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {direction === "left" ? (
        <path d="M15 6l-6 6 6 6" />
      ) : (
        <path d="M9 6l6 6-6 6" />
      )}
    </svg>
  );
}
