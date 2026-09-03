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
