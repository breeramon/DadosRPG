// ============================================================
// WelcomePage.jsx
//
// Tela de apresentação do projeto -- é a primeira coisa que qualquer
// visitante vê ao abrir o site (rota "/", ver App.jsx), logado ou não:
// explica o que é a ficha, antes de pedir pra criar conta/entrar. O
// formulário de Entrar/Criar conta em si (com o mesmo Entrar/Criar
// conta de sempre) foi movido pra "/login" -- essa página aqui NÃO
// redireciona sozinha quem já está logado (diferente da LoginPage, que
// ainda faz isso em "/login") porque o pedido foi pra essa tela
// aparecer sempre, pra todo mundo, ao acessar o site.
//
// Também é onde ficam os dois pedidos do usuário pra quem só está
// "de passagem": o aviso de que o projeto é código aberto (link pro
// GitHub) e um jeito de mandar sugestão/bug (link de e-mail -- decidiu
// por e-mail em vez de um campo de mensagem salvo no Firestore, porque
// aquele exigiria abrir escrita sem login no banco, o que é risco de
// spam/abuso, e não existe painel administrativo nesta ficha pra ler
// as mensagens de qualquer forma).
// ============================================================

import { useNavigate } from 'react-router-dom';

// Mesmo ícone de "selo" abstrato usado na LoginPage.jsx (círculo +
// marcações, sem nenhum significado religioso específico, só clima de
// RPG/oculto) -- cada página mantém sua própria cópia pequena, mesmo
// padrão já usado pros outros ícones do projeto (D20Icon, DiceIcon
// etc), em vez de criar um arquivo compartilhado só pra isso.
function SeloIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <circle cx="24" cy="24" r="19" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="24" cy="24" r="6.5" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="24" cy="24" r="1.8" fill="currentColor" />
            <path d="M24 2.5V9M24 39V45.5M2.5 24H9M39 24H45.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M9.5 9.5L13.7 13.7M34.3 34.3L38.5 38.5M9.5 38.5L13.7 34.3M34.3 13.7L38.5 9.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
        </svg>
    );
}

const EMAIL_CONTATO = 'breeramon@gmail.com';
const ASSUNTO_EMAIL = 'BreusRPG - Sugestão ou bug';
const LINK_GITHUB = 'https://github.com/breeramon/DadosRPG';

export default function WelcomePage() {
    const navigate = useNavigate();

    return (
        <div className="screen screen-welcome">
            {/* Mesmo fundo decorativo (névoa/brilho/estrelas) da tela de
                login -- puramente visual (aria-hidden). Diferente da tela
                de login, essa página rola bem além de uma tela só, então
                o CSS limita esse fundo a uma altura de "hero" no topo em
                vez de esticar por toda a página (ver .screen-welcome
                .login-bg no index.css). */}
            <div className="login-bg" aria-hidden="true">
                <div className="login-bg-glow login-bg-glow-1" />
                <div className="login-bg-glow login-bg-glow-2" />
                <div className="login-bg-stars" />
                <div className="login-bg-vignette" />
            </div>

            <div className="welcome-topbar">
                <span className="welcome-topbar-brand">
                    <SeloIcon className="welcome-topbar-mark" />
                    BreusRPG
                </span>
                <button type="button" className="btn-action" onClick={() => navigate('/login')}>
                    Entrar
                </button>
            </div>

            <div className="welcome-content">
                <section className="welcome-hero">
                    <SeloIcon className="welcome-hero-mark" />
                    <h1>Ficha Ordem Paranormal</h1>
                    <p className="welcome-hero-tagline">
                        A ficha de personagem que você deixa aberta durante a própria
                        sessão de <strong>Ordem Paranormal</strong> — rola dados, gasta
                        PE, confere perícias, rituais e inventário, tudo salvo na nuvem,
                        sem precisar do livro físico ou de uma ficha de papel em
                        paralelo.
                    </p>
                </section>

                <section className="welcome-features">
                    <div className="welcome-feature-card">
                        <h3>Tudo salvo na nuvem</h3>
                        <p>Seus personagens ficam guardados na sua conta — acesse de qualquer aparelho, sem perder nada entre sessões.</p>
                    </div>
                    <div className="welcome-feature-card">
                        <h3>Dados 3D animados</h3>
                        <p>Rolagem com física de verdade na tela, com um gerador comum como reserva se o navegador não conseguir rodar a animação.</p>
                    </div>
                    <div className="welcome-feature-card">
                        <h3>Regras do livro de Ordem</h3>
                        <p>Perícias, itens, rituais e poderes de trilha pesquisados com base no livro de regras de Ordem Paranormal e sites que contêm informações sobre a franquia, caso ache algo errado, só me avisar.</p>
                    </div>
                    <div className="welcome-feature-card">
                        <h3>Feito pra jogar ao vivo</h3>
                        <p>Interface pensada pra ser rápida "de relance" durante a mesa, não só organizada entre sessões.</p>
                    </div>
                </section>

                <section className="welcome-callout">
                    <h2>Projeto de código aberto</h2>
                    <p>
                        O BreusRPG é feito e mantido por uma pessoa que assistiu e ama Ordem Paranormal,
                        e todo o código-fonte está aberto no GitHub — qualquer um pode
                        ver como foi feito, relatar problemas ou contribuir direto com o
                        projeto.
                    </p>
                    <a
                        className="btn-secondary welcome-callout-link"
                        href={LINK_GITHUB}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Ver o repositório no GitHub
                    </a>
                </section>

                <section className="welcome-callout">
                    <h2>Encontrou um bug ou tem uma sugestão?</h2>
                    <p>
                        Sua opinião ajuda a melhorar a ficha pra todo mundo que joga com
                        ela. Encontrou algo que não funciona direito, ou tem uma ideia de
                        funcionalidade? Manda um e-mail, toda e qualquer crítica construtiva é bem-vinda.
                    </p>
                    <a
                        className="btn-secondary welcome-callout-link"
                        href={`mailto:${EMAIL_CONTATO}?subject=${encodeURIComponent(ASSUNTO_EMAIL)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Enviar e-mail
                    </a>
                </section>

                {/* Rodapé simples, só pra fechar a página com algo em vez
                    de terminar em espaço vazio (ver comentário sobre o
                    fundo decorativo lá em cima e .welcome-footer no
                    index.css). */}
                <footer className="welcome-footer">
                    <span className="welcome-footer-brand">
                        <SeloIcon className="welcome-footer-mark" />
                        BreusRPG
                    </span>
                    <div className="welcome-footer-links">
                        <a href={LINK_GITHUB} target="_blank" rel="noopener noreferrer">
                            GitHub
                        </a>
                        <a
                            href={`mailto:${EMAIL_CONTATO}?subject=${encodeURIComponent(ASSUNTO_EMAIL)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Contato
                        </a>
                    </div>
                </footer>
            </div>
        </div>
    );
}
