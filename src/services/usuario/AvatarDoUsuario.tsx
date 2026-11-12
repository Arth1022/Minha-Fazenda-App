import { eq } from 'drizzle-orm';
import React from 'react';

import { db, useLiveQuery, usuarios } from '@/database';
import { Avatar } from '@/shared/Avatar';

export interface AvatarDoUsuarioProps {
  usuarioId: string;
  /** Nome guardado no registro (ex.: o responsável copiado na etapa), usado até o colega descer pelo sync */
  nome: string;
  tamanho?: number;
}

/** Avatar de um colega pelo id: a foto e o nome vêm de `usuarios` (sync). */
export function AvatarDoUsuario({ usuarioId, nome, tamanho = 26 }: AvatarDoUsuarioProps) {
  const { data } = useLiveQuery(
    db.select({ nome: usuarios.nome, avatarUrl: usuarios.avatarUrl }).from(usuarios).where(eq(usuarios.id, usuarioId)).limit(1),
    [usuarioId]
  );
  const colega = data[0];
  return <Avatar nome={colega?.nome ?? nome} avatarUrl={colega?.avatarUrl} usuarioId={usuarioId} tamanho={tamanho} />;
}
