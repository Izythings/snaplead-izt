import { Camera, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { parseExifAndLocation, type ExifResult } from "../infrastructure/browser/exif";
import { prepareImageForVision } from "../infrastructure/browser/image";

export type PhotoItem = {
  id: string;
  file: File;
  preview: string;
  exif: ExifResult;
  status: "ready" | "uploading" | "done" | "failed";
  error?: string;
};

export default function PhotoDropzone({ onPhotos }: { onPhotos: (photos: PhotoItem[]) => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFiles = async (files: FileList | File[]) => {
    setLoading(true);
    const images = Array.from(files).filter((file) => file.type.startsWith("image/"));
    const parsed = await Promise.all(
      images.map(async (file) => {
        const exif = await parseExifAndLocation(file);
        const prepared = await prepareImageForVision(file).catch(() => file);
        return {
          id: crypto.randomUUID(),
          file: prepared,
          preview: URL.createObjectURL(prepared),
          exif,
          status: "ready" as const,
        };
      }),
    );
    onPhotos(parsed);
    setLoading(false);
  };

  return (
    <div
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        void handleFiles(event.dataTransfer.files);
      }}
      className="flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-6 text-center transition-colors hover:border-ember/50 hover:bg-accent/30"
      onClick={() => inputRef.current?.click()}
    >
      <span className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-secondary text-ember">
        <Camera size={28} aria-hidden="true" />
      </span>
      <div className="font-display text-lg font-semibold">Prendre ou déposer des photos</div>
      <p className="mt-1 max-w-md text-sm text-muted">Multi-photo, EXIF GPS et date extraits avant compression et upload.</p>
      <span className="snap-button pointer-events-none mt-5">
        <UploadCloud size={17} aria-hidden="true" />
        Choisir les photos
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        capture="environment"
        className="hidden"
        aria-label="Choisir des photos terrain"
        onChange={(event) => event.target.files && void handleFiles(event.target.files)}
      />
      {loading && <div className="mt-3 text-sm font-semibold text-ember" role="status">Lecture EXIF en cours</div>}
    </div>
  );
}
