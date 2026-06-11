import { useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, UploadCloud } from "lucide-react";
import PhotoDropzone, { type PhotoItem } from "../components/PhotoDropzone";
import { useToast } from "../components/StatusToast";
import { importCapture } from "../application/services/importCapture";
import { createColdEmailSettingsActions } from "../application/services/coldEmailSettings";
import { DEFAULT_J0_CSV_TEMPLATE, EMPTY_SALES_IDENTITY } from "../domain/email/settings";
import { buildImportedLeads, readCsvFile, type ColdEmailImportSettings, type CsvRow } from "../infrastructure/browser/leadImport";
import { supabaseDataGateway } from "../infrastructure/supabase/repository";

const coldEmailActions = createColdEmailSettingsActions(supabaseDataGateway);

export default function Import() {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [running, setRunning] = useState(false);
  const [companyFile, setCompanyFile] = useState<File | null>(null);
  const [contactFile, setContactFile] = useState<File | null>(null);
  const [companyRows, setCompanyRows] = useState<CsvRow[]>([]);
  const [contactRows, setContactRows] = useState<CsvRow[]>([]);
  const [importingLeads, setImportingLeads] = useState(false);
  const [coldEmailSettings, setColdEmailSettings] = useState<ColdEmailImportSettings>({
    identity: EMPTY_SALES_IDENTITY,
    template: DEFAULT_J0_CSV_TEMPLATE,
  });
  const toast = useToast();
  const leadPreview = useMemo(
    () => buildImportedLeads(companyRows, contactRows, coldEmailSettings),
    [companyRows, contactRows, coldEmailSettings],
  );

  useEffect(() => {
    if (import.meta.env.VITE_E2E_AUTH === "true") return;
    void coldEmailActions.load()
      .then(setColdEmailSettings)
      .catch((error) => toast.error("Chargement du template cold email échoué", error));
  }, []);

  const selectCsv = async (file: File | undefined, kind: "companies" | "contacts") => {
    if (!file) return;
    try {
      const rows = await readCsvFile(file);
      if (kind === "companies") {
        setCompanyFile(file);
        setCompanyRows(rows);
      } else {
        setContactFile(file);
        setContactRows(rows);
      }
    } catch (error) {
      toast.error("Lecture CSV impossible", error instanceof Error ? error.message : String(error));
    }
  };

  const importCsvLeads = async () => {
    if (leadPreview.length === 0) return;
    setImportingLeads(true);
    try {
      const latestSettings = await coldEmailActions.load();
      setColdEmailSettings(latestSettings);
      const leads = buildImportedLeads(companyRows, contactRows, latestSettings);
      const result = await supabaseDataGateway.importLeads(leads);
      toast.success(`${result.imported} lead(s) importé(s). Les doublons ont été mis à jour.`);
      setCompanyFile(null);
      setContactFile(null);
      setCompanyRows([]);
      setContactRows([]);
    } catch (error) {
      toast.error("Import des leads échoué", error instanceof Error ? error.message : String(error));
    } finally {
      setImportingLeads(false);
    }
  };

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
        <div className="snap-label text-ember">Import</div>
        <h1 className="mt-2 text-xl md:text-[30px]">Captures et fichiers de leads</h1>
        <p className="snap-copy mt-2 text-sm md:text-base">Importez des photos terrain ou une liste CSV prête pour la prospection.</p>
      </header>

      <section className="snap-panel mb-8 p-4 md:p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-ember/10 text-ember"><FileSpreadsheet size={20} /></span>
          <div>
            <h2 className="font-semibold">Importer des leads CSV</h2>
            <p className="mt-1 text-sm text-muted">Ajoutez le fichier entreprises puis, si disponible, le fichier contacts. Un CSV unique avec email et entreprise fonctionne aussi.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="rounded-lg border border-dashed border-border bg-muted-surface/30 p-4 transition hover:border-ember/40">
            <span className="block text-sm font-semibold">Entreprises / leads</span>
            <span className="mt-1 block truncate text-xs text-muted">{companyFile?.name ?? "Choisir un fichier .csv"}</span>
            <input type="file" accept=".csv,text/csv" className="mt-3 block w-full text-xs text-muted file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:font-semibold file:text-foreground" onChange={(event) => void selectCsv(event.target.files?.[0], "companies")} />
          </label>
          <label className="rounded-lg border border-dashed border-border bg-muted-surface/30 p-4 transition hover:border-ember/40">
            <span className="block text-sm font-semibold">Contacts (optionnel)</span>
            <span className="mt-1 block truncate text-xs text-muted">{contactFile?.name ?? "Choisir un fichier .csv"}</span>
            <input type="file" accept=".csv,text/csv" className="mt-3 block w-full text-xs text-muted file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:font-semibold file:text-foreground" onChange={(event) => void selectCsv(event.target.files?.[0], "contacts")} />
          </label>
        </div>
        {(companyRows.length > 0 || contactRows.length > 0) && (
          <div className="mt-4 flex flex-col gap-3 rounded-lg border border-border bg-secondary/40 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm">
              <span className="font-semibold">{leadPreview.length} lead(s) détecté(s)</span>
              <span className="ml-2 text-muted">{leadPreview.filter((lead) => lead.email).length} avec email, prêts pour campagne</span>
            </div>
            <button disabled={importingLeads || leadPreview.length === 0} onClick={importCsvLeads} className="snap-button disabled:opacity-50">
              <UploadCloud size={16} />{importingLeads ? "Import…" : "Importer les leads"}
            </button>
          </div>
        )}
      </section>

      <div className="mb-4">
        <div className="snap-label text-muted">Captures terrain</div>
        <h2 className="mt-1 text-lg">Importer des photos</h2>
      </div>
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
