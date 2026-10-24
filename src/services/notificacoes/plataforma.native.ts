import { Platform } from 'react-native';

import type { Plataforma } from './plataforma';

export const plataforma: Plataforma = Platform.OS === 'ios' ? 'ios' : 'android';
