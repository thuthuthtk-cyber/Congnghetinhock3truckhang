import React from 'react';

export interface AnimalAvatarItem {
  id: string;
  name: string;
  bg: string;
  svg: React.ReactNode;
}

export const ANIMAL_AVATARS: AnimalAvatarItem[] = [
  {
    id: 'rabbit',
    name: 'Thỏ bông',
    bg: 'bg-cyan-500/20',
    svg: (
      <svg className="w-full h-full" viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="55" r="38" fill="#E2E8F0" stroke="#1E293B" strokeWidth="3" />
        <ellipse cx="34" cy="22" rx="9" ry="22" fill="#E2E8F0" stroke="#1E293B" strokeWidth="3" />
        <ellipse cx="66" cy="22" rx="9" ry="22" fill="#E2E8F0" stroke="#1E293B" strokeWidth="3" />
        <ellipse cx="34" cy="22" rx="5" ry="16" fill="#F472B6" />
        <ellipse cx="66" cy="22" rx="5" ry="16" fill="#F472B6" />
        <circle cx="36" cy="52" r="5" fill="#1E293B" />
        <circle cx="64" cy="52" r="5" fill="#1E293B" />
        <circle cx="38" cy="50" r="1.5" fill="#FFFFFF" />
        <circle cx="66" cy="50" r="1.5" fill="#FFFFFF" />
        <ellipse cx="50" cy="60" rx="4" ry="3" fill="#F472B6" />
        <path d="M44 65 Q50 68 56 65" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" />
        <ellipse cx="26" cy="58" rx="4" ry="2.5" fill="#FBCFE8" />
        <ellipse cx="74" cy="58" rx="4" ry="2.5" fill="#FBCFE8" />
      </svg>
    )
  },
  {
    id: 'fox',
    name: 'Cáo cam',
    bg: 'bg-orange-500/20',
    svg: (
      <svg className="w-full h-full" viewBox="0 0 100 100" fill="none">
        <polygon points="18,18 42,42 12,38" fill="#EA580C" stroke="#1E293B" strokeWidth="3" />
        <polygon points="82,18 58,42 88,38" fill="#EA580C" stroke="#1E293B" strokeWidth="3" />
        <polygon points="22,22 38,40 16,35" fill="#FFF" />
        <polygon points="78,22 62,40 84,35" fill="#FFF" />
        <circle cx="50" cy="54" r="38" fill="#F97316" stroke="#1E293B" strokeWidth="3" />
        <path d="M16 54 Q50 90 84 54 Q65 65 50 62 Q35 65 16 54 Z" fill="#FFF" />
        <circle cx="35" cy="48" r="5" fill="#1E293B" />
        <circle cx="65" cy="48" r="5" fill="#1E293B" />
        <circle cx="37" cy="46" r="1.5" fill="#FFF" />
        <circle cx="67" cy="46" r="1.5" fill="#FFF" />
        <polygon points="50,60 44,52 56,52" fill="#1E293B" />
      </svg>
    )
  },
  {
    id: 'pig',
    name: 'Heo hồng',
    bg: 'bg-rose-500/20',
    svg: (
      <svg className="w-full h-full" viewBox="0 0 100 100" fill="none">
        <polygon points="18,22 36,36 14,40" fill="#F472B6" stroke="#1E293B" strokeWidth="3" />
        <polygon points="82,22 64,36 86,40" fill="#F472B6" stroke="#1E293B" strokeWidth="3" />
        <circle cx="50" cy="54" r="38" fill="#FB7185" stroke="#1E293B" strokeWidth="3" />
        <circle cx="36" cy="46" r="5" fill="#1E293B" />
        <circle cx="64" cy="46" r="5" fill="#1E293B" />
        <ellipse cx="50" cy="62" rx="14" ry="10" fill="#FDA4AF" stroke="#1E293B" strokeWidth="2.5" />
        <ellipse cx="44" cy="62" rx="2.5" ry="4" fill="#1E293B" />
        <ellipse cx="56" cy="62" rx="2.5" ry="4" fill="#1E293B" />
        <circle cx="26" cy="56" r="4" fill="#F43F5E" opacity="0.6" />
        <circle cx="74" cy="56" r="4" fill="#F43F5E" opacity="0.6" />
      </svg>
    )
  },
  {
    id: 'tiger',
    name: 'Hổ vàng',
    bg: 'bg-amber-500/20',
    svg: (
      <svg className="w-full h-full" viewBox="0 0 100 100" fill="none">
        <circle cx="20" cy="28" r="12" fill="#F59E0B" stroke="#1E293B" strokeWidth="3" />
        <circle cx="80" cy="28" r="12" fill="#F59E0B" stroke="#1E293B" strokeWidth="3" />
        <circle cx="20" cy="28" r="6" fill="#FDE68A" />
        <circle cx="80" cy="28" r="6" fill="#FDE68A" />
        <circle cx="50" cy="54" r="38" fill="#F59E0B" stroke="#1E293B" strokeWidth="3" />
        <path d="M50 20 L50 32 M42 22 L45 30 M58 22 L55 30" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
        <circle cx="36" cy="48" r="5" fill="#1E293B" />
        <circle cx="64" cy="48" r="5" fill="#1E293B" />
        <ellipse cx="50" cy="64" rx="14" ry="9" fill="#FFF" />
        <polygon points="50,62 44,56 56,56" fill="#1E293B" />
        <path d="M44 67 Q50 71 56 67" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    )
  },
  {
    id: 'frog',
    name: 'Ếch xanh',
    bg: 'bg-emerald-500/20',
    svg: (
      <svg className="w-full h-full" viewBox="0 0 100 100" fill="none">
        <circle cx="30" cy="30" r="14" fill="#22C55E" stroke="#1E293B" strokeWidth="3" />
        <circle cx="70" cy="30" r="14" fill="#22C55E" stroke="#1E293B" strokeWidth="3" />
        <circle cx="30" cy="30" r="8" fill="#FFF" />
        <circle cx="70" cy="30" r="8" fill="#FFF" />
        <circle cx="30" cy="30" r="4" fill="#1E293B" />
        <circle cx="70" cy="30" r="4" fill="#1E293B" />
        <ellipse cx="50" cy="58" rx="38" ry="30" fill="#22C55E" stroke="#1E293B" strokeWidth="3" />
        <ellipse cx="50" cy="64" rx="20" ry="15" fill="#86EFAC" />
        <path d="M34 62 Q50 74 66 62" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
        <circle cx="24" cy="58" r="3.5" fill="#F472B6" />
        <circle cx="76" cy="58" r="3.5" fill="#F472B6" />
      </svg>
    )
  },
  {
    id: 'koala',
    name: 'Koala xám',
    bg: 'bg-slate-500/20',
    svg: (
      <svg className="w-full h-full" viewBox="0 0 100 100" fill="none">
        <circle cx="18" cy="32" r="14" fill="#94A3B8" stroke="#1E293B" strokeWidth="3" />
        <circle cx="82" cy="32" r="14" fill="#94A3B8" stroke="#1E293B" strokeWidth="3" />
        <circle cx="18" cy="32" r="7" fill="#E2E8F0" />
        <circle cx="82" cy="32" r="7" fill="#E2E8F0" />
        <circle cx="50" cy="55" r="36" fill="#94A3B8" stroke="#1E293B" strokeWidth="3" />
        <circle cx="36" cy="48" r="4.5" fill="#1E293B" />
        <circle cx="64" cy="48" r="4.5" fill="#1E293B" />
        <ellipse cx="50" cy="58" rx="8" ry="12" fill="#1E293B" />
        <ellipse cx="48" cy="54" rx="2" ry="3" fill="#64748B" />
        <circle cx="26" cy="56" r="3" fill="#F472B6" opacity="0.6" />
        <circle cx="74" cy="56" r="3" fill="#F472B6" opacity="0.6" />
      </svg>
    )
  },
  {
    id: 'octopus',
    name: 'Bạch tuộc',
    bg: 'bg-rose-500/20',
    svg: (
      <svg className="w-full h-full" viewBox="0 0 100 100" fill="none">
        <ellipse cx="50" cy="45" rx="34" ry="30" fill="#E11D48" stroke="#1E293B" strokeWidth="3" />
        <circle cx="38" cy="42" r="6" fill="#FFF" />
        <circle cx="62" cy="42" r="6" fill="#FFF" />
        <circle cx="38" cy="42" r="3.5" fill="#1E293B" />
        <circle cx="62" cy="42" r="3.5" fill="#1E293B" />
        <ellipse cx="50" cy="56" rx="4" ry="3" fill="#1E293B" />
        <path d="M22 68 Q24 88 32 75 Q40 88 48 75 Q56 88 64 75 Q72 88 78 68" fill="#E11D48" stroke="#1E293B" strokeWidth="3" />
        <circle cx="26" cy="48" r="3" fill="#FDA4AF" />
        <circle cx="74" cy="48" r="3" fill="#FDA4AF" />
      </svg>
    )
  },
  {
    id: 'panda',
    name: 'Gấu trúc',
    bg: 'bg-slate-500/20',
    svg: (
      <svg className="w-full h-full" viewBox="0 0 100 100" fill="none">
        <circle cx="22" cy="24" r="12" fill="#1E293B" />
        <circle cx="78" cy="24" r="12" fill="#1E293B" />
        <circle cx="50" cy="54" r="38" fill="#FFFFFF" stroke="#1E293B" strokeWidth="3" />
        <ellipse cx="36" cy="46" rx="9" ry="11" fill="#1E293B" transform="rotate(-15 36 46)" />
        <ellipse cx="64" cy="46" rx="9" ry="11" fill="#1E293B" transform="rotate(15 64 46)" />
        <circle cx="36" cy="45" r="3.5" fill="#FFF" />
        <circle cx="64" cy="45" r="3.5" fill="#FFF" />
        <ellipse cx="50" cy="58" rx="6" ry="4" fill="#1E293B" />
        <path d="M44 64 Q50 67 56 64" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    )
  }
];

