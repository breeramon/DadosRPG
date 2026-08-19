// ============================================================
// useDiceBox.js
//
// Porta de javascript/dice-animation.js (versão vanilla) pra hook
// React. Mesma ideia: usa a lib @3d-dice/dice-box (física 3D via
// Babylon.js) pra animar os dados, e devolve os valores de cada dado
// individual — se a lib não conseguir inicializar por qualquer motivo,
// cai automaticamente pra um gerador local (Math.random), sem quebrar
// a ficha.
//
// Diferença da versão vanilla: em vez de carregar a lib via CDN em
// tempo de execução (import() de uma URL do jsdelivr), agora ela é um
// pacote npm de verdade, empacotado pelo Vite — mais robusto (não
// depende do CDN estar no ar) e consistente com o resto da migração
// (Firebase também virou pacote npm). Os assets binários da lib
// (modelos/texturas dos dados, ~600KB) são copiados pra public/assets/
// automaticamente por um script "postinstall" que a própria lib roda
// depois de "npm install" (ver README) — arquivos estáticos que o
// dice-box carrega sozinho em tempo de execução via fetch, não algo
// que o bundler do Vite consiga "ver" dentro de um import() comum.
//
// A lib é imperativa (cria um <canvas> dentro do container e desenha
// direto nele) — por isso o wrapper com useRef+useEffect: React só
// cuida de montar a <div id="dice-box"> (ver CharacterSheetPage), a
// própria lib toma conta do que acontece dentro dela.
// ============================================================

import { useCallback, useEffect, useRef } from 'react';
import DiceBox from '@3d-dice/dice-box';

// #dice-box só existe no DOM (e só ganha um tamanho real na tela)
// quando a ficha termina de carregar e troca a tela de "Carregando..."
// pelo conteúdo de verdade — o efeito deste hook começa a rodar ANTES
// disso (no primeiro render da página, ainda em "Carregando..."), então
// não dá pra pegar o elemento uma única vez com document.querySelector
// e torcer: nesse momento ele nem existe. Por isso recebe o SELETOR (não
// o elemento) e re-consulta o DOM a cada quadro, até o elemento existir
// E medir largura/altura reais. Sem isso — inicializando a DiceBox
// (Babylon + física) com o container ainda 0x0 ou ausente — o mundo
// físico nasce com limites degenerados: os dados nunca "assentam" de
// verdade e a lib acaba devolvendo sempre 0 depois de vários segundos.
function esperarContainerVisivel(seletor) {
    return new Promise(resolve => {
        function checar() {
            const el = document.querySelector(seletor);
            const rect = el ? el.getBoundingClientRect() : null;
            if (rect && rect.width > 0 && rect.height > 0) {
                resolve();
            } else {
                requestAnimationFrame(checar);
            }
        }
        checar();
    });
}

function fallbackRoll(sides) {
    return Math.floor(Math.random() * sides) + 1;
}

function rollLocally(qty, sides) {
    const values = [];
    for (let i = 0; i < qty; i++) values.push(fallbackRoll(sides));
    return values;
}

// Sentinela pra distinguir "estourou o prazo" de uma resolução legítima
// com valor undefined/false (box.init() não garante devolver `true`).
const PRAZO_ESTOUROU = Symbol('prazo-estourou');

// Corre uma promise contra um prazo — se `promise` não resolver (nem
// rejeitar) a tempo, devolve PRAZO_ESTOUROU em vez de travar pra
// sempre. Existe porque box.init()/box.roll() dependem de WebGL de
// verdade (Babylon.js); numa máquina sem aceleração de GPU (ou um
// navegador headless sem GPU, como em alguns ambientes de teste
// automatizado) a promise pode nunca resolver NEM rejeitar — sem esse
// prazo, o botão de rolar ficaria girando pra sempre, sem cair pro
// gerador local.
function comPrazo(promise, ms) {
    return new Promise(resolve => {
        const timer = setTimeout(() => resolve(PRAZO_ESTOUROU), ms);
        promise.then(
            v => { clearTimeout(timer); resolve(v); },
            () => { clearTimeout(timer); resolve(PRAZO_ESTOUROU); }
        );
    });
}

