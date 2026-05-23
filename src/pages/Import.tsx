import { useState } from "react";
import PhotoDropzone, { type PhotoItem } from "../components/PhotoDropzone";
import { useToast } from "../components/StatusToast";
import { LOCAL_USER_ID } from "../lib/constants";
import { supabase } from "../lib/supabase";

export default function Import() {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [running, setRunning] = useState(false);
  const toast = useToast();

  const uploadAll = async () => {
    setRunning(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id ?? LOCAL_USER_ID;
    let successCount = 0;
    let failCount = 0;

    for (const photo of photos) {
      setPhotos((items) => items.map((item) => (item.id === photo.id ? { ...item, status: "uploading" } : item)));
      const ext = photo.file.name.split(".").pop() || "jpg";
      const path = `${userId}/${Date.now()}-${photo.id}.${ext}`;
      const upload = await supabase.storage.from("captures").upload(path, photo.file, { upsert: false });
      if (upload.error) {
        failCount += 1;
        setPhotos((items) => items.map((item) => (item.id === photo.id ? { ...item, status: "failed", error: upload.error.message } : item)));
        toast.error(`Upload échoué pour ${photo.file.name}`, upload.error.message);
        continue;
      }

      const created = await supabase
        .from("captures")
        .insert({
          photo_path: path,
          exif_lat: photo.exif.lat,
          exif_lng: photo.exif.lng,
          exif_taken_at: photo.exif.takenAt,
          exif_city: photo.exif.city,
          exif_departement: photo.exif.departement,
          exif_address: photo.exif.address,
          status: "pending",
          user_id: userId,
        })
        .select("id")
        .single();

      if (created.error) {
        failCount += 1;
        setPhotos((items) => items.map((item) => (item.id === photo.id ? { ...item, status: "failed", error: created.error.message } : item)));
        toast.error(`Création capture échouée pour ${photo.file.name}`, created.error.message);
        continue;
      }

      const processed = await supabase.functions.invoke("process-capture", { body: { capture_id: created.data.id } });
      if (processed.error) {
        failCount += 1;
        setPhotos((items) => items.map((item) => (item.id === photo.id ? { ...item, status: "failed", error: processed.error.message } : item)));
        toast.error(`Traitement échoué pour ${photo.file.name}`, processed.error.message);
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
    <div className="pb-20">
      <header className="mb-6">
        <div className="text-sm font-medium text-brick">Import terrain</div>
        <h1 className="text-3xl font-semibold">Photos du jour</h1>
      </header>
      <PhotoDropzone onPhotos={(items) => setPhotos((current) => [...items, ...current])} />
      {photos.length > 0 && (
        <>
          <div className="mt-5 flex justify-end">
            <button disabled={running} onClick={uploadAll} className="rounded bg-brick px-4 py-2 font-medium text-white disabled:opacity-50">
              Lancer le traitement
            </button>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {photos.map((photo) => (
              <article key={photo.id} className="surface overflow-hidden rounded">
                <img src={photo.preview} alt="" className="h-44 w-full object-cover" />
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
                  {photo.error && <p className="mt-2 text-sm text-red-700">{photo.error}</p>}
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
