import CaptureCard from "../components/CaptureCard";
import { useCaptures } from "../hooks/useCaptures";

export default function Captures() {
  const { captures, loading } = useCaptures();
  return (
    <div>
      <header className="mb-6 border-b border-border pb-6">
        <div className="snap-label text-ember">Traitement terrain</div>
        <h1 className="mt-2 text-xl md:text-[30px]">Captures</h1>
        <p className="snap-copy mt-2 text-sm md:text-base">Galerie des photos analysées et des leads générés.</p>
      </header>
      {loading ? (
        <div className="snap-panel p-6 text-muted" role="status">Chargement des captures</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {captures.map((capture) => (
            <CaptureCard key={capture.id} capture={capture} />
          ))}
          {captures.length === 0 && <div className="snap-panel p-8 text-center text-muted sm:col-span-2 xl:col-span-3">Aucune capture aujourd'hui.</div>}
        </div>
      )}
    </div>
  );
}
