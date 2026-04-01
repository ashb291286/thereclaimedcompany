"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { getCroppedImageBlob } from "@/lib/image-crop";

const ASPECT = 4 / 3;

type Props = {
  imageSrc: string;
  fileName: string;
  onCancel: () => void;
  onComplete: (file: File) => void;
};

export function ListingImageCropModal({ imageSrc, fileName, onCancel, onComplete }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  async function handleUsePhoto() {
    if (!croppedAreaPixels) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels);
      const safeName = fileName.replace(/\.[^.]+$/, "") || "photo";
      const file = new File([blob], `${safeName}.jpg`, { type: "image/jpeg" });
      onComplete(file);
    } catch {
      setError("Could not process the image. Try another photo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="crop-modal-title"
    >
      <div className="flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="border-b border-zinc-200 px-4 py-3">
          <h2 id="crop-modal-title" className="text-lg font-semibold text-zinc-900">
            Crop &amp; centre your photo
          </h2>
          <p className="mt-0.5 text-sm text-zinc-600">
            Drag to position. Pinch or use the slider to zoom. Listings use a 4:3 frame.
          </p>
        </div>
        <div className="relative aspect-[4/3] w-full bg-zinc-900">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={ASPECT}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            showGrid={false}
          />
        </div>
        <div className="space-y-3 border-t border-zinc-200 px-4 py-3">
          <label className="flex items-center gap-3 text-sm text-zinc-700">
            <span className="shrink-0">Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="h-2 flex-1 accent-brand"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUsePhoto}
              disabled={busy || !croppedAreaPixels}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
            >
              {busy ? "Processing…" : "Use photo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
