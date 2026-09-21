// ============================================================
// SpotlightCard.jsx
//
// "Spotlight" / "Border Glow" (React Bits, reimplementado do zero em
// CSS + JS puro, mesma linha de TiltCard.jsx nesta mesma pasta): um
// brilho suave que acompanha o cursor do mouse por cima do card,
// como se uma luz estivesse passando por ele. Usado nos cartões de
// ritual/ataque/item (ver .modal-item-card e .inventory-item no
// index.css) pra dar um pouco de vida ao hover, sem exigir canvas nem
// nenhuma biblioteca nova -- só duas variáveis CSS (--spot-x/--spot-y)
// lidas por um ::before posicionado atrás do conteúdo real do card
// (ver .spotlight-card::before no index.css).
//
// Uso: <SpotlightCard className="modal-item-card ...">
//        ...conteúdo do card...
//      </SpotlightCard>
// (o className passado continua valendo normalmente pros estilos que
// já existiam do card -- .spotlight-card só adiciona o brilho por
// cima, igual o .tilt-card faz com a inclinação 3D.)
// ============================================================

import { useRef } from 'react';

export default function SpotlightCard({ children, className = '', ...rest }) {
    const elementoRef = useRef(null);

    function handleMouseMove(e) {
        if (!elementoRef.current) return;
        const rect = elementoRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        elementoRef.current.style.setProperty('--spot-x', `${x.toFixed(1)}%`);
        elementoRef.current.style.setProperty('--spot-y', `${y.toFixed(1)}%`);
    }

    return (
        <div
            ref={elementoRef}
            className={`spotlight-card ${className}`}
            onMouseMove={handleMouseMove}
            {...rest}
        >
            {children}
        </div>
    );
}
