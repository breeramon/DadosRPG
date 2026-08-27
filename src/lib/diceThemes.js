// ============================================================
// diceThemes.js
//
// Catálogo dos temas visuais disponíveis pra animação 3D dos dados
// (ver useDiceBox.js) — cada um vem de um pacote separado
// (@3d-dice/theme-*, ver scripts/copy-dice-themes.mjs) com seus
// próprios modelos/texturas em public/assets/themes/<id>/.
//
// "corAtiva: true" indica que o material do tema é do tipo "color" (a
// textura é neutra/cinza e recebe uma cor por cima, via o parâmetro
// "themeColor" da DiceBox) — só esses aceitam a paleta de cores do
// DiceThemeModal. O "Dice of Rolling" é do tipo "standard" (textura já
// vem colorida/pintada de fábrica), então "themeColor" não faz nada
// nele — por isso "corAtiva: false".
//
// "corPadrao" é só a cor inicial sugerida quando a pessoa nunca
// escolheu nada pra aquele tema (usada só dentro do DiceThemeModal, pra
// pré-selecionar uma sugestão sensata) — não é aplicada sozinha; a
// aparência atual (sem nenhuma preferência salva) continua sendo a cor
// padrão da própria biblioteca, pra não mudar a experiência de quem
// nunca abriu essa configuração.
// ============================================================

export const TEMAS_DADOS = [
    {
        id: 'default',
        nome: 'Padrão',
        descricao: 'O dado que a ficha sempre usou — liso, com cor customizável.',
        corAtiva: true,
        corPadrao: '#7b1fa2',
    },
    {
        id: 'rust',
        nome: 'Rust',
        descricao: 'Textura enferrujada/metálica, com cor customizável.',
        corAtiva: true,
        corPadrao: '#aa4f4a',
    },
    {
        id: 'diceOfRolling',
        nome: 'Dice of Rolling',
        descricao: 'Réplica dos dados físicos "Dice of Rolling" — vem com cores fixas de fábrica.',
        corAtiva: false,
        corPadrao: null,
    },
    {
        id: 'gemstone',
        nome: 'Gemstone',
        descricao: 'Formato facetado, como uma pedra preciosa — cor customizável.',
        corAtiva: true,
        corPadrao: '#0f9d58',
    },
];

// Paleta compartilhada entre os temas "colorAtiva" — a pessoa também
// pode escolher qualquer cor fora dessa lista pelo seletor nativo.
export const PALETA_CORES_DADOS = [
    { nome: 'Roxo', hex: '#7b1fa2' },
    { nome: 'Verde', hex: '#2e8555' },
    { nome: 'Esmeralda', hex: '#0f9d58' },
    { nome: 'Vermelho', hex: '#aa4f4a' },
    { nome: 'Azul', hex: '#3a5ba0' },
    { nome: 'Dourado', hex: '#b8912f' },
    { nome: 'Branco', hex: '#d9d9d9' },
];

export function temaPorId(id) {
    return TEMAS_DADOS.find(t => t.id === id) || TEMAS_DADOS[0];
}
