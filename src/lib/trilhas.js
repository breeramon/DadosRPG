// ============================================================
// trilhas.js
//
// Poderes de Trilha (Combatente/Especialista/Ocultista) — o
// equivalente pra Trilha do que origens.js já é pra Origem. Cada
// classe tem sua própria Tabela de progressão (1.3/1.4/1.5) com uma
// lista de "Poderes de <Trilha>" à escolha do jogador em certos NEX,
// e (pro Combatente e Especialista) um segundo nível de escolha: uma
// "trilha secundária" (ex: Aniquilador, Guerreiro...) com 4 poderes
// próprios liberados em NEX 10/40/65/99.
//
// STATUS: só o Combatente está preenchido por enquanto — Especialista
// e Ocultista ficam como próximo passo, quando o usuário mandar as
// páginas correspondentes (28-31 e 32-35).
//
// CONFIANÇA: Combatente transcrito direto das páginas 24-27 do livro
// de regras (imagens enviadas pelo usuário nesta conversa) —
// confiança alta. Os glifos de dado do livro (penalidade/bônus em
// dado nos testes, ex: "-🎲") foram transcritos como texto
// "(penalidade de 1 dado)" pra evitar depender de um glifo que pode
// não renderizar em toda fonte/dispositivo.

import { passosDeNex } from './pericias';

// --- Ataque Especial (Tabela 1.3) ---------------------------------
// "Quando faz um ataque, você pode gastar 2 PE para receber +5 no
// teste de ataque ou na rolagem de dano. Conforme avança de NEX, você
// pode gastar +1 PE para receber mais bônus de +5." — é o único item
// da Tabela 1.3 que é 100% determinístico a partir do NEX (sem
// escolha do jogador nem depender de trilha secundária), por isso é o
// primeiro efeito "número limpo" desta leva.
export const ATAQUE_ESPECIAL_COMBATENTE = [
    { nex: 5, pe: 2, bonus: 5 },
    { nex: 25, pe: 3, bonus: 10 },
    { nex: 55, pe: 4, bonus: 15 },
    { nex: 85, pe: 5, bonus: 20 },
];

// Maior tier de Ataque Especial já liberado no NEX atual (o jogador
// pode gastar QUALQUER PE até esse teto — não precisa gastar tudo de
// uma vez; a tabela só define o máximo). Retorna null se nex < 5, o
// que não deveria acontecer já que clampNex trava o mínimo em 5%.
export function ataqueEspecialMaximo(nex) {
    const n = Number(nex) || 0;
    let atual = null;
    for (const tier of ATAQUE_ESPECIAL_COMBATENTE) {
        if (n >= tier.nex) atual = tier;
    }
    return atual;
}

// --- Poder de Combatente (Tabela 1.3) ------------------------------
// NEX 15%, 30%, 45%, 60%, 75%, 90% — 6 slots ao longo da progressão,
// cada um escolhendo 1 poder da lista abaixo (pode repetir Transcender
// e Treinamento em Perícia, os únicos marcados como reescolhíveis no
// livro).
export const PODER_COMBATENTE_MARCOS = [15, 30, 45, 60, 75, 90];

// Quantos slots de Poder de Combatente já estão liberados no NEX
// atual (0 a 6).
export function slotsPoderCombatenteLiberados(nex) {
    const n = Number(nex) || 0;
    return PODER_COMBATENTE_MARCOS.filter(m => n >= m).length;
}

