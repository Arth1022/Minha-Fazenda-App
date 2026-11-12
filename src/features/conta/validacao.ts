import { ehErroApi } from '@/shared/api';

/** Nome da pessoa: obrigatório, de 2 a 60 caracteres (sem os espaços das pontas). */
export function validarNome(nome: string): string | null {
  const limpo = nome.trim();
  if (!limpo) return 'Informe seu nome.';
  if (limpo.length < 2) return 'O nome precisa ter pelo menos 2 letras.';
  if (limpo.length > 60) return 'O nome pode ter no máximo 60 caracteres.';
  return null;
}

export function validarEmail(email: string): string | null {
  const limpo = email.trim();
  if (!limpo) return 'Informe seu e-mail.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpo)) return 'E-mail inválido.';
  return null;
}

/** Palavras que a API usa na mensagem de cada campo ("campo inválido: a mensagem diz qual"). */
const PALAVRAS_DO_CAMPO: Record<string, readonly string[]> = {
  nomeFazenda: ['fazenda'],
  email: ['e-mail', 'email', 'credencial'],
  nome: ['nome'],
};

/**
 * Em qual campo mostrar um `400 VALIDACAO` (a mensagem diz qual). A ordem
 * importa: "nome da fazenda" é da fazenda, não do nome da pessoa. Null: aviso geral.
 */
export function campoDoErro<C extends string>(erro: unknown, campos: readonly C[]): C | null {
  if (!ehErroApi(erro, 'VALIDACAO')) return null;
  const mensagem = erro.message.toLowerCase();
  for (const [campo, palavras] of Object.entries(PALAVRAS_DO_CAMPO)) {
    if (campos.includes(campo as C) && palavras.some((p) => mensagem.includes(p))) return campo as C;
  }
  return null;
}
