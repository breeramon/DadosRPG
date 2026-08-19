// ============================================================
// dice-animation.js
// Responsável apenas pela ANIMAÇÃO 3D dos dados na tela.
// Usa a biblioteca @3d-dice/dice-box (carregada via CDN, sem
// precisar de npm/bundler) e expõe uma única função global:
//
//   window.rollDiceAnimated("3d20") -> Promise<number[]>
//
// que devolve o valor de cada dado individual, na mesma ordem
// que seriam gerados por Math.random(). Toda a lógica de
// vantagem/desvantagem, bônus, soma etc. continua em script.js,
// exatamente como já funcionava — este módulo só troca a origem
// dos números (e mostra a animação) e, se a lib não conseguir
// carregar (ex: sem internet), cai automaticamente para um
// gerador local, sem quebrar a ficha.
// ============================================================

const DICE_BOX_VERSION = '1.1.4';
const CDN_BASE = `https://cdn.jsdelivr.net/npm/@3d-dice/dice-box@${DICE_BOX_VERSION}/dist/`;

let diceBox = null;

async function setupDiceBox() {
    try {
        const { default: DiceBox } = await import(/* webpackIgnore: true */ `${CDN_BASE}dice-box.es.min.js`);

        const box = new DiceBox({
            container: '#dice-box',
            // assetPath já é uma URL absoluta (CDN); zera o "origin" que a lib
            // colaria na frente, senão ela monta uma URL quebrada.
            origin: '',
            assetPath: `${CDN_BASE}assets/`,
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

        await box.init();
        diceBox = box;
        return true;
    } catch (err) {
        console.warn(
            '[dice-animation] Não foi possível carregar a animação 3D dos dados ' +
            '(sem internet ou CDN bloqueado). Os resultados continuam corretos, ' +
            'só ficam sem a animação visual.',
            err
        );
        diceBox = null;
        return false;
    }
}

// Inicia o carregamento assim que o módulo é importado (não bloqueia a página).
const readyPromise = setupDiceBox();

// Gerador local — mesmo algoritmo que o script.js já usava, usado como
// fallback quando a animação não está disponível.
function fallbackRoll(sides) {
    return Math.floor(Math.random() * sides) + 1;
}

function rollLocally(qty, sides) {
    const values = [];
    for (let i = 0; i < qty; i++) values.push(fallbackRoll(sides));
    return values;
}

/**
 * Rola `notation` (ex: "3d20", "1d100", "2d6") mostrando a animação 3D
 * quando disponível, e devolve uma Promise com o array de valores de
 * cada dado individual, na ordem em que "caíram".
 */
window.rollDiceAnimated = async function rollDiceAnimated(notation) {
    const match = /^(\d+)d(\d+)$/i.exec(String(notation).trim());
    if (!match) throw new Error(`Notação de dado inválida: "${notation}"`);

    const qty = parseInt(match[1], 10);
    const sides = parseInt(match[2], 10);

    const ready = await readyPromise;
    if (!ready || !diceBox) {
        return rollLocally(qty, sides);
    }

    try {
        // roll() resolve com um array plano de dados individuais, cada um
        // já com o campo `value` (o número que caiu naquele dado).
        const results = await diceBox.roll(notation);
        const values = results.map(r => r.value);

        if (values.length !== qty || values.some(v => typeof v !== 'number' || Number.isNaN(v))) {
            throw new Error('Formato de resultado inesperado retornado pela dice-box.');
        }
        return values;
    } catch (err) {
        console.warn('[dice-animation] Falha ao animar a rolagem, usando gerador local.', err);
        return rollLocally(qty, sides);
    }
};

// Utilitário opcional: limpa os dados da tela manualmente.
window.clearDiceAnimation = function clearDiceAnimation() {
    if (diceBox) diceBox.clear();
};
