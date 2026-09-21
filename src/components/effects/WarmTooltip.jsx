// ============================================================
// WarmTooltip.jsx
//
// Tooltip animado (React Bits "Warm Tooltip", reimplementado do zero
// em CSS + JS puro) pra substituir o title="" nativo do navegador nos
// pontos em que a explicação é importante o bastante pra merecer
// aparecer mais rápido e de um jeito mais legível -- o title nativo
// tem um delay grande e o navegador escolhe a cor/fonte, o que não dá
// pra combinar com o resto da ficha.
//
// Renderiza o balão num portal direto pro <body> (createPortal, já faz
// parte do react-dom -- não é dependência nova nenhuma) em vez de
// deixar ele como filho normal do gatilho: os badges "Automático" (ver
// RitualTab/CombateTab.jsx) ficam dentro de um card com
// overflow:hidden (.modal-item-card, usado tanto pra arredondar as
// bordas quanto pra animação de abrir/fechar o corpo do card) -- um
// balão posicionado normalmente ficaria cortado por esse
// overflow:hidden sempre que precisasse de mais espaço vertical do que
// sobra dentro do card. Com portal, o balão vira `position: fixed` e
// calcula a própria posição a partir do retângulo do gatilho
// (getBoundingClientRect) só quando abre -- escapa de qualquer
// overflow:hidden no caminho.
//
// Uso: <WarmTooltip texto="Explicação mais longa aqui" placement="bottom">
//        <span className="modal-item-card-badge badge-auto">Automático</span>
//      </WarmTooltip>
// (o filho vira o "gatilho" -- o balão aparece no hover/focus dele.)
// ============================================================

import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function WarmTooltip({ children, texto, placement = 'top', className = '' }) {
    const [aberto, setAberto] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const gatilhoRef = useRef(null);

    // O balão fica sempre montado no portal (só escondido via
    // opacity/pointer-events quando fechado) em vez de ser criado só
    // na hora de abrir -- assim a transição de opacity/transform do
    // CSS (ver .warm-tooltip-aberto no index.css) tem um estado
    // "antes" pra animar a partir dele. Se ele fosse criado já aberto,
    // não haveria mudança de estado nenhuma pro navegador animar.
    function abrir() {
        if (!gatilhoRef.current) return;
        const rect = gatilhoRef.current.getBoundingClientRect();
        setCoords({
            top: placement === 'bottom' ? rect.bottom + 8 : rect.top - 8,
            left: rect.left + rect.width / 2,
        });
        setAberto(true);
    }

    function fechar() {
        setAberto(false);
    }

    if (!texto) return children;

    return (
        <span
            ref={gatilhoRef}
            className={`warm-tooltip ${className}`}
            tabIndex={0}
            onMouseEnter={abrir}
            onMouseLeave={fechar}
            onFocus={abrir}
            onBlur={fechar}
        >
            {children}
            {createPortal(
                <span
                    className={`warm-tooltip-bubble warm-tooltip-${placement}${aberto ? ' warm-tooltip-aberto' : ''}`}
                    role="tooltip"
                    aria-hidden={!aberto}
                    style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
                >
                    {texto}
                </span>,
                document.body
            )}
        </span>
    );
}
