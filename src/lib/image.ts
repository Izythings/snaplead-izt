const MAX_BINARY_BYTES_FOR_VISION = 3_500_000;
const MAX_IMAGE_SIDE = 1800;

const loadImage = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image illisible"));
    };
    image.src = url;
  });

const canvasToBlob = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Compression image impossible"));
      },
      "image/jpeg",
      quality,
    );
  });

export const prepareImageForVision = async (file: File) => {
  if (file.size <= MAX_BINARY_BYTES_FOR_VISION && file.type === "image/jpeg") return file;

  const image = await loadImage(file);
  const ratio = Math.min(1, MAX_IMAGE_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * ratio));
  const height = Math.max(1, Math.round(image.naturalHeight * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas non disponible");
  context.drawImage(image, 0, 0, width, height);

  for (const quality of [0.82, 0.72, 0.62, 0.52]) {
    const blob = await canvasToBlob(canvas, quality);
    if (blob.size <= MAX_BINARY_BYTES_FOR_VISION || quality === 0.52) {
      const baseName = file.name.replace(/\.[^.]+$/, "");
      return new File([blob], `${baseName || "capture"}-scovio.jpg`, { type: "image/jpeg" });
    }
  }

  return file;
};
