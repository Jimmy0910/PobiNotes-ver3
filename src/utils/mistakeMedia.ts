import type { MistakeRecord } from '../types';

export function resolveImgUrl(key?: string): string {
  if (!key || typeof key !== 'string') return '';
  const trimmed = key.trim();
  if (!trimmed) return '';
  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/')
  ) {
    return trimmed;
  }
  return `/api/images/${trimmed}`;
}

export function isLikelyImageValue(val: unknown): boolean {
  if (typeof val !== 'string' || !val.trim()) return false;
  const s = val.trim();
  return (
    s.startsWith('data:image/') ||
    s.startsWith('blob:') ||
    s.startsWith('http://') ||
    s.startsWith('https://') ||
    s.startsWith('/api/images/') ||
    s.startsWith('/demo/') ||
    /\.(png|jpe?g|webp|gif|svg|bmp|heic)$/i.test(s) ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(s)
  );
}

function pushImageValue(val: unknown, out: string[]) {
  if (typeof val === 'string' && val.trim()) {
    out.push(val.trim());
  } else if (Array.isArray(val)) {
    val.forEach(item => {
      if (typeof item === 'string' && item.trim()) {
        out.push(item.trim());
      }
    });
  }
}

export function extractMistakeMediaAndText(m: MistakeRecord): {
  qDesc: string;
  qImages: string[];
  aDesc: string;
  aImages: string[];
} {
  const qData: Record<string, any> = m.data?.questionData || {};
  const aData: Record<string, any> = m.data?.answerData || {};

  // 1. Question Text
  const qTextParts: string[] = [];
  const primaryQText = qData.q_desc || qData.desc || qData.q_text || qData.text || '';
  if (typeof primaryQText === 'string' && primaryQText.trim() && !isLikelyImageValue(primaryQText)) {
    qTextParts.push(primaryQText.trim());
  }
  if (m.template_fields?.questionFields) {
    for (const f of m.template_fields.questionFields) {
      if (f.type === 'text' || f.type === 'textarea') {
        const val = qData[f.id];
        if (typeof val === 'string' && val.trim() && !isLikelyImageValue(val) && !qTextParts.includes(val.trim())) {
          qTextParts.push(val.trim());
        }
      }
    }
  }
  if (qTextParts.length === 0) {
    for (const [k, v] of Object.entries(qData)) {
      if (
        typeof v === 'string' &&
        v.trim() &&
        !isLikelyImageValue(v) &&
        !k.toLowerCase().includes('img') &&
        !k.toLowerCase().includes('image') &&
        !k.toLowerCase().includes('photo')
      ) {
        qTextParts.push(v.trim());
      }
    }
  }

  // 2. Question Images
  const rawQImages: string[] = [];
  if (Array.isArray(qData.q_images)) pushImageValue(qData.q_images, rawQImages);
  for (const key of ['q_image', 'q_img', 'image', 'image_url', 'q_photo']) {
    pushImageValue(qData[key], rawQImages);
  }
  if (m.template_fields?.questionFields) {
    for (const f of m.template_fields.questionFields) {
      if (f.type === 'image') {
        pushImageValue(qData[f.id], rawQImages);
      }
    }
  }
  for (const [k, v] of Object.entries(qData)) {
    const kl = k.toLowerCase();
    if (kl.includes('img') || kl.includes('image') || kl.includes('photo') || isLikelyImageValue(v)) {
      pushImageValue(v, rawQImages);
    } else if (Array.isArray(v) && v.some(isLikelyImageValue)) {
      pushImageValue(v, rawQImages);
    }
  }
  const qImages = Array.from(new Set(rawQImages.map(resolveImgUrl).filter(Boolean)));

  // 3. Answer Text
  const aTextParts: string[] = [];
  const hasExplicitADesc = Object.prototype.hasOwnProperty.call(aData, 'a_desc');
  const primaryAText = hasExplicitADesc
    ? (aData.a_desc ?? '')
    : (aData.desc || aData.a_text || aData.text || aData.key_concept || aData.a_ans || '');
  if (typeof primaryAText === 'string' && primaryAText.trim() && !isLikelyImageValue(primaryAText)) {
    aTextParts.push(primaryAText.trim());
  }
  if (m.template_fields?.answerFields) {
    for (const f of m.template_fields.answerFields) {
      const isTimer = f.id === 'a_timer' || String(f.label || '').includes('計時');
      if (!isTimer && (f.type === 'text' || f.type === 'textarea')) {
        const val = aData[f.id];
        if (typeof val === 'string' && val.trim() && !isLikelyImageValue(val) && !aTextParts.includes(val.trim())) {
          aTextParts.push(val.trim());
        }
      }
    }
  }
  if (aTextParts.length === 0 && !hasExplicitADesc) {
    for (const [k, v] of Object.entries(aData)) {
      const kl = k.toLowerCase();
      if (
        typeof v === 'string' &&
        v.trim() &&
        !isLikelyImageValue(v) &&
        kl !== 'a_timer' &&
        !kl.includes('img') &&
        !kl.includes('image') &&
        !kl.includes('photo')
      ) {
        aTextParts.push(v.trim());
      }
    }
  }

  // 4. Answer Images
  const rawAImages: string[] = [];
  if (Array.isArray(aData.a_images)) pushImageValue(aData.a_images, rawAImages);
  for (const key of ['a_image', 'a_img', 'image', 'image_url', 'a_photo']) {
    pushImageValue(aData[key], rawAImages);
  }
  if (m.template_fields?.answerFields) {
    for (const f of m.template_fields.answerFields) {
      if (f.type === 'image') {
        pushImageValue(aData[f.id], rawAImages);
      }
    }
  }
  for (const [k, v] of Object.entries(aData)) {
    const kl = k.toLowerCase();
    if (kl.includes('img') || kl.includes('image') || kl.includes('photo') || isLikelyImageValue(v)) {
      pushImageValue(v, rawAImages);
    } else if (Array.isArray(v) && v.some(isLikelyImageValue)) {
      pushImageValue(v, rawAImages);
    }
  }
  const aImages = Array.from(new Set(rawAImages.map(resolveImgUrl).filter(Boolean)));

  return {
    qDesc: qTextParts.join('\n\n'),
    qImages,
    aDesc: aTextParts.join('\n\n'),
    aImages
  };
}
