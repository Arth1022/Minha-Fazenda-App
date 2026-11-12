import { Alert } from 'react-native';

/**
 * Ações do protótipo que ainda não têm endpoint na API. Por enquanto só avisam;
 * TODO(integração): trocar pelos fluxos reais quando o back-end tiver as rotas
 * (recuperar senha por e-mail, trocar senha logado e o canal de ajuda).
 */

export function avisarEsqueciSenha(): void {
  Alert.alert(
    'Esqueci a senha',
    'A recuperação de senha pelo app chega em breve. Por enquanto, peça ajuda ao suporte do Minha Fazenda.'
  );
}

export function avisarAlterarSenha(): void {
  Alert.alert('Alterar senha', 'A troca de senha pelo app chega em breve.');
}

export function avisarDificuldadeDeAcesso(): void {
  Alert.alert(
    'Dificuldade ao acessar?',
    'Confira se o e-mail está certo e se há internet. Se ainda assim não entrar, fale com o suporte do Minha Fazenda.'
  );
}
