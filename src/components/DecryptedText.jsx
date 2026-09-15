// ============================================================
// DecryptedText.jsx
//
// Efeito de "decodificação" (cicla caracteres aleatórios até revelar o
// texto real, tipo terminal de hacker) -- irmão do GlitchText.jsx, usado
// na FALHA crítica (resultado natural 1) do log de rolagens, enquanto o
// GlitchText continua cuidando do acerto crítico (20). Ver CombateTab.jsx.
//
// Diferente do componente original do React Bits (que suporta disparo
// por hover/clique/scroll-into-view, várias direções de revelação, e
// usa a biblioteca "motion" só como wrapper -- sem nenhuma animação de
// fato vinda dela, já que nenhum prop de animação é passado), essa
// versão foi bem simplificada pro nosso caso de uso específico:
//   - dispara UMA VEZ sozinha assim que aparece na tela (o log só
//     aparece quando a rolagem termina, então não faz sentido exigir
//     hover/clique pra revelar o resultado);
//   - revela sempre da esquerda pra direita (não precisa das outras
//     direções do original);
//   - não depende de nenhuma biblioteca nova -- zero dependências, só
//     React (useState/useEffect/useRef), igual o ClickSpark e o
//     GlitchText;
//   - some com a animação sozinha se o usuário pediu menos movimento
//     (prefers-reduced-motion) -- mostra o resultado final direto.
//
// Props:
//   text      -- texto/número final a revelar
//   speed     -- ms entre cada "tique" de embaralhamento (padrão 45)
//   className -- classes extra no span externo
// ============================================================

import { useEffect, useState } from 'react';

const CARACTERES = '0123456789ABCDEF!@#$%&*';

// Quantos "tiques" de embaralhamento cada caractere pisca antes de ser
// fixado -- fixo, independente do tamanho do texto. Sem isso, um
// resultado de 1 caractere só (ex: uma falha crítica "1") resolveria no
// primeiro tique (alguns ms), rápido demais pra dar pra notar qualquer
// piscada -- foi exatamente o que aconteceu antes dessa correção.
const TIQUES_POR_CARACTERE = 5;

function embaralhar(textoFinal, quantosRevelados) {
    return textoFinal
        .split('')
        .map((char, i) => {
            if (char === ' ') return ' ';
            if (i < quantosRevelados) return char;
            return CARACTERES[Math.floor(Math.random() * CARACTERES.length)];
        })
        .join('');
}

export default function DecryptedText({ text, speed = 45, className = '' }) {
    const textoFinal = String(text);
    const [exibido, setExibido] = useState(textoFinal);

    useEffect(() => {
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setExibido(textoFinal);
            return;
        }

        if (textoFinal.length === 0) {
            return;
        }

        let tique = 0;
        let reveladosAte = 0;
        setExibido(embaralhar(textoFinal, reveladosAte));

        const intervalId = setInterval(() => {
            tique += 1;
            if (tique % TIQUES_POR_CARACTERE === 0) {
                reveladosAte += 1;
            }
            if (reveladosAte >= textoFinal.length) {
                clearInterval(intervalId);
                setExibido(textoFinal);
                return;
            }
            setExibido(embaralhar(textoFinal, reveladosAte));
        }, speed);

        return () => clearInterval(intervalId);
    }, [textoFinal, speed]);

    return (
        <span className={`decrypted-text ${className}`}>
            {/* Texto real pra leitor de tela -- o span visível muda
                aleatoriamente durante a animação, então não é ele que
                deve ser anunciado. */}
            <span className="decrypted-text-sr">{textoFinal}</span>
            <span aria-hidden="true">{exibido}</span>
        </span>
    );
}
