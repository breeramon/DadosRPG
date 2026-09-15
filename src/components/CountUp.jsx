// ============================================================
// CountUp.jsx
//
// Efeito de "contador" (anima suavemente de um número pro outro, em vez
// de trocar seco) -- adaptado do React Bits, usado nos valores atuais
// de Vida/PE/Sanidade na VitalsPanel.jsx: quando você causa/cura dano,
// gasta/recupera PE ou ajusta Sanidade, o número conta até o valor novo
// em vez de simplesmente trocar.
//
// Diferente do componente original do React Bits (pensado pra um
// número que aparece uma vez ao entrar na tela -- só dispara quando o
// elemento entra na viewport, via IntersectionObserver, e usa a
// biblioteca "motion" pra fazer a animação de mola), essa versão:
//   - anima toda vez que o prop "value" MUDA, não só na primeira vez
//     que aparece -- é o caso de uso daqui: o número já fica visível o
//     tempo todo, o que muda é o valor;
//   - NÃO anima na primeira renderização (senão contaria do zero toda
//     vez que a Ficha é aberta -- só reage a mudanças de verdade, feitas
//     pelos botões +/- dos vitais);
//   - usa uma curva de easing simples com requestAnimationFrame, sem
//     nenhuma dependência nova -- zero dependências, só React, igual o
//     ClickSpark/GlitchText/DecryptedText;
//   - pula a animação e mostra o valor final direto se o usuário pediu
//     menos movimento (prefers-reduced-motion).
//
// Props:
//   value     -- número atual a exibir
//   duration  -- duração da animação em ms (padrão 450 -- rápido de
//                propósito, pra não atrasar quem está jogando)
//   className -- classes extra no span
// ============================================================

import { useEffect, useRef, useState } from 'react';

function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

export default function CountUp({ value, duration = 450, className = '' }) {
    const [exibido, setExibido] = useState(value);
    const primeiraRenderRef = useRef(true);
    const frameRef = useRef(null);
    // Espelha "exibido" fora do estado, só pra ler o último valor
    // mostrado sem precisar colocar "exibido" nas deps do efeito (o que
    // faria o efeito reiniciar a cada frame da própria animação).
    const exibidoRef = useRef(value);

    useEffect(() => {
        if (primeiraRenderRef.current) {
            primeiraRenderRef.current = false;
            exibidoRef.current = value;
            setExibido(value);
            return;
        }

        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            exibidoRef.current = value;
            setExibido(value);
            return;
        }

        const valorInicial = exibidoRef.current;
        const diferenca = value - valorInicial;
        if (diferenca === 0) return;

        const inicio = performance.now();

        function tick(agora) {
            const progresso = Math.min(1, (agora - inicio) / duration);
            const novoValor = Math.round(valorInicial + diferenca * easeOutCubic(progresso));
            exibidoRef.current = novoValor;
            setExibido(novoValor);
            if (progresso < 1) {
                frameRef.current = requestAnimationFrame(tick);
            }
        }

        frameRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frameRef.current);
    }, [value, duration]);

    return <span className={className}>{exibido}</span>;
}
