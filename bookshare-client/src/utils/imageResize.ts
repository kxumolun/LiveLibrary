/** Rasmni 3:4 nisbatga center-crop qiladi va max 600px eniga resize qiladi */
export async function resizeCoverImage(file: File): Promise<File> {
  const aspectRatio = 3 / 4;
  const maxWidth = 600;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let srcW = img.width;
      let srcH = img.height;
      let srcX = 0;
      let srcY = 0;

      const srcAspect = srcW / srcH;
      if (srcAspect > aspectRatio) {
        srcW = srcH * aspectRatio;
        srcX = (img.width - srcW) / 2;
      } else {
        srcH = srcW / aspectRatio;
        srcY = (img.height - srcH) / 2;
      }

      const outW = Math.min(srcW, maxWidth);
      const outH = outW / aspectRatio;

      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }

      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outW, outH);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Blob failed"));
            return;
          }
          const name = file.name.replace(/\.[^.]+$/, "") || "cover";
          resolve(new File([blob], `${name}.jpg`, { type: "image/jpeg" }));
        },
        "image/jpeg",
        0.88
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Rasm yuklanmadi"));
    };

    img.src = url;
  });
}
