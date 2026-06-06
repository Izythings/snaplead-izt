import { useState } from "react";
import PhotoDropzone, { type PhotoItem } from "../components/PhotoDropzone";
import { useToast } from "../components/StatusToast";
import { importCapture } from "../application/services/importCapture";
import { supabaseDataGateway } from "../infrastructure/supabase/repository";

export default function Import() {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [running, setRunning] = useState(false);
  const toast = useToast();

  const uploadAll = async () => {
    setRunning(true);
    let successCount = 0;
    let failCount = 0;

    for (const photo of photos) {
      setPhotos((items) => items.map((item) => (item.id === photo.id ? { ...item, status: "uploading" } : item)));
      const result = await importCapture(supabaseDataGateway, photo);
      if (!result.ok) {
        failCount += 1;
        setPhotos((items) => items.map((item) => (item.id === photo.id ? { ...item, status: "failed", error: result.message } : item)));
        const title = result.stage === "create"
          ? `Création capture échouée pour ${photo.file.name}`
          : result.stage === "process"
            ? `Traitement échoué pour ${photo.file.name}`
            : `Upload échoué pour ${photo.file.name}`;
        toast.error(title, result.message);
        continue;
      }

      successCount += 1;
      setPhotos((items) => items.map((item) => (item.id === photo.id ? { ...item, status: "done" } : item)));
      toast.success(`Photo traitée: ${photo.file.name}`);
    }
    setRunning(false);
    if (successCount > 0 && failCount === 0) toast.success(`${successCount} photo(s) importée(s) et traitée(s)`);
    if (failCount > 0) toast.error(`${failCount} photo(s) en échec`, `${successCount} OK`);
  };

  return (
    <div>
      <header className="mb-6 border-b border-border pb-6">
        <div className="snap-label text-ember">Import terrain</div>
        <h1 className="mt-2 text-xl md:text-[30px]">Nouvelle capture</h1>
        <p className="snap-copy mt-2 text-sm md:text-base">Ajoutez plusieurs vitrines ou panneaux, puis lancez l'analyse en une fois.</p>
      </header>
      <PhotoDropzone onPhotos={(items) => setPhotos((current) => [...items, ...current])} />
      {photos.length > 0 && (
        <>
          <div className="mt-5 flex justify-end">
            <button disabled={running} onClick={uploadAll} className="snap-button w-full disabled:opacity-50 sm:w-auto">
              Lancer le traitement
            </button>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {photos.map((photo) => (
              <article key={photo.id} className="snap-panel overflow-hidden">
                <img src={photo.preview} alt={`Aperçu de ${photo.file.name}`} className="h-44 w-full object-cover" />
                <div className="p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="truncate font-semibold">{photo.file.name}</div>
                    <span className="text-xs text-muted">{photo.status}</span>
                  </div>
                  <div className="grid gap-1 text-sm text-muted">
                    <span>{photo.exif.address || "Adresse EXIF absente"}</span>
                    <span className="mono">{photo.exif.lat && photo.exif.lng ? `${photo.exif.lat.toFixed(5)}, ${photo.exif.lng.toFixed(5)}` : "GPS absent"}</span>
                    <span>{photo.exif.takenAt ? new Date(photo.exif.takenAt).toLocaleString("fr-FR") : "Date absente"}</span>
                  </div>
                  {photo.error && <p className="mt-2 text-sm text-destructive">{photo.error}</p>}
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
