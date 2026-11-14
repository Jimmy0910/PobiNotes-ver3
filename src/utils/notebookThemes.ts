import {
  BookOpen,
  Atom,
  Calculator,
  Languages,
  History,
  Brain,
  Compass,
  Target,
  Sparkles,
  Award,
  type LucideIcon
} from 'lucide-react';

export interface NotebookThemeConfig {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  foilColor: string;
  textLight: string;
  spineShadow: string;
  coverTexture: string;
}

export const NOTEBOOK_COLOR_PALETTES: NotebookThemeConfig[] = [
  {
    id: 'blue',
    name: '藏青深藍',
    primary: '#1E3A8A',
    secondary: '#1D4ED8',
    accent: '#BFDBFE',
    foilColor: '#DBEAFE',
    textLight: '#EFF6FF',
    spineShadow: 'rgba(15, 23, 42, 0.85)',
    coverTexture: `
      linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, transparent 60%),
      linear-gradient(90deg, #0F172A 0%, #1E3A8A 14%, #1D4ED8 50%, #1E3A8A 86%, #0F172A 100%)
    `
  },
  {
    id: 'green',
    name: '翡翠墨綠',
    primary: '#14532D',
    secondary: '#166534',
    accent: '#BBF7D0',
    foilColor: '#DCFCE7',
    textLight: '#F0FDF4',
    spineShadow: 'rgba(5, 46, 22, 0.85)',
    coverTexture: `
      linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, transparent 60%),
      linear-gradient(90deg, #052E16 0%, #14532D 14%, #166534 50%, #14532D 86%, #052E16 100%)
    `
  },
  {
    id: 'red',
    name: '經典緋紅',
    primary: '#991B1B',
    secondary: '#B91C1C',
    accent: '#FECACA',
    foilColor: '#FEE2E2',
    textLight: '#FEF2F2',
    spineShadow: 'rgba(69, 10, 10, 0.85)',
    coverTexture: `
      linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, transparent 60%),
      linear-gradient(90deg, #450A0A 0%, #991B1B 14%, #B91C1C 50%, #991B1B 86%, #450A0A 100%)
    `
  },
  {
    id: 'orange',
    name: '暖陽蜜橘',
    primary: '#C2410C',
    secondary: '#EA580C',
    accent: '#FED7AA',
    foilColor: '#FFEDD5',
    textLight: '#FFF7ED',
    spineShadow: 'rgba(67, 20, 7, 0.85)',
    coverTexture: `
      linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, transparent 60%),
      linear-gradient(90deg, #431407 0%, #C2410C 14%, #EA580C 50%, #C2410C 86%, #431407 100%)
    `
  },
  {
    id: 'pink',
    name: '櫻花柔粉',
    primary: '#9D174D',
    secondary: '#BE185D',
    accent: '#FBCFE8',
    foilColor: '#FCE7F3',
    textLight: '#FDF2F8',
    spineShadow: 'rgba(76, 5, 25, 0.85)',
    coverTexture: `
      linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, transparent 60%),
      linear-gradient(90deg, #4C0519 0%, #9D174D 14%, #BE185D 50%, #9D174D 86%, #4C0519 100%)
    `
  },
  {
    id: 'brown',
    name: '復古牛皮棕',
    primary: '#5A3214',
    secondary: '#784620',
    accent: '#FEF3C7',
    foilColor: '#FFFBEB',
    textLight: '#FDFBF7',
    spineShadow: 'rgba(40, 22, 10, 0.85)',
    coverTexture: `
      linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, transparent 60%),
      linear-gradient(90deg, #321908 0%, #5A3214 14%, #784620 50%, #5A3214 86%, #321908 100%)
    `
  },
  {
    id: 'purple',
    name: '紫檀原木褐',
    primary: '#4C1D95',
    secondary: '#6D28D9',
    accent: '#DDD6FE',
    foilColor: '#EDE9FE',
    textLight: '#F5F3FF',
    spineShadow: 'rgba(30, 10, 60, 0.85)',
    coverTexture: `
      linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, transparent 60%),
      linear-gradient(90deg, #2E1065 0%, #4C1D95 14%, #6D28D9 50%, #4C1D95 86%, #2E1065 100%)
    `
  },
  {
    id: 'black',
    name: '石墨曜岩黑',
    primary: '#18181B',
    secondary: '#27272A',
    accent: '#E4E4E7',
    foilColor: '#F4F4F5',
    textLight: '#FAFAFA',
    spineShadow: 'rgba(9, 9, 11, 0.95)',
    coverTexture: `
      linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, transparent 60%),
      linear-gradient(90deg, #09090B 0%, #18181B 14%, #27272A 50%, #18181B 86%, #09090B 100%)
    `
  }
];

