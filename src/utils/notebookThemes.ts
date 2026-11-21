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
    id: 'green',
    name: '經典森林綠',
    primary: '#0B402B',
    secondary: '#145B38',
    accent: '#C89A50',
    foilColor: '#F3E5C8',
    textLight: '#FBF8F1',
    spineShadow: 'rgba(11, 64, 43, 0.88)',
    coverTexture: `
      linear-gradient(135deg, rgba(255, 248, 232, 0.08) 0%, transparent 58%),
      linear-gradient(90deg, #072C1D 0%, #0B402B 13%, #145B38 50%, #0E4A2E 86%, #072C1D 100%)
    `
  },
  {
    id: 'brown',
    name: '復古牛皮棕',
    primary: '#5A3214',
    secondary: '#784620',
    accent: '#E4C284',
    foilColor: '#FAF0DA',
    textLight: '#FBF8F1',
    spineShadow: 'rgba(40, 22, 10, 0.85)',
    coverTexture: `
      linear-gradient(135deg, rgba(255, 248, 232, 0.08) 0%, transparent 60%),
      linear-gradient(90deg, #321908 0%, #5A3214 14%, #784620 50%, #5A3214 86%, #321908 100%)
    `
  },
  {
    id: 'orange',
    name: '暖陽琥珀橘',
    primary: '#B45309',
    secondary: '#D97706',
    accent: '#FDE68A',
    foilColor: '#FFF4D6',
    textLight: '#FFFBF2',
    spineShadow: 'rgba(67, 20, 7, 0.85)',
    coverTexture: `
      linear-gradient(135deg, rgba(255, 248, 232, 0.09) 0%, transparent 60%),
      linear-gradient(90deg, #6B2A06 0%, #B45309 14%, #D97706 50%, #B45309 86%, #6B2A06 100%)
    `
  },
  {
    id: 'red',
    name: '經典酒紅棕',
    primary: '#7F1D1D',
    secondary: '#991B1B',
    accent: '#E8C49A',
    foilColor: '#FDE8D8',
    textLight: '#FEF2F2',
    spineShadow: 'rgba(69, 10, 10, 0.85)',
    coverTexture: `
      linear-gradient(135deg, rgba(255, 248, 232, 0.08) 0%, transparent 60%),
      linear-gradient(90deg, #450A0A 0%, #7F1D1D 14%, #991B1B 50%, #7F1D1D 86%, #450A0A 100%)
    `
  },
  {
    id: 'blue',
    name: '藏青學院藍',
    primary: '#1E3A5F',
    secondary: '#264B7A',
    accent: '#D9C39E',
    foilColor: '#EBF2FA',
    textLight: '#F4F7FB',
    spineShadow: 'rgba(15, 23, 42, 0.85)',
    coverTexture: `
      linear-gradient(135deg, rgba(255, 255, 255, 0.07) 0%, transparent 60%),
      linear-gradient(90deg, #0F1E33 0%, #1E3A5F 14%, #264B7A 50%, #1E3A5F 86%, #0F1E33 100%)
    `
  },
  {
    id: 'pink',
    name: '乾燥玫瑰粉',
    primary: '#831843',
    secondary: '#9D174D',
    accent: '#F5D0C5',
    foilColor: '#FCE7F3',
    textLight: '#FDF2F8',
    spineShadow: 'rgba(76, 5, 25, 0.85)',
    coverTexture: `
      linear-gradient(135deg, rgba(255, 248, 232, 0.08) 0%, transparent 60%),
      linear-gradient(90deg, #4C0519 0%, #831843 14%, #9D174D 50%, #831843 86%, #4C0519 100%)
    `
  },
  {
    id: 'purple',
    name: '紫檀原木褐',
    primary: '#4C1D4F',
    secondary: '#6B2B6E',
    accent: '#E2C8A5',
    foilColor: '#F3E8F5',
    textLight: '#FAF5FF',
    spineShadow: 'rgba(38, 12, 42, 0.85)',
    coverTexture: `
      linear-gradient(135deg, rgba(255, 248, 232, 0.07) 0%, transparent 60%),
      linear-gradient(90deg, #2A0E2D 0%, #4C1D4F 14%, #6B2B6E 50%, #4C1D4F 86%, #2A0E2D 100%)
    `
  },
  {
    id: 'black',
    name: '石墨炭灰黑',
    primary: '#29251F',
    secondary: '#3A342C',
    accent: '#C89A50',
    foilColor: '#F2E7D3',
    textLight: '#FAF7F0',
    spineShadow: 'rgba(20, 18, 15, 0.92)',
    coverTexture: `
      linear-gradient(135deg, rgba(255, 248, 232, 0.06) 0%, transparent 60%),
      linear-gradient(90deg, #171410 0%, #29251F 14%, #3A342C 50%, #29251F 86%, #171410 100%)
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
  let paletteId = 'green';
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