export function getStudentAvatarByIndex(index: number): AnimalAvatarItem {
  const safeIdx = Math.abs(index || 0);
  return ANIMAL_AVATARS[safeIdx % ANIMAL_AVATARS.length];
}

export function getStudentAvatarByName(nameOrId?: string): AnimalAvatarItem {
  if (!nameOrId) return ANIMAL_AVATARS[0];
  let sum = 0;
  for (let i = 0; i < nameOrId.length; i++) {
    sum += nameOrId.charCodeAt(i);
  }
  return ANIMAL_AVATARS[sum % ANIMAL_AVATARS.length];
}

// Clean SVG Data URIs for every animal preset in the collection
export const RABBIT_DATA_URI = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="55" r="38" fill="%23E2E8F0" stroke="%231E293B" stroke-width="3"/><ellipse cx="34" cy="22" rx="9" ry="22" fill="%23E2E8F0" stroke="%231E293B" stroke-width="3"/><ellipse cx="66" cy="22" rx="9" ry="22" fill="%23E2E8F0" stroke="%231E293B" stroke-width="3"/><ellipse cx="34" cy="22" rx="5" ry="16" fill="%23F472B6"/><ellipse cx="66" cy="22" rx="5" ry="16" fill="%23F472B6"/><circle cx="36" cy="52" r="5" fill="%231E293B"/><circle cx="64" cy="52" r="5" fill="%231E293B"/><circle cx="38" cy="50" r="1.5" fill="%23FFFFFF"/><circle cx="66" cy="50" r="1.5" fill="%23FFFFFF"/><ellipse cx="50" cy="60" rx="4" ry="3" fill="%23F472B6"/><path d="M44 65 Q50 68 56 65" stroke="%231E293B" stroke-width="2.5" stroke-linecap="round"/><ellipse cx="26" cy="58" rx="4" ry="2.5" fill="%23FBCFE8"/><ellipse cx="74" cy="58" rx="4" ry="2.5" fill="%23FBCFE8"/></svg>`;

export const FOX_DATA_URI = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="18,18 42,42 12,38" fill="%23EA580C" stroke="%231E293B" stroke-width="3"/><polygon points="82,18 58,42 88,38" fill="%23EA580C" stroke="%231E293B" stroke-width="3"/><polygon points="22,22 38,40 16,35" fill="%23FFF"/><polygon points="78,22 62,40 84,35" fill="%23FFF"/><circle cx="50" cy="54" r="38" fill="%23F97316" stroke="%231E293B" stroke-width="3"/><path d="M16 54 Q50 90 84 54 Q65 65 50 62 Q35 65 16 54 Z" fill="%23FFF"/><circle cx="35" cy="48" r="5" fill="%231E293B"/><circle cx="65" cy="48" r="5" fill="%231E293B"/><circle cx="37" cy="46" r="1.5" fill="%23FFF"/><circle cx="67" cy="46" r="1.5" fill="%23FFF"/><polygon points="50,60 44,52 56,52" fill="%231E293B"/></svg>`;