export const NOTEBOOK_ICONS: Array<{ id: string; name: string; icon: LucideIcon }> = [
  { id: 'BookOpen', name: '標準書本', icon: BookOpen },
  { id: 'Atom', name: '自然科學', icon: Atom },
  { id: 'Calculator', name: '數學計算', icon: Calculator },
  { id: 'Languages', name: '語言文學', icon: Languages },
  { id: 'History', name: '歷史社會', icon: History },
  { id: 'Brain', name: '邏輯思維', icon: Brain },
  { id: 'Compass', name: '綜合探索', icon: Compass },
  { id: 'Target', name: '大考衝刺', icon: Target },
  { id: 'Sparkles', name: '核心重點', icon: Sparkles },
  { id: 'Award', name: '進階挑戰', icon: Award }
];

export interface ParsedNotebookStyle {
  paletteId: string;
  iconId: string;
}

// 顏色別名相容映射
const PALETTE_ALIAS_MAP: Record<string, string> = {
  navy: 'blue',
  emerald: 'green',
  ruby: 'red',
  amber: 'orange',
  rose: 'pink',
  leather: 'brown',
  slate: 'black',
  teal: 'green',
  indigo: 'blue'
};

export function parseNotebookStyle(rawColor?: string | null, name?: string): ParsedNotebookStyle {
  let paletteId = 'blue';
  let iconId = 'BookOpen';

  if (rawColor) {
    if (rawColor.includes('icon:')) {
      const match = rawColor.match(/icon:([a-zA-Z0-9]+)/);
      if (match && match[1]) {
        iconId = match[1];
      }
    }
    if (rawColor.includes('color:')) {
      const match = rawColor.match(/color:([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        const rawPalette = match[1];
        paletteId = PALETTE_ALIAS_MAP[rawPalette] || rawPalette;
      }
    } else {
      const clean = rawColor.replace(/^#/, '').toLowerCase();
      const mapped = PALETTE_ALIAS_MAP[clean] || clean;
      const foundPalette = NOTEBOOK_COLOR_PALETTES.find(
        p => p.id === mapped || p.primary.toLowerCase() === rawColor.toLowerCase()
      );
      if (foundPalette) {
        paletteId = foundPalette.id;
      }
    }
  }

  // 根據科目名稱智慧推薦預設色彩與圖示
  if (iconId === 'BookOpen' && name) {
    const n = name.toLowerCase();
    if (n.includes('數') || n.includes('微積分') || n.includes('幾何') || n.includes('代數')) {
      iconId = 'Calculator';
      if (!rawColor || rawColor === 'default') paletteId = 'orange';
    } else if (n.includes('自') || n.includes('物') || n.includes('化') || n.includes('生') || n.includes('地科')) {
      iconId = 'Atom';
      if (!rawColor || rawColor === 'default') paletteId = 'green';
    } else if (n.includes('英') || n.includes('國') || n.includes('文') || n.includes('日') || n.includes('語')) {
      iconId = 'Languages';
      if (!rawColor || rawColor === 'default') paletteId = 'blue';
    } else if (n.includes('歷') || n.includes('史') || n.includes('社') || n.includes('公') || n.includes('地')) {
      iconId = 'History';
      if (!rawColor || rawColor === 'default') paletteId = 'red';
    } else if (n.includes('考') || n.includes('衝刺') || n.includes('模考')) {
      iconId = 'Target';
      if (!rawColor || rawColor === 'default') paletteId = 'purple';
    }
  }

  return { paletteId, iconId };
}

export function serializeNotebookStyle(paletteId: string, iconId: string): string {
  return `color:${paletteId};icon:${iconId}`;
}

export function getNotebookPalette(paletteId: string): NotebookThemeConfig {
  const normalized = PALETTE_ALIAS_MAP[paletteId] || paletteId;
  return NOTEBOOK_COLOR_PALETTES.find(p => p.id === normalized) || NOTEBOOK_COLOR_PALETTES[0];
}

export function getNotebookIcon(iconId: string): LucideIcon {
  const found = NOTEBOOK_ICONS.find(i => i.id === iconId);
  return found ? found.icon : BookOpen;
}
