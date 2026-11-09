const JPEG_TYPE = "image/jpeg";

export async function compressImageIfNeeded(file: File, maxBytes: number): Promise<File> {
  if (file.size <= maxBytes) return file;

  const image = await loadImage(file);
  const canvas = document.createElement("canvas");
  let width = image.naturalWidth;
  let height = image.naturalHeight;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image compression is not supported in this browser.");
    context.drawImage(image, 0, 0, width, height);

    for (const quality of [0.85, 0.7, 0.55, 0.4]) {
      const blob = await canvasToBlob(canvas, JPEG_TYPE, quality);
      if (blob.size <= maxBytes) {
        return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, {
          type: JPEG_TYPE,
          lastModified: Date.now(),
        });
      }
    }

    width = Math.max(1, Math.round(width * 0.85));
    height = Math.max(1, Math.round(height * 0.85));
  }

  throw new Error("The image is still larger than 7 MB after compression. Please choose a smaller image.");
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("The selected file is not a valid image."));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Image compression failed."));
    }, type, quality);
  });
}