// containerSelector: seletor CSS do elemento onde os dados vão cair
// (ex: "#dice-box"). Devolve uma função rollDiceAnimated(notation) que
// resolve com um array de valores individuais, na ordem em que os
// dados "caíram".
export function useDiceBox(containerSelector) {
    const diceBoxRef = useRef(null);
    const readyPromiseRef = useRef(null);
    const initStartedRef = useRef(false);

    useEffect(() => {
        // Guarda contra o StrictMode do React (dev) rodando o efeito duas
        // vezes na mesma montagem — sem isso, criaríamos dois canvases 3D
        // sobrepostos e desperdiçaríamos a inicialização.
        if (initStartedRef.current) return;
        initStartedRef.current = true;

        readyPromiseRef.current = (async () => {
            try {
                await esperarContainerVisivel(containerSelector);

                const box = new DiceBox({
                    container: containerSelector,
                    // O pacote @3d-dice/dice-box copia sozinho seus assets
                    // (modelos/texturas dos dados) pra public/assets/ via um
                    // script "postinstall" que roda automaticamente depois de
                    // "npm install" (ver README) — esse caminho é o padrão que
                    // esse script usa, então não precisa configurar nada extra.
                    assetPath: '/assets/',
                    theme: 'default',
                    // Caixa no canto da tela — dados e força de arremesso/giro
                    // calibrados pro tamanho dela (ver #dice-box no CSS).
                    scale: 5,
                    gravity: 1,
                    throwForce: 4,
                    spinForce: 4,
                    startingHeight: 6,
                    settleTimeout: 6000,
                });

                const resultado = await comPrazo(box.init(), 8000);
                if (resultado === PRAZO_ESTOUROU) {
                    console.warn(
                        '[dice-box] A animação 3D não terminou de carregar a tempo (8s) — ' +
                        'provavelmente sem aceleração de GPU disponível. Usando o gerador local.'
                    );
                    diceBoxRef.current = null;
                    return false;
                }
                diceBoxRef.current = box;
                return true;
            } catch (err) {
                console.warn(
                    '[dice-box] Não foi possível carregar a animação 3D dos dados. ' +
                    'Os resultados continuam corretos, só ficam sem a animação visual.',
                    err
                );
                diceBoxRef.current = null;
                return false;
            }
        })();
    }, [containerSelector]);

    const rollDiceAnimated = useCallback(async (notation) => {
        const match = /^(\d+)d(\d+)$/i.exec(String(notation).trim());
        if (!match) throw new Error(`Notação de dado inválida: "${notation}"`);

        const qty = parseInt(match[1], 10);
        const sides = parseInt(match[2], 10);

        const ready = readyPromiseRef.current ? await readyPromiseRef.current : false;
        if (!ready || !diceBoxRef.current) {
            return rollLocally(qty, sides);
        }

        try {
            // Prazo um pouco maior que o settleTimeout (6s) configurado na
            // DiceBox acima — essa lib já tem seu próprio timeout interno
            // pra quando os dados "não assentam", isso aqui é só uma rede
            // de segurança extra caso a promise nem isso respeite.
            const results = await comPrazo(diceBoxRef.current.roll(notation), 8000);
            if (results === PRAZO_ESTOUROU) {
                throw new Error('A rolagem animada não respondeu a tempo.');
            }
            const values = results.map(r => r.value);
            if (values.length !== qty || values.some(v => typeof v !== 'number' || Number.isNaN(v))) {
                throw new Error('Formato de resultado inesperado retornado pela dice-box.');
            }
            return values;
        } catch (err) {
            console.warn('[dice-box] Falha ao animar a rolagem, usando gerador local.', err);
            return rollLocally(qty, sides);
        }
    }, []);

    return rollDiceAnimated;
}
