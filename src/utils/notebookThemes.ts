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
    id: 'navy',
    name: '深焙焦糖皮',
    primary: '#4A2A14',
    secondary: '#5C381E',
    accent: '#FDE68A',
    foilColor: '#FEF3C7',
    textLight: '#FAF5ED',
    spineShadow: 'rgba(35, 18, 8, 0.8)',
    coverTexture: `
      linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, transparent 60%),
      linear-gradient(90deg, #2E1508 0%, #4A2A14 12%, #5C381E 50%, #4D2D16 88%, #2E1508 100%)
    `
  },
  {
    id: 'emerald',
    name: '復古牛皮棕',
    primary: '#784620',
    secondary: '#8B5A2B',
    accent: '#FEF3C7',
    foilColor: '#FFFBEB',
    textLight: '#FDFBF7',
    spineShadow: 'rgba(40, 22, 10, 0.8)',
    coverTexture: `
      linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, transparent 60%),
      linear-gradient(90deg, #532C11 0%, #784620 12%, #8B5A2B 50%, #794821 88%, #532C11 100%)
    `
  },
  {
    id: 'amber',
    name: '暖陽琥珀金',
    primary: '#78350F',
    secondary: '#92400E',
    accent: '#FDE68A',
    foilColor: '#FEF3C7',
    textLight: '#FFFBEB',
    spineShadow: 'rgba(45, 18, 4, 0.8)',
    coverTexture: `
      linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, transparent 60%),
      linear-gradient(90deg, #451A03 0%, #78350F 12%, #92400E 50%, #7E370F 88%, #451A03 100%)
    `
  },
  {
    id: 'purple',
    name: '紫檀原木褐',
    primary: '#4A242B',
    secondary: '#5C2D35',
    accent: '#FCE7F3',
    foilColor: '#FDF2F8',
    textLight: '#FDF7F8',
    spineShadow: 'rgba(30, 10, 18, 0.8)',
    coverTexture: `
      linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, transparent 60%),
      linear-gradient(90deg, #2D1419 0%, #4A242B 12%, #5C2D35 50%, #4E252D 88%, #2D1419 100%)
    `
  },
  {
    id: 'ruby',
    name: '珊瑚磚紅皮',
    primary: '#7F1D1D',
    secondary: '#991B1B',
    accent: '#FDE047',
    foilColor: '#FEF08A',
    textLight: '#FEF2F2',
    spineShadow: 'rgba(50, 10, 10, 0.8)',
    coverTexture: `
      linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, transparent 60%),
      linear-gradient(90deg, #450A0A 0%, #7F1D1D 12%, #991B1B 50%, #851E1E 88%, #450A0A 100%)
    `
  },
  {
    id: 'slate',
    name: '石墨曜岩黑',
    primary: '#1C1917',
    secondary: '#292524',
    accent: '#E7E5E4',
    foilColor: '#F5F5F4',
    textLight: '#FAFAF9',
    spineShadow: 'rgba(10, 10, 10, 0.9)',
    coverTexture: `
      linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, transparent 60%),
      linear-gradient(90deg, #0C0A09 0%, #1C1917 12%, #292524 50%, #1F1B18 88%, #0C0A09 100%)
    `
  },
  {
    id: 'teal',
    name: '典雅胡桃木',
    primary: '#3B2F2F',
    secondary: '#4E3E3E',
    accent: '#EFEBE9',
    foilColor: '#F7F5F4',
    textLight: '#FAF8F7',
    spineShadow: 'rgba(25, 18, 18, 0.8)',
    coverTexture: `
      linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, transparent 60%),
      linear-gradient(90deg, #241C1C 0%, #3B2F2F 12%, #4E3E3E 50%, #423434 88%, #241C1C 100%)
    `
  },
  {
    id: 'indigo',
    name: '黑胡桃鞍皮',
    primary: '#3E2723',
    secondary: '#4E342E',
    accent: '#D7CCC8',
    foilColor: '#EFEBE9',
    textLight: '#FBE9E7',
    spineShadow: 'rgba(25, 15, 12, 0.8)',
    coverTexture: `
      linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, transparent 60%),
      linear-gradient(90deg, #271714 0%, #3E2723 12%, #4E342E 50%, #442B26 88%, #271714 100%)
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

export function parseNotebookStyle(rawColor?: string | null, name?: string): ParsedNotebookStyle {
  let paletteId = 'navy';
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
        paletteId = match[1];
      }
    } else {
      const clean = rawColor.replace(/^#/, '').toLowerCase();
      const foundPalette = NOTEBOOK_COLOR_PALETTES.find(
        p => p.id === clean || p.primary.toLowerCase() === rawColor.toLowerCase()
      );
      if (foundPalette) {
        paletteId = foundPalette.id;
      }
    }
  }

  if (iconId === 'BookOpen' && name) {
    const n = name.toLowerCase();
    if (n.includes('數') || n.includes('微積分') || n.includes('幾何') || n.includes('代數')) {
      iconId = 'Calculator';
      if (!rawColor || rawColor === 'default') paletteId = 'amber';
    } else if (n.includes('自') || n.includes('物') || n.includes('化') || n.includes('生') || n.includes('地科')) {
      iconId = 'Atom';
      if (!rawColor || rawColor === 'default') paletteId = 'emerald';
    } else if (n.includes('英') || n.includes('國') || n.includes('文') || n.includes('日') || n.includes('語')) {
      iconId = 'Languages';
      if (!rawColor || rawColor === 'default') paletteId = 'navy';
    } else if (n.includes('歷') || n.includes('史') || n.includes('社') || n.includes('公') || n.includes('地')) {
      iconId = 'History';
      if (!rawColor || rawColor === 'default') paletteId = 'ruby';
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
  return NOTEBOOK_COLOR_PALETTES.find(p => p.id === paletteId) || NOTEBOOK_COLOR_PALETTES[0];
}

export function getNotebookIcon(iconId: string): LucideIcon {
  const found = NOTEBOOK_ICONS.find(i => i.id === iconId);
  return found ? found.icon : BookOpen;
}
