// ============================================================
// useLockBodyScroll.js
//
// Trava o scroll da página (document.body) enquanto uma modal estiver
// aberta — antes disso dava pra rolar o conteúdo por trás da modal
// mesmo com ela aberta por cima, o que também deixava mais fácil
// perder de vista que tinha uma modal aberta.
//
// Contador em nível de módulo (em vez de um simples "true/false") pra
// aguentar duas modais "abertas" ao mesmo tempo sem bug: se isso
// acontecer, o scroll só volta quando a ÚLTIMA delas fechar, não a
// primeira. Casos assim não deveriam rolar hoje em dia (cada tela só
// abre uma modal por vez), mas é uma rede de segurança barata contra
// qualquer combinação futura de modais.
// ============================================================

import { useEffect } from 'react';

let contadorModaisAbertas = 0;
let overflowOriginalDoBody = null;

export function useLockBodyScroll(travado) {
    useEffect(() => {
        if (!travado) return undefined;

        if (contadorModaisAbertas === 0) {
            overflowOriginalDoBody = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
        }
        contadorModaisAbertas += 1;

        return () => {
            contadorModaisAbertas -= 1;
            if (contadorModaisAbertas === 0) {
                document.body.style.overflow = overflowOriginalDoBody || '';
            }
        };
    }, [travado]);
}
