export const PERICIAS_CATALOGO = [
    { nome: 'Acrobacia', atributo: 'agi' },
    { nome: 'Adestramento', atributo: 'pre', somenteTreinada: true },
    { nome: 'Artes', atributo: 'pre', somenteTreinada: true },
    { nome: 'Atletismo', atributo: 'for' },
    { nome: 'Atualidades', atributo: 'int' },
    { nome: 'Ciências', atributo: 'int', somenteTreinada: true },
    { nome: 'Crime', atributo: 'agi', somenteTreinada: true },
    { nome: 'Diplomacia', atributo: 'pre' },
    { nome: 'Enganação', atributo: 'pre' },
    { nome: 'Fortitude', atributo: 'vig' },
    { nome: 'Furtividade', atributo: 'agi' },
    { nome: 'Iniciativa', atributo: 'agi' },
    { nome: 'Intimidação', atributo: 'pre' },
    { nome: 'Intuição', atributo: 'pre' },
    { nome: 'Investigação', atributo: 'int' },
    { nome: 'Luta', atributo: 'for' },
    { nome: 'Medicina', atributo: 'int' },
    { nome: 'Ocultismo', atributo: 'int', somenteTreinada: true },
    { nome: 'Percepção', atributo: 'pre' },
    { nome: 'Pilotagem', atributo: 'agi', somenteTreinada: true },
    { nome: 'Pontaria', atributo: 'agi' },
    { nome: 'Profissão', atributo: 'int', somenteTreinada: true },
    { nome: 'Reflexos', atributo: 'agi' },
    { nome: 'Religião', atributo: 'pre' },
    { nome: 'Sobrevivência', atributo: 'int' },
    { nome: 'Tática', atributo: 'int', somenteTreinada: true },
    { nome: 'Tecnologia', atributo: 'int', somenteTreinada: true },
    { nome: 'Vontade', atributo: 'pre' },
];

// Quantas perícias "à escolha" cada trilha ganha na criação, além das
// automáticas. A fórmula real soma o Intelecto do personagem.
// Combatente e Ocultista também têm perícias automáticas (fixas ou
// escolhidas dentro de um par obrigatório).
export const TRILHA_REGRAS = {
    Combatente: {
        baseLivre: 2,
        fixasSimples: [],
        gruposFixos: [
            ['Luta', 'Pontaria'],
            ['Fortitude', 'Reflexos'],
        ],
    },
    Especialista: {
        baseLivre: 5,
        fixasSimples: [],
        gruposFixos: [],
    },
    Ocultista: {
        baseLivre: 3,
        fixasSimples: ['Ocultismo', 'Vontade'],
        gruposFixos: [],
    },
};

// Bônus fixo que cada grau de treinamento dá na rolagem.
export const GRAU_BONUS = { treinado: 5, veterano: 10, expert: 15 };
export const GRAU_ORDEM = ['treinado', 'veterano', 'expert'];
export const GRAU_LABEL = { treinado: 'Treinado', veterano: 'Veterano', expert: 'Expert' };

// NEX mínimo pra poder elevar uma perícia treinada a cada grau.
export const GRAU_NEX_MIN = { treinado: 5, veterano: 35, expert: 70 };

// Círculos de ritual do Ocultista e o NEX mínimo de cada um. (Não há
// lista de rituais no app ainda — isso é só informativo, pra mostrar
// até que círculo o personagem já tem acesso.)
export const CIRCULOS_RITUAL = [
    { circulo: 1, nexMinimo: 5 },
    { circulo: 2, nexMinimo: 25 },
    { circulo: 3, nexMinimo: 55 },
    { circulo: 4, nexMinimo: 85 },
];

export const ATRIBUTOS_NEX_MARCOS = [20, 50, 80, 95];
export const ATRIBUTOS_BASE = { total: 9, maxPorAtributo: 3, minPorAtributo: 0 };
export const ATRIBUTOS_TETO_ABSOLUTO = 5; // nenhum atributo passa disso por essa conta