export const PIG_DATA_URI = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="18,22 36,36 14,40" fill="%23F472B6" stroke="%231E293B" stroke-width="3"/><polygon points="82,22 64,36 86,40" fill="%23F472B6" stroke="%231E293B" stroke-width="3"/><circle cx="50" cy="54" r="38" fill="%23FB7185" stroke="%231E293B" stroke-width="3"/><circle cx="36" cy="46" r="5" fill="%231E293B"/><circle cx="64" cy="46" r="5" fill="%231E293B"/><ellipse cx="50" cy="62" rx="14" ry="10" fill="%23FDA4AF" stroke="%231E293B" stroke-width="2.5"/><ellipse cx="44" cy="62" rx="2.5" ry="4" fill="%231E293B"/><ellipse cx="56" cy="62" rx="2.5" ry="4" fill="%231E293B"/><circle cx="26" cy="56" r="4" fill="%23F43F5E" opacity="0.6"/><circle cx="74" cy="56" r="4" fill="%23F43F5E" opacity="0.6"/></svg>`;

export const TIGER_DATA_URI = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="20" cy="28" r="12" fill="%23F59E0B" stroke="%231E293B" stroke-width="3"/><circle cx="80" cy="28" r="12" fill="%23F59E0B" stroke="%231E293B" stroke-width="3"/><circle cx="20" cy="28" r="6" fill="%23FDE68A"/><circle cx="80" cy="28" r="6" fill="%23FDE68A"/><circle cx="50" cy="54" r="38" fill="%23F59E0B" stroke="%231E293B" stroke-width="3"/><path d="M50 20 L50 32 M42 22 L45 30 M58 22 L55 30" stroke="%231E293B" stroke-width="3" stroke-linecap="round"/><circle cx="36" cy="48" r="5" fill="%231E293B"/><circle cx="64" cy="48" r="5" fill="%231E293B"/><ellipse cx="50" cy="64" rx="14" ry="9" fill="%23FFF"/><polygon points="50,62 44,56 56,56" fill="%231E293B"/><path d="M44 67 Q50 71 56 67" stroke="%231E293B" stroke-width="2.5" stroke-linecap="round"/></svg>`;

