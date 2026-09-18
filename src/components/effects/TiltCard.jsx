// ============================================================
// TiltCard.jsx
//
// Efeito de "carta física sendo segurada" (React Bits "Tilted Card",
// reimplementado do zero em CSS + JS puro, sem nenhuma dependência
// nova, mesma linha de GlitchText/DecryptedText/CountUp/ClickSpark
// nesta mesma pasta): o card inclina sutilmente em 3D acompanhando a
// posição do mouse, e volta pra posição neutra suavemente quando o
// mouse sai. Usado nos cards de "Meus Personagens" (ver
// CharactersPage.jsx) -- puramente estético, não guarda nem altera
// nenhum dado do personagem.
//
// Como o ângulo é aplicado via variáveis CSS (--tilt-x/--tilt-y) lidas
// por .tilt-card no index.css, em vez de um "transform" inteiro escrito
// aqui no JS, o resto do efeito (perspective, transition, box-shadow no
// hover) fica só no CSS -- consistente com o resto do projeto, que
// prefere deixar visual em CSS sempre que dá.
//
// Uso: <TiltCard className="character-card" key={...}>
//        ...conteúdo do card...
//      </TiltCard>
// (o className passado continua valendo normalmente pros estilos que
// já existiam do card -- .tilt-card só adiciona o efeito por cima.)
// ============================================================

import { useRef } from 'react';

const INCLINACAO_MAX_GRAUS = 8;

export default function TiltCard({ children, className = '', ...rest }) {
    const elementoRef = useRef(null);
    const reduzMovimentoRef = useRef(null);

    function reduzMovimentoAtivo() {
        if (reduzMovimentoRef.current === null) {
            reduzMovimentoRef.current = !!(
                window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
            );
        }
        return reduzMovimentoRef.current;
    }

    function handleMouseMove(e) {
        if (reduzMovimentoAtivo() || !elementoRef.current) return;
        const rect = elementoRef.current.getBoundingClientRect();
        const proporcaoX = (e.clientX - rect.left) / rect.width; // 0 (esquerda) .. 1 (direita)
        const proporcaoY = (e.clientY - rect.top) / rect.height; // 0 (topo) .. 1 (base)
        const rotateY = (proporcaoX - 0.5) * INCLINACAO_MAX_GRAUS * 2;
        const rotateX = (0.5 - proporcaoY) * INCLINACAO_MAX_GRAUS * 2;
        elementoRef.current.style.setProperty('--tilt-x', `${rotateX.toFixed(2)}deg`);
        elementoRef.current.style.setProperty('--tilt-y', `${rotateY.toFixed(2)}deg`);
    }

    function handleMouseLeave() {
        if (!elementoRef.current) return;
        elementoRef.current.style.setProperty('--tilt-x', '0deg');
        elementoRef.current.style.setProperty('--tilt-y', '0deg');
    }

    return (
        <div
            ref={elementoRef}
            className={`tilt-card ${className}`}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            {...rest}
        >
            {children}
        </div>
    );
}