export const PODERES_COMBATENTE = [
    { nome: 'Armamento Pesado', descricao: 'Você recebe proficiência com armas pesadas.', preRequisito: 'For 2' },
    { nome: 'Artista Marcial', descricao: 'Seus ataques desarmados causam 1d6 pontos de dano, podem causar dano letal e contam como armas ágeis. Em NEX 35%, o dano aumenta para 1d8 e, em NEX 70%, para 1d10.', preRequisito: null },
    { nome: 'Ataque de Oportunidade', descricao: 'Sempre que um ser sair voluntariamente de um espaço adjacente ao seu, você pode gastar uma reação e 1 PE para fazer um ataque corpo a corpo contra ele.', preRequisito: null },
    { nome: 'Combater com Duas Armas', descricao: 'Se estiver empunhando duas armas (e pelo menos uma for leve) e fizer a ação agredir, você pode fazer dois ataques, um com cada arma. Se fizer isso, sofre penalidade de 1 dado em todos os testes de ataque até o seu próximo turno.', preRequisito: 'Agi 3, treinado em Luta ou Pontaria' },
    { nome: 'Combate Defensivo', descricao: 'Quando usa a ação agredir, você pode combater defensivamente. Se fizer isso, até seu próximo turno, sofre penalidade de 1 dado em todos os testes de ataque, mas recebe +5 na Defesa.', preRequisito: 'Int 2' },
    { nome: 'Golpe Demolidor', descricao: 'Quando usa a manobra quebrar ou ataca um objeto, você pode gastar 1 PE para causar dois dados de dano extra do mesmo tipo de sua arma.', preRequisito: 'For 2, treinado em Luta' },
    { nome: 'Golpe Pesado', descricao: 'O dano de suas armas corpo a corpo aumenta em mais um dado do mesmo tipo.', preRequisito: null },
    { nome: 'Incansável', descricao: 'Uma vez por cena, você pode gastar 2 PE para fazer uma ação de investigação adicional, mas deve usar Força ou Agilidade como atributo-base do teste.', preRequisito: null },
    { nome: 'Presteza Atlética', descricao: 'Quando faz um teste de facilitar a investigação, você pode gastar 1 PE para usar Força ou Agilidade no lugar do atributo-base da perícia. Se passar no teste, o próximo aliado que usar seu bônus também recebe bônus de 1 dado no teste.', preRequisito: null },
    { nome: 'Proteção Pesada', descricao: 'Você recebe proficiência com Proteções Pesadas.', preRequisito: 'NEX 30%' },
    { nome: 'Reflexos Defensivos', descricao: 'Você recebe +2 em Defesa e em testes de resistência.', preRequisito: 'Agi 2' },
    { nome: 'Saque Rápido', descricao: 'Você pode sacar ou guardar itens como uma ação livre (em vez de ação de movimento). Além disso, caso esteja usando a regra opcional de contagem de munição, uma vez por rodada pode recarregar uma arma de disparo como uma ação livre.', preRequisito: 'Treinado em Iniciativa' },
    { nome: 'Segurar o Gatilho', descricao: 'Sempre que acerta um ataque com uma arma de fogo, pode fazer outro ataque com a mesma arma contra o mesmo alvo, pagando 2 PE por cada ataque já realizado no turno (2 PE no primeiro extra, +4 PE no segundo, e assim por diante), até errar um ataque ou atingir o limite de PE por rodada.', preRequisito: 'NEX 60%' },
    { nome: 'Sentido Tático', descricao: 'Você pode gastar uma ação de movimento e 2 PE para analisar o ambiente. Se fizer isso, recebe um bônus em Defesa e em testes de resistência igual ao seu Intelecto até o final da cena.', preRequisito: 'Int 2, treinado em Percepção e Tática' },
    { nome: 'Tanque de Guerra', descricao: 'Se estiver usando uma proteção pesada, a Defesa e a resistência a dano que ela fornece aumentam em +2.', preRequisito: 'Proteção Pesada' },
    { nome: 'Tiro Certeiro', descricao: 'Você soma sua Agilidade nas rolagens de dano com armas de disparo e ignora a penalidade contra alvos envolvidos em combate corpo a corpo (mesmo se não usar a ação mirar).', preRequisito: 'Treinado em Pontaria' },
    { nome: 'Tiro de Cobertura', descricao: 'Você pode gastar uma ação padrão e 1 PE para disparar uma arma de fogo na direção de um personagem no alcance da arma para forçá-lo a se proteger. Faça um teste de Pontaria contra a Vontade do alvo. Se vencer, até o início do seu próximo turno o alvo não pode sair do lugar onde está e sofre −5 em testes de ataque.', preRequisito: null },
    { nome: 'Transcender', descricao: 'Escolha um poder paranormal (p.114). Você recebe o poder escolhido, mas não ganha Sanidade neste aumento de NEX. Pode escolher este poder várias vezes.', preRequisito: null },
    { nome: 'Treinamento em Perícia', descricao: 'Escolha duas perícias e se torne treinado nelas. A partir de NEX 35%, pode escolher perícias nas quais já é treinado pra se tornar veterano; a partir de NEX 70%, perícias veteranas pra se tornar expert. Pode escolher este poder várias vezes.', preRequisito: null },
];

