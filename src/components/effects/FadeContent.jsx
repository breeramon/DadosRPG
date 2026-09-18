// ============================================================
// FadeContent.jsx
//
// Revela o conteúdo com um fade + leve deslocamento pra cima assim que
// ele entra na tela ao rolar (React Bits "Fade Content" / "Animated
// Content", reimplementado do zero em CSS + IntersectionObserver, sem
// dependência nova -- mesma linha dos outros componentes desta pasta).
// Usado na tela de boas-vindas (ver WelcomePage.jsx) pras seções abaixo
// da dobra não aparecerem todas de uma vez.
//
// Dispara só uma vez (não fica escondendo de novo ao rolar pra cima) --
// pensado pra apresentação de conteúdo, não pra um efeito repetido toda
// hora. Se prefers-reduced-motion estiver ativo, ou o navegador não
// suportar IntersectionObserver, mostra o conteúdo direto (já
// "visível" desde o primeiro render, sem nem um piscar rápido de
// opacidade 0 antes de aparecer).
//
// Uso: <FadeContent><div className="welcome-feature-card">...</div></FadeContent>
// `atraso` (ms) é opcional, pra escalonar várias instâncias em
// sequência (mesma ideia do --i do Animated List).
// ============================================================

import { useEffect, useRef, useState } from 'react';

function prefereReduzirMovimento() {
    return !!(typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

export default function FadeContent({ children, className = '', atraso = 0 }) {
    const elementoRef = useRef(null);
    const [visivel, setVisivel] = useState(() => prefereReduzirMovimento() || typeof IntersectionObserver === 'undefined');

    useEffect(() => {
        if (visivel || !elementoRef.current) return;
        const observer = new IntersectionObserver(
            ([entrada]) => {
                if (entrada.isIntersecting) {
                    setVisivel(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.15 }
        );
        observer.observe(elementoRef.current);
        return () => observer.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div
            ref={elementoRef}
            className={`fade-content${visivel ? ' fade-content-visivel' : ''}${className ? ' ' + className : ''}`}
            style={atraso ? { transitionDelay: `${atraso}ms` } : undefined}
        >
            {children}
        </div>
    );
}
