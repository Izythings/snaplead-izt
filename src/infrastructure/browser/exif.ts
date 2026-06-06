import exifr from "exifr/dist/lite.esm.mjs";

export type ExifResult = {
  lat: number | null;
  lng: number | null;
  takenAt: string | null;
  city: string | null;
  departement: string | null;
  address: string | null;
};

export const parseExifAndLocation = async (file: File): Promise<ExifResult> => {
  const gps = await exifr.gps(file).catch(() => null);
  const parsed = await exifr
    .parse(file, { exif: { pick: ["DateTimeOriginal", "CreateDate"] } })
    .catch(() => null);
  const lat = gps?.latitude ?? null;
  const lng = gps?.longitude ?? null;
  const rawDate = parsed?.DateTimeOriginal ?? parsed?.CreateDate ?? null;
  const takenAt = rawDate instanceof Date ? rawDate.toISOString() : null;

  if (lat === null || lng === null) {
    return { lat, lng, takenAt, city: null, departement: null, address: null };
  }

  const reverse = await fetch(`https://api-adresse.data.gouv.fr/reverse/?lon=${lng}&lat=${lat}`)
    .then((response) => (response.ok ? response.json() : null))
    .catch(() => null);

  const feature = reverse?.features?.[0];
  const props = feature?.properties ?? {};

  return {
    lat,
    lng,
    takenAt,
    city: props.city ?? props.name ?? null,
    departement: props.context?.match(/\b(\d{2,3})\b/)?.[1] ?? null,
    address: props.label ?? null,
  };
};
