import { and, eq } from 'drizzle-orm';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { daFazenda, db, maquinas } from '@/database';
import type { AtividadeUso, Maquina, UsoMaquina } from '@/dtos';
import { usuarioAtual } from '@/services/usuario';
import {
  encerrarUso,
  iniciarUso,
  marcarSemRastro,
  pausarUso,
  retomarUso,
  usoAbertoDoOperador,
  type UsoEncerrado,
} from '../data/usos';
import { limparAvisoParada } from '../rastro/avisos';
import { iniciarRastro, pararRastro, pedirLocalizacaoParaRastro, posicaoRapida } from '../rastro/localizacao';
import { publicarStatusMaquina } from '../services/statusRemoto';

export interface EscolhasAoLigar {
  implementoId: string | null;
  atividade: AtividadeUso | null;
  /** A máquina está em uso por outra pessoa: fecha o uso dela e abre o novo */
  assumir?: boolean;
}

function avisarErro(erro: unknown) {
  Alert.alert('Não foi possível registrar', erro instanceof Error ? erro.message : 'Tente novamente.');
}

function perguntar(titulo: string, mensagem: string, confirmar: string): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(titulo, mensagem, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmar, onPress: () => resolve(true) },
    ]);
  });
}

/** Avisa a API (quando existir); nunca desfaz nem trava o que já foi gravado. */
function publicar(maquina: Pick<Maquina, 'id' | 'codigo'>, emUso: boolean) {
  publicarStatusMaquina({ maquinaId: maquina.id, codigo: maquina.codigo, emUso, em: new Date() }).catch(
    () => undefined
  );
}

/**
 * Ligar e desligar com o GPS: pede a permissão de localização, abre o uso, liga
 * o rastro e, ao desligar, grava o resumo. Sem permissão, registra só o tempo.
 */
export function useOperacaoMaquina() {
  const [ocupado, setOcupado] = useState(false);

  const desligarSemTela = useCallback(async (maquinaId: string): Promise<UsoEncerrado> => {
    const posicao = await posicaoRapida();
    let resultado: UsoEncerrado;
    try {
      resultado = await encerrarUso(maquinaId, { posicao });
    } finally {
      // O GPS para mesmo se o uso já tiver sido fechado (por outra pessoa, pela
      // regra automática ou pelo sync): nunca rastreia fora de um uso
      await pararRastro();
    }
    if (resultado.uso) await limparAvisoParada(resultado.uso.id);
    const maquina = await db.select().from(maquinas).where(and(daFazenda(maquinas), eq(maquinas.id, maquinaId))).get();
    if (maquina) publicar(maquina, false);
    return resultado;
  }, []);

  const ligar = useCallback(
    async (maquina: Maquina, escolhas: EscolhasAoLigar): Promise<UsoMaquina | null> => {
      setOcupado(true);
      try {
        // Ninguém dirige duas máquinas: a que a pessoa está usando é desligada antes
        const [outra] = await usoAbertoDoOperador(usuarioAtual().id);
        if (outra && outra.maquinaId !== maquina.id) {
          const nome = (await db.select().from(maquinas).where(and(daFazenda(maquinas), eq(maquinas.id, outra.maquinaId))).get())?.nome;
          const trocar = await perguntar(
            `Você está usando ${nome ?? 'outra máquina'}`,
            `Desligar ${nome ?? 'a outra'} e ligar ${maquina.nome}?`,
            'Desligar e ligar'
          );
          if (!trocar) return null;
          await desligarSemTela(outra.maquinaId);
        }

        const nivel = await pedirLocalizacaoParaRastro();
        const posicao = nivel === 'negada' ? null : await posicaoRapida();
        const uso = await iniciarUso(maquina.id, {
          implementoId: escolhas.implementoId,
          atividade: escolhas.atividade,
          assumir: escolhas.assumir,
          rastreado: nivel !== 'negada',
          posicao,
        });
        if (uso.rastreado && !(await iniciarRastro(maquina.nome))) {
          await marcarSemRastro(uso.id);
          Alert.alert('GPS desligado', 'Não foi possível ligar o GPS: o uso vai registrar só o tempo.');
        }
        publicar(maquina, true);
        return uso;
      } catch (erro) {
        avisarErro(erro);
        return null;
      } finally {
        setOcupado(false);
      }
    },
    [desligarSemTela]
  );

  const desligar = useCallback(
    async (maquinaId: string): Promise<UsoEncerrado | null> => {
      setOcupado(true);
      try {
        return await desligarSemTela(maquinaId);
      } catch (erro) {
        avisarErro(erro);
        return null;
      } finally {
        setOcupado(false);
      }
    },
    [desligarSemTela]
  );

  const pausar = useCallback(async (uso: UsoMaquina) => {
    try {
      await pausarUso(uso.id);
      await limparAvisoParada(uso.id);
    } catch (erro) {
      avisarErro(erro);
    }
  }, []);

  const retomar = useCallback(async (uso: UsoMaquina) => {
    try {
      await retomarUso(uso.id);
    } catch (erro) {
      avisarErro(erro);
    }
  }, []);

  return { ligar, desligar, pausar, retomar, ocupado };
}