export const FROG_DATA_URI = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="30" cy="30" r="14" fill="%2322C55E" stroke="%231E293B" stroke-width="3"/><circle cx="70" cy="30" r="14" fill="%2322C55E" stroke="%231E293B" stroke-width="3"/><circle cx="30" cy="30" r="8" fill="%23FFF"/><circle cx="70" cy="30" r="8" fill="%23FFF"/><circle cx="30" cy="30" r="4" fill="%231E293B"/><circle cx="70" cy="30" r="4" fill="%231E293B"/><ellipse cx="50" cy="58" rx="38" ry="30" fill="%2322C55E" stroke="%231E293B" stroke-width="3"/><ellipse cx="50" cy="64" rx="20" ry="15" fill="%2386EFAC"/><path d="M34 62 Q50 74 66 62" stroke="%231E293B" stroke-width="3" stroke-linecap="round"/><circle cx="24" cy="58" r="3.5" fill="%23F472B6"/><circle cx="76" cy="58" r="3.5" fill="%23F472B6"/></svg>`;

export const KOALA_DATA_URI = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="18" cy="32" r="14" fill="%2394A3B8" stroke="%231E293B" stroke-width="3"/><circle cx="82" cy="32" r="14" fill="%2394A3B8" stroke="%231E293B" stroke-width="3"/><circle cx="18" cy="32" r="7" fill="%23E2E8F0"/><circle cx="82" cy="32" r="7" fill="%23E2E8F0"/><circle cx="50" cy="55" r="36" fill="%2394A3B8" stroke="%231E293B" stroke-width="3"/><circle cx="36" cy="48" r="4.5" fill="%231E293B"/><circle cx="64" cy="48" r="4.5" fill="%231E293B"/><ellipse cx="50" cy="58" rx="8" ry="12" fill="%231E293B"/><ellipse cx="48" cy="54" rx="2" ry="3" fill="%2364748B"/><circle cx="26" cy="56" r="3" fill="%23F472B6" opacity="0.6"/><circle cx="74" cy="56" r="3" fill="%23F472B6" opacity="0.6"/></svg>`;

