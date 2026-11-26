interface PackImageItem {
  name?: string;
  url: string;
  key?: string;
}

export interface PackExamImagesOptions {
  questionImages: PackImageItem[];
  answerImages: PackImageItem[];
  promptText?: string;
  zipFilename?: string;
}

/**
 * Helper to fetch a Blob from an Image URL (Data URL, Object URL, or remote URL)
 */
async function resolveImageBlob(url: string): Promise<Blob | null> {
  try {
    if (url.startsWith('data:')) {
      const parts = url.split(',');
      const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new Blob([u8arr], { type: mime });
    }
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.blob();
  } catch (err) {
    console.warn('解析圖片 Blob 失敗:', url, err);
    return null;
  }
}

/**
 * Helper to trigger browser file download from Blob
 */
export function triggerFileDownload(blob: Blob, filename: string): void {
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
}

/**
 * Packages multiple question and answer images into a single ZIP archive,
 * including a structured folder layout and an optional prompt text file for external AI.
 */
export async function packageImagesToZip(
  options: PackExamImagesOptions,
  onProgress?: (current: number, total: number, message: string) => void
): Promise<Blob> {
  const { questionImages, answerImages, promptText } = options;
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();

  const total = questionImages.length + answerImages.length + (promptText ? 1 : 0);
  let processed = 0;

  // 1. Add README / Prompt file if provided
  if (promptText && promptText.trim()) {
    onProgress?.(processed, total, '正在加入外部 AI 辨識提詞說明檔...');
    zip.file('外部AI提詞說明.txt', promptText);
    processed++;
  }

  // 2. Add Question Images folder
  if (questionImages.length > 0) {
    const qFolder = zip.folder('題目圖片');
    for (let idx = 0; idx < questionImages.length; idx++) {
      const item = questionImages[idx];
      const seq = String(idx + 1).padStart(2, '0');
      onProgress?.(processed, total, `正在打包第 ${idx + 1}/${questionImages.length} 張題目圖片...`);
      const blob = await resolveImageBlob(item.url);
      if (blob && qFolder) {
        const ext = blob.type === 'image/png' ? 'png' : 'jpg';
        const filename = `${seq}_題目_${item.name ? item.name.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5.-]/g, '_') : 'image'}.${ext}`;
        qFolder.file(filename, blob);
      }
      processed++;
    }
  }

  // 3. Add Answer Images folder
  if (answerImages.length > 0) {
    const aFolder = zip.folder('解析圖片');
    for (let idx = 0; idx < answerImages.length; idx++) {
      const item = answerImages[idx];
      const seq = String(idx + 1).padStart(2, '0');
      onProgress?.(processed, total, `正在打包第 ${idx + 1}/${answerImages.length} 張解析圖片...`);
      const blob = await resolveImageBlob(item.url);
      if (blob && aFolder) {
        const ext = blob.type === 'image/png' ? 'png' : 'jpg';
        const filename = `${seq}_解析_${item.name ? item.name.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5.-]/g, '_') : 'image'}.${ext}`;
        aFolder.file(filename, blob);
      }
      processed++;
    }
  }

  onProgress?.(total, total, '正在壓縮打包全部圖片...');
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  return zipBlob;
}
