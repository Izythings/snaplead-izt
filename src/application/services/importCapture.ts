import type { CaptureUploadInput, DataGateway } from "../ports/dataGateway";

export type ImportCaptureResult =
  | { ok: true }
  | { ok: false; stage: "upload" | "create" | "process"; message: string };

export const importCapture = async (gateway: Pick<DataGateway, "uploadCapturePhoto" | "processCapture">, photo: CaptureUploadInput): Promise<ImportCaptureResult> => {
  let captureId = "";
  try {
    const created = await gateway.uploadCapturePhoto(photo);
    captureId = created.id;
  } catch (error) {
    const stage = error instanceof CaptureUploadError ? error.stage : "upload";
    return { ok: false, stage, message: error instanceof Error ? error.message : String(error) };
  }

  try {
    await gateway.processCapture(captureId);
    return { ok: true };
  } catch (error) {
    return { ok: false, stage: "process", message: error instanceof Error ? error.message : String(error) };
  }
};

export class CaptureUploadError extends Error {
  constructor(
    public readonly stage: "upload" | "create",
    message: string,
  ) {
    super(message);
    this.name = "CaptureUploadError";
  }
}