export const OCTOPUS_DATA_URI = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><ellipse cx="50" cy="45" rx="34" ry="30" fill="%23E11D48" stroke="%231E293B" stroke-width="3"/><circle cx="38" cy="42" r="6" fill="%23FFF"/><circle cx="62" cy="42" r="6" fill="%23FFF"/><circle cx="38" cy="42" r="3.5" fill="%231E293B"/><circle cx="62" cy="42" r="3.5" fill="%231E293B"/><ellipse cx="50" cy="56" rx="4" ry="3" fill="%231E293B"/><path d="M22 68 Q24 88 32 75 Q40 88 48 75 Q56 88 64 75 Q72 88 78 68" fill="%23E11D48" stroke="%231E293B" stroke-width="3"/><circle cx="26" cy="48" r="3" fill="%23FDA4AF"/><circle cx="74" cy="48" r="3" fill="%23FDA4AF"/></svg>`;

export const PANDA_DATA_URI = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="22" cy="24" r="12" fill="%231E293B"/><circle cx="78" cy="24" r="12" fill="%231E293B"/><circle cx="50" cy="54" r="38" fill="%23FFFFFF" stroke="%231E293B" stroke-width="3"/><ellipse cx="36" cy="46" rx="9" ry="11" fill="%231E293B" transform="rotate(-15 36 46)"/><ellipse cx="64" cy="46" rx="9" ry="11" fill="%231E293B" transform="rotate(15 64 46)"/><circle cx="36" cy="45" r="3.5" fill="%23FFF"/><circle cx="64" cy="45" r="3.5" fill="%23FFF"/><ellipse cx="50" cy="58" rx="6" ry="4" fill="%231E293B"/><path d="M44 64 Q50 67 56 64" stroke="%231E293B" stroke-width="2.5" stroke-linecap="round"/></svg>`;

// Default animal avatar: Thỏ bông / Thỏ hồng
export const DEFAULT_ANIMAL_AVATAR = RABBIT_DATA_URI;

export function getAnimalAvatarDataUri(animalId: string): string {
  switch (animalId) {
    case 'rabbit':
      return RABBIT_DATA_URI;
    case 'fox':
      return FOX_DATA_URI;
    case 'pig':
      return PIG_DATA_URI;
    case 'tiger':
      return TIGER_DATA_URI;
    case 'frog':
      return FROG_DATA_URI;
    case 'koala':
      return KOALA_DATA_URI;
    case 'octopus':
      return OCTOPUS_DATA_URI;
    case 'panda':
      return PANDA_DATA_URI;
    default:
      return DEFAULT_ANIMAL_AVATAR;
  }
}

