import type { TipoMaquina } from '@/dtos';

/** Prefixo do ID interno por tipo (o ID não aparece na tela; serve de chave curta). */
const PREFIXO: Record<TipoMaquina, string> = {
  trator: 'TR',
  colheitadeira: 'CO',
  pulverizador: 'PU',
  plantadeira: 'PL',
  implemento: 'IM',
  caminhao: 'CA',
  utilitario: 'UT',
  ordenhadeira: 'OR',
  outro: 'MQ',
};

/**
 * Próximo ID livre do tipo: "TR-01", "TR-02"... preenchendo buracos deixados por
 * máquinas apagadas. `existentes` são os IDs já usados (de qualquer tipo).
 */
export function gerarCodigo(tipo: TipoMaquina, existentes: readonly string[]): string {
  const usados = new Set(existentes);
  const prefixo = PREFIXO[tipo];
  for (let n = 1; ; n++) {
    const codigo = `${prefixo}-${String(n).padStart(2, '0')}`;
    if (!usados.has(codigo)) return codigo;
  }
}
