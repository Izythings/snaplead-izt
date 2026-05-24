import { UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { parseExifAndLocation, type ExifResult } from "../lib/exif";
import { prepareImageForVision } from "../lib/image";

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
      className="flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed bg-white p-8 text-center"
      style={{ borderColor: "var(--c-line)" }}
      onClick={() => inputRef.current?.click()}
    >
      <UploadCloud className="mb-3 text-brick" size={34} />
      <div className="font-semibold">Déposer les photos terrain</div>
      <p className="mt-1 max-w-md text-sm text-muted">Multi-photo, EXIF GPS et date extraits avant compression et upload.</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => event.target.files && void handleFiles(event.target.files)}
      />
      {loading && <div className="mt-3 text-sm text-brick">Lecture EXIF en cours</div>}
    </div>
  );
}
