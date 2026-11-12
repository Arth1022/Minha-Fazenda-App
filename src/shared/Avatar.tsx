import { Image } from 'expo-image';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { corDoAvatar, inicialDoNome } from './inicialECor';

export interface AvatarProps {
  nome: string | null | undefined;
  avatarUrl?: string | null;
  /** Escolhe a cor do avatar sem foto (mesma cor em todo celular) */
  usuarioId?: string | null;
  tamanho?: number;
  /** Mostra um "carregando" por cima (ex.: enviando a foto nova) */
  carregando?: boolean;
}

/**
 * Foto da pessoa num círculo, com cache em disco; sem foto (ou se a imagem
 * falhar), a primeira letra do nome sobre a cor da pessoa. Usado em todo lugar
 * que mostra gente: perfil, membros, cabeçalho e responsável por tarefa.
 */
export function Avatar({ nome, avatarUrl, usuarioId, tamanho = 40, carregando = false }: AvatarProps) {
  const [falhou, setFalhou] = useState<string | null>(null);
  const comFoto = Boolean(avatarUrl) && falhou !== avatarUrl;
  const circulo = { width: tamanho, height: tamanho, borderRadius: tamanho / 2 };

  return (
    <View style={[estilos.base, circulo, !comFoto && { backgroundColor: corDoAvatar(usuarioId) }]}>
      {comFoto ? (
        <Image
          source={{ uri: avatarUrl as string }}
          style={circulo}
          contentFit="cover"
          cachePolicy="disk"
          recyclingKey={avatarUrl}
          onError={() => setFalhou(avatarUrl ?? null)}
          accessibilityLabel={nome ? `Foto de ${nome}` : 'Foto'}
        />
      ) : (
        <Text style={[estilos.letra, { fontSize: tamanho * 0.45 }]} accessibilityLabel={nome ?? undefined}>
          {inicialDoNome(nome)}
        </Text>
      )}
      {carregando ? (
        <View style={[StyleSheet.absoluteFill, estilos.carregando, circulo]}>
          <ActivityIndicator color="#FFFFFF" />
        </View>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  letra: { color: '#FFFFFF', fontWeight: '700' },
  carregando: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
});
