/** Decode a File into an object URL plus its natural pixel dimensions. */
export async function fileToImageInfo(
  file: File,
): Promise<{ src: string; w: number; h: number }> {
  const src = URL.createObjectURL(file);
  try {
    const { w, h } = await naturalSize(src);
    return { src, w, h };
  } catch (e) {
    URL.revokeObjectURL(src);
    throw e;
  }
}

export function naturalSize(src: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => reject(new Error('Failed to read image dimensions'));
    img.src = src;
  });
}
