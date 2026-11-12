export { AuthProvider, useConta, type ContaValor } from './AuthContext';
export { alterarNome, enviarAvatar, escolherFotoDoAvatar, removerAvatar } from './avatarEPerfil';
export { restaurarContextoSalvo } from './contextoSalvo';
export { atualizarPerfilLocal, criarPerfilLocal, lerPerfilLocal } from './perfilLocal';
export {
  atualizarUsuarioDaSessao,
  encerrarSessao,
  entrar,
  entrarSemConta,
  iniciarConta,
  registrar,
  renovarSessao,
  sair,
  type Credencial,
  type DadosCadastro,
  type ResultadoConvite,
} from './servicoConta';
export { sessaoEmMemoria, type ModoConta, type UsuarioDaSessao } from './sessao';
export { campoDoErro, validarEmail, validarNome } from './validacao';
