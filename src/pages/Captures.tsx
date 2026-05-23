import CaptureCard from "../components/CaptureCard";
import { useCaptures } from "../hooks/useCaptures";

export default function Captures() {
  const { captures, loading } = useCaptures();
  return (
    <div className="pb-20">
      <header className="mb-6">
        <div className="text-sm font-medium text-brick">Traitement</div>
        <h1 className="text-3xl font-semibold">Captures</h1>
      </header>
      {loading ? (
        <div>Chargement</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {captures.map((capture) => (
            <CaptureCard key={capture.id} capture={capture} />
          ))}
        </div>
      )}
    </div>
  );
}