// --- Trilhas de Combatente (p.26-27) -------------------------------
// Escolhida via "Habilidade de Trilha" em NEX 10%; o 2º/3º/4º poder
// da trilha escolhida vem em NEX 40%, 65% e 99%.
//
// "Versatilidade" (NEX 50%, ver Tabela 1.3) deixa escolher entre um
// Poder de Combatente extra OU o 1º poder de uma trilha DIFERENTE da
// principal — o app só rastreia a trilha principal por enquanto (um
// campo, uma escolha); a opção de pegar uma segunda trilha via
// Versatilidade fica só descrita como texto, sem um segundo seletor
// próprio nesta primeira versão.
export const TRILHAS_COMBATENTE = [
    {
        nome: 'Aniquilador',
        descricao: 'Você é treinado para abater alvos com eficiência e velocidade. Suas armas são suas melhores amigas e você cuida tão bem delas quanto de seus companheiros de equipe. Talvez até melhor.',
        poderes: [
            { nex: 10, nome: 'A Favorita', descricao: 'Escolha uma arma para ser sua favorita, como katana ou fuzil de assalto. A categoria da arma escolhida é reduzida em I.' },
            { nex: 40, nome: 'Técnica Secreta', descricao: 'A categoria da arma favorita passa a ser reduzida em II. Quando faz um ataque com ela, pode gastar 2 PE para executar um dos efeitos abaixo (mais efeitos gastando +2 PE cada): Amplo (o ataque atinge um alvo adicional em seu alcance e adjacente ao original, mesmo teste de ataque pra ambos); Destruidor (aumenta o multiplicador de crítico da arma em +1).' },
            { nex: 65, nome: 'Técnica Sublime', descricao: 'Adiciona os seguintes efeitos à lista de sua Técnica Secreta: Letal (aumenta a margem de ameaça em +2; pode escolher duas vezes, virando +5); Perfurante (ignora até 5 pontos de resistência a dano de qualquer tipo do alvo).' },
            { nex: 99, nome: 'Máquina de Matar', descricao: 'A categoria da arma favorita passa a ser reduzida em III, ela recebe +2 na margem de ameaça e seu dano aumenta em um dado do mesmo tipo.' },
        ],
    },
    {
        nome: 'Comandante de Campo',
        descricao: 'Sem um oficial uma batalha não passa de uma briga de bar. Você é treinado para coordenar e auxiliar seus companheiros em combate, tomando decisões rápidas e tirando melhor proveito da situação e do talento de seus aliados.',
        poderes: [
            { nex: 10, nome: 'Inspirar Confiança', descricao: 'Sua liderança inspira seus aliados. Você pode gastar uma reação e 2 PE para fazer um aliado em alcance curto rolar novamente um teste recém realizado.' },
            { nex: 40, nome: 'Estrategista', descricao: 'Você pode direcionar aliados em alcance curto. Gaste uma ação padrão e 1 PE por aliado que quiser direcionar (limitado pelo seu Intelecto); no próximo turno deles, ganham uma ação de movimento adicional. O alcance de Inspirar Confiança e Estrategista aumenta para médio.' },
            { nex: 65, nome: 'Brecha na Guarda', descricao: 'Uma vez por rodada, quando um aliado causar dano em um inimigo em seu alcance curto, você pode gastar uma reação e 2 PE para que você ou outro aliado em alcance curto faça um ataque adicional contra o mesmo inimigo.' },
            { nex: 99, nome: 'Oficial Comandante', descricao: 'Você pode gastar uma ação padrão e 5 PE para que cada aliado que você possa ver em alcance médio receba uma ação padrão adicional no próximo turno dele.' },
        ],
    },
    {
        nome: 'Operações Especiais',
        descricao: 'Você é um combatente eficaz. Suas ações são calculadas e otimizadas, sempre antevendo os movimentos inimigos e se posicionando da maneira mais inteligente no campo de batalha.',
        poderes: [
            { nex: 10, nome: 'Iniciativa Aprimorada', descricao: 'Você recebe +5 em Iniciativa e uma ação de movimento adicional na primeira rodada.' },
            { nex: 40, nome: 'Ataque Extra', descricao: 'Uma vez por rodada, quando faz um ataque, você pode gastar 2 PE para fazer um ataque adicional.' },
            { nex: 65, nome: 'Surto de Adrenalina', descricao: 'Uma vez por rodada, você pode gastar 5 PE para realizar uma ação padrão ou de movimento adicional.' },
            { nex: 99, nome: 'Sempre Alerta', descricao: 'Você recebe uma ação padrão adicional no início de cada cena de combate.' },
        ],
    },
    {
        nome: 'Guerreiro',
        descricao: 'Você treinou sua musculatura e movimentos a ponto de transformar seu corpo em uma verdadeira arma. Com golpes corpo a corpo tão poderosos quanto uma bala, você enfrenta inimigos sem medo.',
        poderes: [
            { nex: 10, nome: 'Técnica Letal', descricao: 'Você recebe um aumento de +2 na margem de ameaça com todos os seus ataques corpo a corpo.' },
            { nex: 40, nome: 'Revidar', descricao: 'Sempre que bloquear um ataque, você pode gastar uma reação e 2 PE para fazer um ataque corpo a corpo no inimigo que o atacou.' },
            { nex: 65, nome: 'Força Opressora', descricao: 'Quando acerta um ataque corpo a corpo, pode gastar 1 PE para realizar uma manobra derrubar ou empurrar contra o alvo como ação livre. Empurrar dá +5 de bônus a cada 10 pontos de dano causado; derrubar (se vencer o teste oposto) dá +2 na margem de ameaça e mais um dado de dano do mesmo tipo.' },
            { nex: 99, nome: 'Potência Máxima', descricao: 'Quando usa seu Ataque Especial com armas corpo a corpo, todos os bônus numéricos são dobrados (ex: 5 PE por +5 no ataque e +15 no dano vira +10 no ataque e +30 no dano).' },
        ],
    },
    {
        nome: 'Tropa de Choque',
        descricao: 'Você é duro na queda. Treinou seu corpo para resistir a traumas físicos, tornando-o praticamente inquebrável, e por isso não teme se colocar entre seus aliados e o perigo.',
        poderes: [
            { nex: 10, nome: 'Casca Grossa', descricao: 'Você recebe +1 PV para cada 5% de NEX e, quando faz um bloqueio, soma seu Vigor na resistência a dano recebida.' },
            { nex: 40, nome: 'Cai Dentro', descricao: 'Sempre que um oponente em alcance curto ataca um de seus aliados, pode gastar uma reação e 1 PE para forçar um teste de Vontade (DT Vig) nesse oponente; se falhar, ele deve atacar você em vez do aliado. Só funciona se você puder ser efetivamente atacado. Um oponente que passe no teste fica imune a este poder até o final da cena.' },
            { nex: 65, nome: 'Duro de Matar', descricao: 'Ao sofrer dano paranormal, pode gastar uma reação e 2 PE para reduzir esse dano à metade. Em NEX 85%, pode usar esta habilidade pra reduzir dano paranormal contra o alvo caído.' },
            { nex: 99, nome: 'Inquebrável', descricao: 'Enquanto estiver machucado, recebe +5 na Defesa e resistência a dano 5. Enquanto estiver morrendo, não fica indefeso e ainda pode realizar ações (mas segue as regras de morte normalmente).' },
        ],
    },
];

export function trilhaCombatentePorNome(nome) {
    return TRILHAS_COMBATENTE.find(t => t.nome === nome) || null;
}

// "Casca Grossa" (Tropa de Choque, NEX 10) tem um efeito numérico
// limpo — +1 PV por passo de NEX acima do NEX inicial (5%), mesma
// convenção usada em Cicatrizes Psicológicas (Vítima, ver origens.js)
// pra "+1 X para cada 5% de NEX" — mas SÓ se essa sub-trilha tiver
// sido escolhida E o poder já estiver liberado (NEX >= 10). Separado
// do resto porque depende de duas escolhas do jogador (trilha
// principal = Tropa de Choque, e ter chegado no NEX certo), diferente
// do Ataque Especial que vale pra qualquer Combatente.
export function bonusVidaCascaGrossa(trilhaCombatenteEscolhida, nex) {
    if (trilhaCombatenteEscolhida !== 'Tropa de Choque') return 0;
    const n = Number(nex) || 0;
    if (n < 10) return 0;
    return passosDeNex(n);
}