export function pontosAtributoPorNex(nex) {
    const n = clampNex(nex);
    const marcosAtingidos = ATRIBUTOS_NEX_MARCOS.filter(m => n >= m).length;
    return {
        total: ATRIBUTOS_BASE.total + marcosAtingidos,
        maxPorAtributo: Math.min(ATRIBUTOS_TETO_ABSOLUTO, ATRIBUTOS_BASE.maxPorAtributo + marcosAtingidos),
        minPorAtributo: ATRIBUTOS_BASE.minPorAtributo,
        // true = NEX acima de 5%, usando a extensão não-oficial acima
        extrapolado: marcosAtingidos > 0,
    };
}

export const RECURSOS = {
    Combatente: { pvInicial: 20, pvIncremento: 4, detInicial: 2, detIncremento: 2, sanInicial: 12, sanIncremento: 3 },
    Especialista: { pvInicial: 16, pvIncremento: 3, detInicial: 3, detIncremento: 3, sanInicial: 16, sanIncremento: 4 },
    Ocultista: { pvInicial: 12, pvIncremento: 2, detInicial: 4, detIncremento: 4, sanInicial: 20, sanIncremento: 5 },
};

export function passosDeNex(nex) {
    return Math.max(0, Math.round((clampNex(nex) - 5) / 5));
}

export function vidaMaxima(trilha, vigor, nex) {
    const r = RECURSOS[trilha] || RECURSOS.Combatente;
    const vig = Number(vigor) || 0;
    const passos = passosDeNex(nex);
    return (r.pvInicial + vig) + passos * (r.pvIncremento + vig);
}

export function determinacaoMaxima(trilha, presenca, nex) {
    const r = RECURSOS[trilha] || RECURSOS.Combatente;
    const pre = Number(presenca) || 0;
    const passos = passosDeNex(nex);
    return (r.detInicial + pre) + passos * (r.detIncremento + pre);
}

export function sanidadeMaxima(trilha, nex) {
    const r = RECURSOS[trilha] || RECURSOS.Combatente;
    const passos = passosDeNex(nex);
    return r.sanInicial + passos * r.sanIncremento;
}

// Quantos PE o personagem pode gastar POR RODADA, de acordo com o NEX
export function peRodadaPorNex(nex) {
    return Math.round(clampNex(nex) / 5);
}

// Defesa = 10 + Agilidade + bônus de equipamento/armadura + outros
// bônus (talentos, condições) — a classe não entra direto na conta.
export function defesaTotal(agilidade, bonusEquipamento, bonusOutros) {
    return 10 + (Number(agilidade) || 0) + (Number(bonusEquipamento) || 0) + (Number(bonusOutros) || 0);
}

export function clampNex(valor) {
    let n = parseInt(valor, 10);
    if (Number.isNaN(n)) n = 5;
    n = Math.round(n / 5) * 5;
    if (n < 5) n = 5;
    if (n > 99) n = 99;
    return n;
}

export function grauMaximoPorNex(nex) {
    if (nex >= GRAU_NEX_MIN.expert) return 'expert';
    if (nex >= GRAU_NEX_MIN.veterano) return 'veterano';
    return 'treinado';
}

// Lista de graus que já estão liberados nesse NEX (ex: NEX 40 ->
// ['treinado', 'veterano']), na ordem em que foram liberados.
export function grausPermitidos(nex) {
    const max = grauMaximoPorNex(nex);
    const idx = GRAU_ORDEM.indexOf(max);
    return GRAU_ORDEM.slice(0, idx + 1);
}

export function quotaPericiasLivres(trilha, intelecto) {
    const regra = TRILHA_REGRAS[trilha] || TRILHA_REGRAS.Combatente;
    return Math.max(0, regra.baseLivre + (Number(intelecto) || 0));
}

// Devolve o círculo de ritual mais alto já liberado nesse NEX (0 =
// nenhum). Só faz sentido pra trilha Ocultista.
export function circuloRitualLiberado(nex) {
    let liberado = 0;
    CIRCULOS_RITUAL.forEach(c => {
        if (nex >= c.nexMinimo) liberado = c.circulo;
    });
    return liberado;
}

// Tenta descobrir o grau de uma perícia salva no formato antigo (só
// tinha um "bonus" numérico, sem o campo "grau"), pra manter
// compatibilidade com personagens criados antes dessa função.
export function grauApartirDoBonus(bonus) {
    const n = Number(bonus) || 0;
    if (n >= GRAU_BONUS.expert) return 'expert';
    if (n >= GRAU_BONUS.veterano) return 'veterano';
    return 'treinado';
}
