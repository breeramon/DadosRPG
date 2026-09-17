// ============================================================
// GlitchText.jsx
//
// Efeito de "glitch" (distorção RGB split, tipo falha de sinal/estática)
// adaptado do React Bits -- zero dependências novas, só CSS (ver
// .glitch-text* no index.css). Usado no valor de destaque do log de
// rolagens quando o resultado é um crítico (acerto ou falha) -- ver
// CombateTab.jsx, dentro de .result-highlight.
//
// Diferente do componente original do React Bits (pensado pra títulos
// grandes, com font-size fixo tipo hero-text e sombra vermelho/ciano
// sempre visível), essa versão:
//   - herda o tamanho/peso de fonte de quem o usa (.result-highlight já
//     define isso), em vez de forçar um tamanho próprio;
//   - tem duas variantes de cor (success/fail) em vez de branco fixo,
//     pra combinar com os já existentes .crit-success/.crit-fail;
//   - desliga a animação sozinho quando o usuário pede menos movimento
//     (prefers-reduced-motion), igual o resto do projeto -- ver a regra
//     em index.css, não precisa de nenhuma checagem aqui no JS.
//
// Props:
//   children  -- o texto/número a exibir (também vira o data-text, que
//                é o que o CSS usa pra duplicar o texto via ::before/
//                ::after e criar o efeito de distorção)
//   variant   -- 'success' | 'fail' -- escolhe a cor do texto e das
//                sombras RGB (ver .glitch-text--success/--fail)
//   speed     -- multiplicador de velocidade da animação (padrão 1)
// ============================================================

function GlitchText({ children, variant = 'success', speed = 1, className = '' }) {
    const style = {
        '--glitch-after-duration': `${speed * 2.4}s`,
        '--glitch-before-duration': `${speed * 1.8}s`,
    };

    return (
        <span
            className={`glitch-text glitch-text--${variant} ${className}`}
            style={style}
            data-text={children}
        >
            {children}
        </span>
    );
}

export default GlitchText;
