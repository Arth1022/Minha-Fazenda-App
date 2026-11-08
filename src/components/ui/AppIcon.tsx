import React from 'react';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { IconSize } from '@/constants/theme';

export type AppIconName =
  | 'sun'
  | 'sunset'
  | 'moon'
  | 'bell'
  | 'edit'
  | 'plus'
  | 'x'
  | 'milk'
  | 'clock'
  | 'tag'
  | 'weight'
  | 'alert'
  | 'check'
  | 'search'
  | 'qrcode'
  | 'syringe'
  | 'heart'
  | 'baby'
  | 'arrowLeft'
  | 'logOut'
  | 'flashlight'
  | 'chevronDown'
  | 'chevronUp'
  | 'chevronRight'
  | 'map'
  | 'cow'
  | 'package'
  | 'tractor'
  | 'maximize'
  | 'pentagon'
  | 'sprout'
  | 'fence'
  | 'layers'
  | 'locate'
  | 'mapPin'
  | 'undo'
  | 'trash';

/** Ícones só de traços (Lucide), desenhados pela lista de caminhos. */
const PATH_ICONS: Partial<Record<AppIconName, string[]>> = {
  syringe: [
    'm18 2 4 4',
    'm17 7 3-3',
    'M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5',
    'm9 11 4 4',
    'm5 19-3 3',
    'm14 4 6 6',
  ],
  heart: [
    'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z',
  ],
  baby: [
    'M9 12h.01',
    'M15 12h.01',
    'M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5',
    'M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1',
  ],
  arrowLeft: ['m12 19-7-7 7-7', 'M19 12H5'],
  logOut: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'm16 17 5-5-5-5', 'M21 12H9'],
  flashlight: ['M18 6c0 2-2 2-2 4v10a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V10c0-2-2-2-2-4V2h12z', 'M6 6h12', 'M12 12h.01'],
  map: [
    'M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z',
    'M15 5.764v15',
    'M9 3.236v15',
  ],
  // Cara de vaca de frente: chifres, orelhas, olhos e focinho com as narinas
  cow: [
    'M8.6 4.4 7.4 2.6',
    'M15.4 4.4l1.2-1.8',
    'M7 8 3.6 7.4a.8.8 0 0 0-.7 1.3L4.6 11H7',
    'M17 8l3.4-.6a.8.8 0 0 1 .7 1.3L19.4 11H17',
    'M7 13.4V8a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4v5.4',
    'M9.5 13h5a3.5 3.5 0 0 1 0 7h-5a3.5 3.5 0 0 1 0-7z',
    'M9.8 9.2h.01',
    'M14.2 9.2h.01',
    'M10.3 16.5h.01',
    'M13.7 16.5h.01',
  ],
  package: [
    'M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z',
    'M12 22V12',
    'm3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7',
    'm7.5 4.27 9 5.15',
  ],
  tractor: [
    'm10 11 11 .9a1 1 0 0 1 .8 1.1l-.665 4.158a1 1 0 0 1-.988.842H20',
    'M16 18h-5',
    'M18 5a1 1 0 0 0-1 1v5.573',
    'M3 4h8.129a1 1 0 0 1 .99.863L13 11.246',
    'M4 11V4',
    'M7 15h.01',
    'M8 10.1V4',
    'M20 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0',
    'M12 15a5 5 0 1 1-10 0 5 5 0 0 1 10 0',
  ],
  maximize: ['M15 3h6v6', 'M9 21H3v-6', 'M21 3l-7 7', 'M3 21l7-7'],
  pentagon: [
    'M3.5 8.7c-.7.5-1 1.4-.7 2.2l2.8 8.7c.3.8 1 1.4 1.9 1.4h9.1c.9 0 1.6-.6 1.9-1.4l2.8-8.7c.3-.8 0-1.7-.7-2.2l-7.4-5.3a2.1 2.1 0 0 0-2.4 0Z',
  ],
  sprout: [
    'M7 20h10',
    'M10 20c5.5-2.5.8-6.4 3-10',
    'M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z',
    'M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z',
  ],
  fence: [
    'M4 3 2 5v15c0 .6.4 1 1 1h2c.6 0 1-.4 1-1V5Z',
    'M6 8h4',
    'M6 18h4',
    'm12 3-2 2v15c0 .6.4 1 1 1h2c.6 0 1-.4 1-1V5Z',
    'M14 8h4',
    'M14 18h4',
    'm20 3-2 2v15c0 .6.4 1 1 1h2c.6 0 1-.4 1-1V5Z',
  ],
  layers: [
    'M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z',
    'm22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65',
    'm22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65',
  ],
  locate: [
    'M2 12h3',
    'M19 12h3',
    'M12 2v3',
    'M12 19v3',
    'M19 12a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
    'M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  ],
  mapPin: [
    'M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0',
    'M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  ],
  undo: ['M9 14 4 9l5-5', 'M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5 5.5 5.5 0 0 1-5.5 5.5H11'],
  trash: [
    'M3 6h18',
    'M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6',
    'M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2',
  ],
};

/** Setas simples (Feather): um único traço em "V". */
const CHEVRON_PATH: Record<'chevronDown' | 'chevronUp' | 'chevronRight', string> = {
  chevronDown: 'M6 9l6 6 6-6',
  chevronUp: 'M18 15l-6-6-6 6',
  chevronRight: 'M9 18l6-6-6-6',
};

export interface AppIconProps {
  name: AppIconName;
  size?: number;
  color?: string;
}

/**
 * Ícones vetoriais padronizados no padrão Feather / Figma usando react-native-svg.
 * Não depende de arquivos de fontes ou módulos externos que falham no Metro bundler.
 */
export function AppIcon({ name, size = IconSize.lg, color = '#64748B' }: AppIconProps) {
  const paths = PATH_ICONS[name];
  if (paths) {
    return (
      <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round">
        {paths.map((d) => (
          <Path key={d} d={d} />
        ))}
      </Svg>
    );
  }

  switch (name) {
    case 'sun':
      return (
        <Svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round">
          <Circle cx="12" cy="12" r="5" />
          <Line x1="12" y1="1" x2="12" y2="3" />
          <Line x1="12" y1="21" x2="12" y2="23" />
          <Line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <Line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <Line x1="1" y1="12" x2="3" y2="12" />
          <Line x1="21" y1="12" x2="23" y2="12" />
          <Line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <Line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </Svg>
      );

    case 'sunset':
      return (
        <Svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round">
          <Path d="M17 18a5 5 0 0 0-10 0" />
          <Line x1="12" y1="2" x2="12" y2="9" />
          <Line x1="4.22" y1="10.22" x2="5.64" y2="11.64" />
          <Line x1="1" y1="18" x2="3" y2="18" />
          <Line x1="21" y1="18" x2="23" y2="18" />
          <Line x1="18.36" y1="11.64" x2="19.78" y2="10.22" />
          <Line x1="23" y1="22" x2="1" y2="22" />
          <Line x1="16" y1="5" x2="12" y2="9" />
          <Line x1="8" y1="5" x2="12" y2="9" />
        </Svg>
      );

    case 'moon':
      return (
        <Svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round">
          <Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </Svg>
      );

    case 'bell':
      return (
        <Svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round">
          <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <Path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </Svg>
      );

    case 'edit':
      return (
        <Svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round">
          <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </Svg>
      );

    case 'plus':
      return (
        <Svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round">
          <Line x1="12" y1="5" x2="12" y2="19" />
          <Line x1="5" y1="12" x2="19" y2="12" />
        </Svg>
      );

    case 'x':
      return (
        <Svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round">
          <Line x1="18" y1="6" x2="6" y2="18" />
          <Line x1="6" y1="6" x2="18" y2="18" />
        </Svg>
      );

    case 'milk':
      return (
        <Svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round">
          <Path d="M8 2h8" />
          <Path d="M9 2v2.789a4 4 0 0 1-.672 2.219l-.656.984A4 4 0 0 0 7 10.212V20a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-9.789a4 4 0 0 0-.672-2.219l-.656-.984A4 4 0 0 1 15 4.788V2" />
          <Path d="M7 15a6.472 6.472 0 0 1 5 0 6.47 6.47 0 0 0 5 0" />
        </Svg>
      );

    case 'clock':
      return (
        <Svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round">
          <Circle cx="12" cy="12" r="10" />
          <Path d="M12 6v6l4 2" />
        </Svg>
      );

    case 'tag':
      return (
        <Svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round">
          <Path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
          <Line x1="7" y1="7" x2="7.01" y2="7" />
        </Svg>
      );

    case 'weight':
      return (
        <Svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round">
          <Circle cx="12" cy="5" r="3" />
          <Path d="M6.5 8a2 2 0 0 0-1.905 1.46L2.1 18.5A2 2 0 0 0 4 21h16a2 2 0 0 0 1.925-2.54L19.4 9.5A2 2 0 0 0 17.48 8Z" />
        </Svg>
      );

    case 'alert':
      return (
        <Svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round">
          <Path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <Line x1="12" y1="9" x2="12" y2="13" />
          <Line x1="12" y1="17" x2="12.01" y2="17" />
        </Svg>
      );

    case 'check':
      return (
        <Svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round">
          <Path d="M20 6L9 17l-5-5" />
        </Svg>
      );

    case 'search':
      return (
        <Svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round">
          <Circle cx="11" cy="11" r="8" />
          <Line x1="21" y1="21" x2="16.65" y2="16.65" />
        </Svg>
      );

    case 'qrcode':
      // Leitura de QR Code: cantos do visor com um QR dentro (Lucide "scan-qr-code")
      return (
        <Svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round">
          <Path d="M3 7V5a2 2 0 0 1 2-2h2" />
          <Path d="M17 3h2a2 2 0 0 1 2 2v2" />
          <Path d="M21 17v2a2 2 0 0 1-2 2h-2" />
          <Path d="M7 21H5a2 2 0 0 1-2-2v-2" />
          <Rect x="7" y="7" width="4" height="4" rx="1" />
          <Path d="M17 12v4a1 1 0 0 1-1 1h-4" />
          <Path d="M17 8V7" />
          <Path d="M7 17h.01" />
        </Svg>
      );

    case 'chevronDown':
    case 'chevronUp':
    case 'chevronRight':
      return (
        <Svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round">
          <Path d={CHEVRON_PATH[name]} />
        </Svg>
      );

    default:
      return null;
  }
}
