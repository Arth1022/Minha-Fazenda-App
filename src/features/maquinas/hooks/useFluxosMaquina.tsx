import React, { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import type { Maquina, UsoMaquina } from '@/dtos';
import { AbastecerModal } from '../components/AbastecerModal';
import { HorimetroModal } from '../components/HorimetroModal';
import { LigarMaquinaModal } from '../components/LigarMaquinaModal';
import { NovaAnotacaoForm } from '../components/NovaAnotacaoForm';
import { ProblemaModal } from '../components/ProblemaModal';
import { ResumoUsoModal } from '../components/ResumoUsoModal';
import { UsoManualModal } from '../components/UsoManualModal';
import type { CondicaoMaquina } from '../services/registros';
import { useOperacaoMaquina } from './useOperacaoMaquina';

/** Registros que começam por um toque (na folha do QR, na ficha ou no Em uso). */
export type FluxoMaquina = 'ligar' | 'abastecer' | 'horimetro' | 'problema' | 'usoManual';

export interface ContextoFluxo {
  /** Uso aberto na máquina (de quem for) */
  usoAberto?: UsoMaquina | null;
  condicao?: CondicaoMaquina;
  /** O uso aberto é de outra pessoa (ligar vira "Assumir") */
  deOutraPessoa?: boolean;
}

type Aberto =
  | { tipo: FluxoMaquina; maquina: Maquina; contexto: ContextoFluxo }
  | { tipo: 'resumo' | 'anotar'; maquina: Maquina; uso: UsoMaquina };

/**
 * Um lugar só para os registros da máquina: `abrir('abastecer', maquina)` mostra
 * o formulário certo; `desligar` grava e mostra o resumo do uso. Renderize
 * `modais` na tela que usa o hook.
 */
export function useFluxosMaquina() {
  const operacao = useOperacaoMaquina();
  const [aberto, setAberto] = useState<Aberto | null>(null);
  const fechar = useCallback(() => setAberto(null), []);

  const abrir = useCallback((tipo: FluxoMaquina, maquina: Maquina, contexto: ContextoFluxo = {}) => {
    setAberto({ tipo, maquina, contexto });
  }, []);

  const { desligar: desligarUso } = operacao;
  const desligar = useCallback(
    async (maquina: Maquina) => {
      const resultado = await desligarUso(maquina.id);
      if (!resultado) return;
      if (resultado.descartado) {
        Alert.alert('Uso descartado', 'A máquina ficou ligada menos de 1 minuto, quase sem andar: não foi registrado.');
      } else if (resultado.uso) {
        setAberto({ tipo: 'resumo', maquina, uso: resultado.uso });
      }
    },
    [desligarUso]
  );

  const usoDoContexto = aberto && 'contexto' in aberto ? (aberto.contexto.usoAberto ?? null) : null;
  // Registro feito com a máquina em uso fica ligado ao uso (abastece sem encerrar)
  const usoId = usoDoContexto?.id ?? null;

  let modal: React.ReactNode = null;
  if (aberto) {
    const { maquina } = aberto;
    switch (aberto.tipo) {
      case 'ligar':
        modal = (
          <LigarMaquinaModal
            maquina={maquina}
            condicao={aberto.contexto.condicao ?? 'ok'}
            usoDeOutraPessoa={aberto.contexto.deOutraPessoa ? usoDoContexto : null}
            ocupado={operacao.ocupado}
            onLigar={async (escolhas) => {
              if (await operacao.ligar(maquina, escolhas)) fechar();
            }}
            onClose={fechar}
          />
        );
        break;
      case 'abastecer':
        modal = <AbastecerModal maquina={maquina} usoId={usoId} onClose={fechar} />;
        break;
      case 'horimetro':
        modal = <HorimetroModal maquina={maquina} usoId={usoId} onClose={fechar} />;
        break;
      case 'problema':
        modal = <ProblemaModal maquina={maquina} usoId={usoId} onClose={fechar} />;
        break;
      case 'usoManual':
        modal = <UsoManualModal maquina={maquina} onClose={fechar} />;
        break;
      case 'resumo':
        modal = (
          <ResumoUsoModal
            maquina={maquina}
            uso={aberto.uso}
            onAnotar={() => setAberto({ tipo: 'anotar', maquina, uso: aberto.uso })}
            onClose={fechar}
          />
        );
        break;
      case 'anotar':
        modal = (
          <NovaAnotacaoForm visible maquinaId={maquina.id} nome={maquina.nome} usoId={aberto.uso.id} onClose={fechar} />
        );
        break;
    }
  }

  return {
    abrir,
    desligar,
    pausar: operacao.pausar,
    retomar: operacao.retomar,
    ocupado: operacao.ocupado,
    modais: modal,
  };
}
