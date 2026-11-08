import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { AgroColors } from '@/constants/theme';
import type { TipoMaquina } from '@/dtos';
import { ICONES_GENERICOS, logoDaMarca, type LogoMarca } from '../marcas';

/** Parte do círculo ocupada pelo logo (o resto é respiro até a borda). */
const ESCALA_LOGO = 0.72;
/** Parte do círculo ocupada pelo ícone genérico (só contorno, precisa de mais respiro). */
const ESCALA_ICONE = 0.5;

export interface MaquinaAvatarProps {
  tipo: TipoMaquina;
  /** Marca digitada no cadastro: se tiver logo, ele aparece no lugar do ícone do tipo */
  marca?: string | null;
  /** Diâmetro do círculo (padrão 44) */
  size?: number;
  /** Fundo do ícone genérico: 'neutro' (cinza, lista) ou 'mint' (verde claro, ficha) */
  variant?: 'neutro' | 'mint';
}

function Logo({ logo, lado }: { logo: LogoMarca; lado: number }) {
  if (logo.formato === 'imagem') {
    return (
      <Image
        source={logo.fonte}
        style={{ width: lado, height: lado }}
        contentFit="contain"
        accessibilityLabel={logo.nome}
      />
    );
  }
  return (
    <Svg width={lado} height={lado} viewBox={logo.viewBox} accessibilityLabel={logo.nome}>
      {logo.paths.map((d, i) => (
        <Path key={i} d={d} fill={logo.cor} />
      ))}
    </Svg>
  );
}

function IconeGenerico({ tipo, lado }: { tipo: TipoMaquina; lado: number }) {
  return (
    <Svg
      width={lado}
      height={lado}
      viewBox="0 0 24 24"
      fill="none"
      stroke={AgroColors.primary}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round">
      {ICONES_GENERICOS[tipo].map((d, i) => (
        <Path key={i} d={d} />
      ))}
    </Svg>
  );
}

/**
 * Círculo que identifica a máquina: o logo da marca quando a conhecemos, senão
 * o ícone genérico do tipo (trator, caminhão...). Tudo local, sem internet.
 */
export const MaquinaAvatar = React.memo(function MaquinaAvatar({
  tipo,
  marca = null,
  size = 44,
  variant = 'neutro',
}: MaquinaAvatarProps) {
  const logo = logoDaMarca(marca);
  const circulo = { width: size, height: size, borderRadius: size / 2 };

  if (logo) {
    return (
      <View style={[styles.base, styles.comLogo, circulo, logo.fundo ? { backgroundColor: logo.fundo } : null]}>
        <Logo logo={logo} lado={size * ESCALA_LOGO} />
      </View>
    );
  }

  return (
    <View style={[styles.base, variant === 'mint' ? styles.mint : styles.neutro, circulo]}>
      <IconeGenerico tipo={tipo} lado={size * ESCALA_ICONE} />
    </View>
  );
});

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  comLogo: {
    backgroundColor: AgroColors.cardBg,
    borderWidth: 1,
    borderColor: AgroColors.border,
  },
  neutro: {
    backgroundColor: AgroColors.mintSurface,
  },
  mint: {
    backgroundColor: AgroColors.mintBg,
  },
});