/**
 * Lấy source ảnh avatar học sinh:
 * - Ưu tiên 1: Hiển thị ảnh thật nếu học sinh đã tải lên (chuỗi base64 data:image, url http/https, blob, path).
 * - Ưu tiên 2: Hiển thị ảnh con thú từ bộ sưu tập (theo preset id như 'rabbit', 'fox', hoặc emoji '🐰').
 * - Fallback: Hiển thị con thú mặc định (Thỏ hồng) từ bộ sưu tập.
 * - Loại bỏ hoàn toàn hình ảnh mẫu cố định cũ (ảnh cô giáo unsplash photo-1534528741775-53994a69daeb).
 */
export function getStudentAvatarSource(studentOrAvatar?: any, fallbackNameOrId?: string): string {
  let avStr = '';
  if (typeof studentOrAvatar === 'string') {
    avStr = studentOrAvatar.trim();
  } else if (studentOrAvatar && typeof studentOrAvatar === 'object') {
    avStr = (studentOrAvatar.avatarUrl || studentOrAvatar.avatar || '').trim();
    if (!fallbackNameOrId) {
      fallbackNameOrId =
        studentOrAvatar.name ||
        studentOrAvatar.fullName ||
        studentOrAvatar.id ||
        studentOrAvatar.code;
    }
  }

  // 1. Kiểm tra nếu học sinh đã có ảnh đại diện (đường dẫn hợp lệ), hiển thị ảnh thật
  // Chặn ảnh mẫu cố định cũ (ảnh mặt cô giáo Unsplash)
  if (
    avStr &&
    !avStr.includes('photo-1534528741775-53994a69daeb') &&
    (avStr.startsWith('http://') ||
      avStr.startsWith('https://') ||
      avStr.startsWith('data:image/') ||
      avStr.startsWith('blob:') ||
      avStr.startsWith('/'))
  ) {
    return avStr;
  }

  // 2. Nếu là mã con thú trong bộ sưu tập hoặc emoji
  if (avStr) {
    const lower = avStr.toLowerCase();
    if (lower === 'rabbit' || lower === 'thỏ' || lower.includes('thỏ') || avStr === '🐰') return RABBIT_DATA_URI;
    if (lower === 'fox' || lower === 'cáo' || lower.includes('cáo') || avStr === '🦊') return FOX_DATA_URI;
    if (lower === 'pig' || lower === 'heo' || lower.includes('heo') || avStr === '🐷') return PIG_DATA_URI;
    if (lower === 'tiger' || lower === 'hổ' || lower.includes('hổ') || avStr === '🐯') return TIGER_DATA_URI;
    if (lower === 'frog' || lower === 'ếch' || lower.includes('ếch') || avStr === '🐸') return FROG_DATA_URI;
    if (lower === 'koala' || lower.includes('koala') || avStr === '🐨') return KOALA_DATA_URI;
    if (lower === 'octopus' || lower.includes('tuộc') || avStr === '🐙') return OCTOPUS_DATA_URI;
    if (lower === 'panda' || lower.includes('gấu') || avStr === '🐼') return PANDA_DATA_URI;
  }

  // 3. Nếu có tên/mã học sinh, chọn con thú linh vật nhất quán từ bộ sưu tập
  if (fallbackNameOrId) {
    const animalItem = getStudentAvatarByName(fallbackNameOrId);
    if (animalItem && animalItem.id) {
      return getAnimalAvatarDataUri(animalItem.id);
    }
  }

  // 4. Nếu không có ảnh, hiển thị một con thú mặc định (Thỏ hồng từ bộ sưu tập)
  return DEFAULT_ANIMAL_AVATAR;
}

