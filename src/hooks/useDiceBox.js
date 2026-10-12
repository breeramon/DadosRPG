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
//
// ------------------------------------------------------------
// CORREÇÃO DO VAZAMENTO DE MEMÓRIA (motor 3D único, reaproveitado)
//
// Antes, cada vez que a ficha era aberta (ex: Ficha -> Meus Personagens
// -> Ficha de novo, sem recarregar a página), este hook criava uma
// DiceBox NOVA — e a antiga nunca era destruída. Cada DiceBox sobe 2
// Web Workers (um pra física Ammo/wasm e outro pro Babylon desenhar no
// OffscreenCanvas, cada um com seu próprio contexto WebGL) e registra
// um listener de "resize" na janela. Medido em teste: depois de abrir
// a ficha 7 vezes havia 14 workers vivos ao mesmo tempo. No celular,
// numa sessão longa de jogo, isso vai acumulando memória/GPU até a aba
// ficar lenta ou o navegador derrubar o WebGL.
//
// Não dá pra resolver só "destruindo ao sair": a lib (v1.1.4) não tem
// nenhum método destroy()/dispose() — os workers ficam guardados em
// campos privados dela, inacessíveis daqui, e o listener de resize
// também não é exposto. Então a solução é o oposto: criar o motor 3D
// UMA vez só por carregamento do site (variável de módulo "motor",
// logo abaixo) e REAPROVEITAR. Quando a ficha desmonta, o <canvas>
// da lib sai do DOM junto com a <div id="dice-box"> (mas continua vivo
// na memória, guardado no motor); quando uma ficha monta de novo, o
// mesmo <canvas> é simplesmente movido pra dentro da <div> nova. Os
// workers continuam os mesmos 2 de sempre, não importa quantas vezes a
// ficha seja aberta.
// ------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from 'react';
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
//
// Agora também recebe um objeto "sinal" ({ cancelado: boolean }): se a
// ficha for fechada antes do container aparecer (ex: personagem não
// encontrado, ou a pessoa clicou em "Meus Personagens" ainda no
// "Carregando..."), o efeito marca sinal.cancelado = true e o loop de
// requestAnimationFrame para — antes ele ficava rodando a cada quadro
// pra sempre, procurando uma <div> que nunca mais ia existir. Resolve
// com o elemento encontrado, ou null se foi cancelado.
function esperarContainerVisivel(seletor, sinal) {
    return new Promise(resolve => {
        function checar() {
            if (sinal.cancelado) {
                resolve(null);
                return;
            }
            const el = document.querySelector(seletor);
            const rect = el ? el.getBoundingClientRect() : null;
            if (rect && rect.width > 0 && rect.height > 0) {
                resolve(el);
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

// ---------------------------------------------------------------
// MOTOR 3D COMPARTILHADO (um só por carregamento da página)
//
// Fica FORA do hook, no nível do módulo, justamente pra sobreviver à
// desmontagem da ficha (estado de componente/useRef morre junto com o
// componente; uma variável de módulo vive enquanto a aba estiver
// aberta). Campos:
//   box     -> a instância da DiceBox (null até ser criada)
//   pronta  -> Promise<boolean>: true = animação 3D funcionando,
//              false = indisponível (sem WebGL, erro, ou estourou o
//              prazo de 15s). Criada uma vez só e reaproveitada por
//              todas as montagens seguintes da ficha.
//
// Se a inicialização estourar o prazo, a DiceBox NÃO é descartada nem
// recriada (recriar subiria mais 2 workers — exatamente o vazamento
// que esta correção tira). Ela continua guardada; se a init dela
// terminar depois, mesmo atrasada, "atrasadaMasPronta" vira true e a
// próxima vez que a ficha abrir já usa a animação 3D normalmente.
// ---------------------------------------------------------------
const motor = {
    box: null,
    pronta: null,
    atrasadaMasPronta: false,
};

const CONFIG_DICEBOX = {
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
};

// Cria a DiceBox (só na PRIMEIRA vez que alguma ficha abre) e devolve
// a promise "pronta" do motor. Chamadas seguintes devolvem a mesma
// promise, sem criar nada novo.
function iniciarMotor(seletor) {
    if (motor.pronta) return motor.pronta;

    motor.pronta = (async () => {
        try {
            const box = new DiceBox({ container: seletor, ...CONFIG_DICEBOX });
            motor.box = box;

            const initBruto = box.init();
            // Se a init terminar DEPOIS do prazo abaixo, ainda dá pra
            // aproveitar essa mesma DiceBox na próxima vez que a ficha
            // abrir (ver uso de atrasadaMasPronta no hook).
            initBruto.then(() => { motor.atrasadaMasPronta = true; }, () => {});

            // 15s (era 8s) — a primeira inicialização envolve compilar
            // shaders WebGL de verdade (Babylon.js) e carregar o wasm da
            // física (Ammo), o que pode demorar bem mais que 8s em GPUs
            // integradas mais fracas ou notebooks — 8s era rápido demais
            // e podia derrubar a animação em máquinas só um pouco mais
            // lentas, não só em quem não tem GPU nenhuma.
            const resultado = await comPrazo(initBruto, 15000);
            if (resultado === PRAZO_ESTOUROU) {
                console.warn(
                    '[dice-box] A animação 3D não terminou de carregar a tempo (15s) — ' +
                    'provavelmente sem aceleração de GPU disponível. Usando o gerador local.'
                );
                return false;
            }
            return true;
        } catch (err) {
            console.warn(
                '[dice-box] Não foi possível carregar a animação 3D dos dados. ' +
                'Os resultados continuam corretos, só ficam sem a animação visual.',
                err
            );
            return false;
        }
    })();

    return motor.pronta;
}

// Coloca o <canvas> do motor (criado na primeira ficha aberta) dentro
// da <div id="dice-box"> da ficha ATUAL. Na primeira vez ele já nasce
// lá dentro (a própria DiceBox faz o appendChild), então não faz nada;
// nas seguintes, a <div> antiga já foi removida pelo React e o canvas
// está "solto" (fora do DOM) — appendChild só move ele pro lugar novo.
// Mover um canvas que foi transferido pra OffscreenCanvas é seguro: o
// desenho continua vindo do mesmo worker de sempre.
function anexarCanvas(container) {
    const canvas = motor.box && motor.box.canvas;
    if (!canvas || !container || canvas.parentNode === container) return;
    container.appendChild(canvas);
    // A lib só recalcula o tamanho do mundo 3D quando a janela dispara
    // "resize" (listener que ela mesma registrou no init). A <div> nova
    // pode ter outro tamanho que a anterior (ex: girou o celular entre
    // uma ficha e outra), então dispara um "resize" pra ela reajustar —
    // em vez de chamar box.resizeWorld() direto, que registraria MAIS
    // um listener na janela a cada chamada (outro vazamento pequeno).
    window.dispatchEvent(new Event('resize'));
}

// containerSelector: seletor CSS do elemento onde os dados vão cair
// (ex: "#dice-box"). Devolve uma função rollDiceAnimated(notation) que
// resolve com um array de valores individuais, na ordem em que os
// dados "caíram".
export function useDiceBox(containerSelector) {
    const diceBoxRef = useRef(null);
    const readyPromiseRef = useRef(null);
    // (o antigo initStartedRef saiu: ele existia pra evitar criar duas
    // DiceBox no StrictMode do React, que roda o efeito duas vezes em
    // dev. Agora isso já é garantido pelo motor único acima — rodar o
    // efeito de novo só reaproveita o que já existe.)

    // Estado exposto pra quem usa o hook — antes o "caiu pro gerador
    // local" só aparecia num console.warn (ninguém olha o console em
    // produção), então quando a lib falhava silenciosamente pra
    // inicializar (sem GPU/WebGL disponível, timeout, exceção etc.) o
    // resultado da rolagem aparecia certinho mas nenhum dado 3D era
    // desenhado, e não tinha nenhuma pista na tela do porquê — parecia
    // bug sem dar nenhuma dica de onde olhar. null = ainda inicializando,
    // true = animação 3D ativa, false = indisponível (usando só o
    // gerador local, resultado continua correto).
    const [animacao3dPronta, setAnimacao3dPronta] = useState(null);

    // true enquanto uma rolagem está em andamento (do clique até o
    // resultado assentar). A lib @3d-dice/dice-box não foi feita pra
    // receber um .roll() novo enquanto o anterior ainda não assentou —
    // rolar de novo em cima de uma rolagem em andamento fazia a
    // promise da SEGUNDA rolagem falhar/estourar o prazo, e isso caía
    // no catch de rollDiceAnimated abaixo, que marca
    // animacao3dPronta=false PRA SEMPRE (mesmo a lib continuando
    // saudável) -- daí o aviso "animação 3D indisponível" aparecer do
    // nada, mesmo com a animação sempre voltando a funcionar depois.
    // Em vez de tentar sincronizar rolagens concorrentes dentro da
    // lib, é mais simples e mais previsível pro jogador só proibir
    // uma rolagem nova enquanto a de agora não terminou -- ver uso
    // deste valor pra desabilitar os botões de rolagem em
    // CharacterSheetPage/PericiasTable/CombateTab.
    const [rolando, setRolando] = useState(false);

    useEffect(() => {
        // Sinal de cancelamento desta montagem — vira true no cleanup
        // (ficha fechou), pra parar a espera do container e não mexer
        // em estado/canvas de uma ficha que já não está mais na tela.
        const sinal = { cancelado: false };

        readyPromiseRef.current = (async () => {
            const container = await esperarContainerVisivel(containerSelector, sinal);
            if (!container) return false; // ficha fechou antes de aparecer

            // Primeira ficha aberta: cria o motor. Fichas seguintes:
            // devolve na hora a mesma promise já resolvida.
            let ok = await iniciarMotor(containerSelector);
            // Init tinha estourado o prazo numa ficha anterior, mas
            // terminou depois — pode usar normalmente agora.
            if (!ok && motor.atrasadaMasPronta) ok = true;

            if (sinal.cancelado) return false;

            if (ok && motor.box) {
                anexarCanvas(container);
                diceBoxRef.current = motor.box;
                setAnimacao3dPronta(true);
                return true;
            }
            diceBoxRef.current = null;
            setAnimacao3dPronta(false);
            return false;
        })();

        return () => {
            sinal.cancelado = true;
            // Limpa os dados que ficaram parados na mesa da última
            // rolagem, pra próxima ficha aberta começar com a caixa
            // vazia (o canvas é o mesmo, então sem isso os dados do
            // personagem anterior apareceriam lá). Só mexe se esta
            // montagem chegou a usar o motor.
            if (diceBoxRef.current) {
                try {
                    diceBoxRef.current.clear();
                } catch {
                    // clear() falhar não pode quebrar a navegação
                }
            }
            diceBoxRef.current = null;
        };
    }, [containerSelector]);

    const rollDiceAnimated = useCallback(async (notation) => {
        const match = /^(\d+)d(\d+)$/i.exec(String(notation).trim());
        if (!match) throw new Error(`Notação de dado inválida: "${notation}"`);

        const qty = parseInt(match[1], 10);
        const sides = parseInt(match[2], 10);

        setRolando(true);
        try {
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
                setAnimacao3dPronta(false);
                return rollLocally(qty, sides);
            }
        } finally {
            setRolando(false);
        }
    }, []);

    // Troca o tema/cor dos dados sem precisar recriar a cena 3D inteira
    // (o que seria lento — recompilar shaders, recarregar a física
    // etc). A própria DiceBox já cuida de baixar e cachear os assets de
    // um tema novo na primeira vez que ele é usado (updateConfig ->
    // loadTheme). Chamado tanto quando a preferência salva termina de
    // carregar (useDicePreferences) quanto quando a pessoa confirma uma
    // troca no DiceThemeModal.
    //
    // Com o motor único, o tema escolhido fica guardado na própria
    // DiceBox entre uma ficha e outra — e a ficha nova reaplica a
    // preferência salva assim que carrega, como antes, então não muda
    // nada pro jogador.
    //
    // CUIDADO: "themeColor" só entra no objeto quando existe uma cor de
    // verdade (if abaixo) — nunca declarar a chave com valor undefined
    // (tipo "{ theme, themeColor: undefined }"). Por dentro, a DiceBox
    // faz "{ ...this.config, ...configNovo }" pra mesclar — e em
    // JavaScript, uma chave presente com valor "undefined" SOBRESCREVE
    // a anterior no spread (diferente de simplesmente omitir a chave).
    // Isso apagava a cor padrão da própria lib (this.config.themeColor
    // virava undefined de vez) e quebrava a rolagem inteira na vez
    // seguinte: a DiceBox tenta converter esse "undefined" pra RGB
    // (função interna que já assume uma string e chama ".slice(...)"
    // nela) e lança "Cannot read properties of undefined (reading
    // 'slice')" — um erro que escapa pro console sem cair no try/catch
    // daqui (acontece dentro de uma Promise "solta", sem await, lá
    // dentro da lib), então a rolagem trava e cai pro gerador local
    // depois de alguns segundos, sem nenhuma pista visível do motivo.
    // Reproduzido e confirmado: é exatamente esse o bug que fazia os
    // dados pararem de rodar (só aparecia o resultado) assim que a
    // preferência de tema/cor era aplicada pela primeira vez, mesmo pra
    // quem nunca abriu a modal de aparência.
    const updateDiceTheme = useCallback(async (theme, themeColor) => {
        if (!theme) return;
        const ready = readyPromiseRef.current ? await readyPromiseRef.current : false;
        if (!ready || !diceBoxRef.current) return; // sem animação 3D disponível, nada a fazer
        try {
            const novaConfig = { theme };
            if (themeColor) novaConfig.themeColor = themeColor;
            await diceBoxRef.current.updateConfig(novaConfig);
        } catch (err) {
            console.warn('[dice-box] Não foi possível trocar o tema/cor dos dados.', err);
        }
    }, []);

    return { rollDiceAnimated, animacao3dPronta, updateDiceTheme, rolando };
}
