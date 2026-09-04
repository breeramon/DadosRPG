import { passosDeNex } from './pericias';

export const ATAQUE_ESPECIAL_COMBATENTE = [
    { nex: 5, pe: 2, bonus: 5 },
    { nex: 25, pe: 3, bonus: 10 },
    { nex: 55, pe: 4, bonus: 15 },
    { nex: 85, pe: 5, bonus: 20 },
];

export function ataqueEspecialMaximo(nex) {
    const n = Number(nex) || 0;
    let atual = null;
    for (const tier of ATAQUE_ESPECIAL_COMBATENTE) {
        if (n >= tier.nex) atual = tier;
    }
    return atual;
}

export const PODER_COMBATENTE_MARCOS = [15, 30, 45, 60, 75, 90];

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
    { nome: 'Reflexos Defensivos', descricao: 'Você recebe +2 em Defesa e em testes de resistência.', preRequisito: 'Agi 2', efeitos: [{ tipo: 'defesa', valor: 2 }, { tipo: 'periciaBonus', pericia: 'Fortitude', valor: 2 }, { tipo: 'periciaBonus', pericia: 'Reflexos', valor: 2 }, { tipo: 'periciaBonus', pericia: 'Vontade', valor: 2 }] },
    { nome: 'Saque Rápido', descricao: 'Você pode sacar ou guardar itens como uma ação livre (em vez de ação de movimento). Além disso, caso esteja usando a regra opcional de contagem de munição, uma vez por rodada pode recarregar uma arma de disparo como uma ação livre.', preRequisito: 'Treinado em Iniciativa' },
    { nome: 'Segurar o Gatilho', descricao: 'Sempre que acerta um ataque com uma arma de fogo, pode fazer outro ataque com a mesma arma contra o mesmo alvo, pagando 2 PE por cada ataque já realizado no turno (2 PE no primeiro extra, +4 PE no segundo, e assim por diante), até errar um ataque ou atingir o limite de PE por rodada.', preRequisito: 'NEX 60%' },
    { nome: 'Sentido Tático', descricao: 'Você pode gastar uma ação de movimento e 2 PE para analisar o ambiente. Se fizer isso, recebe um bônus em Defesa e em testes de resistência igual ao seu Intelecto até o final da cena.', preRequisito: 'Int 2, treinado em Percepção e Tática' },
    { nome: 'Tanque de Guerra', descricao: 'Se estiver usando uma proteção pesada, a Defesa e a resistência a dano que ela fornece aumentam em +2.', preRequisito: 'Proteção Pesada' },
    { nome: 'Tiro Certeiro', descricao: 'Você soma sua Agilidade nas rolagens de dano com armas de disparo e ignora a penalidade contra alvos envolvidos em combate corpo a corpo (mesmo se não usar a ação mirar).', preRequisito: 'Treinado em Pontaria' },
    { nome: 'Tiro de Cobertura', descricao: 'Você pode gastar uma ação padrão e 1 PE para disparar uma arma de fogo na direção de um personagem no alcance da arma para forçá-lo a se proteger. Faça um teste de Pontaria contra a Vontade do alvo. Se vencer, até o início do seu próximo turno o alvo não pode sair do lugar onde está e sofre −5 em testes de ataque.', preRequisito: null },
    { nome: 'Transcender', descricao: 'Escolha um poder paranormal (p.114). Você recebe o poder escolhido, mas não ganha Sanidade neste aumento de NEX. Pode escolher este poder várias vezes.', preRequisito: null, repetivel: true },
    { nome: 'Treinamento em Perícia', descricao: 'Escolha duas perícias e se torne treinado nelas. A partir de NEX 35%, pode escolher perícias nas quais já é treinado pra se tornar veterano; a partir de NEX 70%, perícias veteranas pra se tornar expert. Pode escolher este poder várias vezes.', preRequisito: null, repetivel: true },
];

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
            { nex: 10, nome: 'Iniciativa Aprimorada', descricao: 'Você recebe +5 em Iniciativa e uma ação de movimento adicional na primeira rodada.', efeitos: [{ tipo: 'periciaBonus', pericia: 'Iniciativa', valor: 5 }] },
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

export function bonusVidaCascaGrossa(trilhaCombatenteEscolhida, nex) {
    if (trilhaCombatenteEscolhida !== 'Tropa de Choque') return 0;
    const n = Number(nex) || 0;
    if (n < 10) return 0;
    return passosDeNex(n);
}

// ====================================================================
// ESPECIALISTA (Tabela 1.4, p.28-31)
// ====================================================================

export const PERITO_ESPECIALISTA = [
    { nex: 5, pe: 2, dado: '1d6' },
    { nex: 25, pe: 3, dado: '1d8' },
    { nex: 55, pe: 4, dado: '1d10' },
    { nex: 85, pe: 5, dado: '1d12' },
];

export function peritoEspecialistaMaximo(nex) {
    const n = Number(nex) || 0;
    let atual = null;
    for (const tier of PERITO_ESPECIALISTA) {
        if (n >= tier.nex) atual = tier;
    }
    return atual;
}

export const PODER_ESPECIALISTA_MARCOS = [15, 30, 45, 60, 75, 90];

export function slotsPoderEspecialistaLiberados(nex) {
    const n = Number(nex) || 0;
    return PODER_ESPECIALISTA_MARCOS.filter(m => n >= m).length;
}

export const PODERES_ESPECIALISTA = [
    { nome: 'Artista Marcial', descricao: 'Seus ataques desarmados causam 1d6 pontos de dano, podem causar dano letal e contam como armas ágeis. Em NEX 35%, o dano aumenta para 1d8 e, em NEX 70%, para 1d10.', preRequisito: null },
    { nome: 'Balística Avançada', descricao: 'Você recebe proficiência com armas táticas de fogo e +2 em rolagens de dano com armas de fogo.', preRequisito: null },
    { nome: 'Conhecimento Aplicado', descricao: 'Quando faz um teste de perícia (exceto Luta e Pontaria), você pode gastar 2 PE para mudar o atributo-base da perícia para Intelecto.', preRequisito: 'Int 2' },
    { nome: 'Hacker', descricao: 'Você recebe +5 em testes de Tecnologia para invadir sistemas e diminui o tempo necessário para hackear qualquer sistema para uma ação completa.', preRequisito: 'Treinado em Tecnologia', efeitos: [{ tipo: 'periciaBonus', pericia: 'Tecnologia', valor: 5 }] },
    { nome: 'Mãos Rápidas', descricao: 'Ao fazer um teste de Crime, você pode pagar 1 PE para fazê-lo como uma ação livre.', preRequisito: 'Agi 3, treinado em Crime' },
    { nome: 'Mochila de Utilidades', descricao: 'Um item à sua escolha (exceto armas) conta como uma categoria abaixo e ocupa 1 espaço a menos.', preRequisito: null },
    { nome: 'Movimento Tático', descricao: 'Você pode gastar 1 PE para ignorar a penalidade em deslocamento por terreno difícil e por escalar até o final do turno.', preRequisito: 'Treinado em Atletismo' },
    { nome: 'Na Trilha Certa', descricao: 'Sempre que tiver sucesso em um teste para procurar pistas, você pode gastar 1 PE para receber um bônus de 1 dado no próximo teste. Os custos e os bônus são cumulativos (se passar num segundo teste, pode pagar 2 PE para receber um bônus total de 2 dados no próximo teste, e assim por diante).', preRequisito: null },
    { nome: 'Nerd', descricao: 'Uma vez por cena, pode gastar 2 PE para fazer um teste de Atualidades (DT 20). Se passar, recebe uma informação útil para a cena (uma dica pra pista numa investigação, uma fraqueza de inimigo num combate, etc).', preRequisito: null },
    { nome: 'Ninja Urbano', descricao: 'Você recebe proficiência com armas táticas de ataque corpo a corpo e de disparo (exceto de fogo) e +2 em rolagens de dano com armas de corpo a corpo e de disparo.', preRequisito: null },
    { nome: 'Pensamento Ágil', descricao: 'Uma vez por rodada, durante uma cena de investigação, você pode gastar 2 PE para fazer uma ação de procurar pistas adicional.', preRequisito: null },
    { nome: 'Perito em Explosivos', descricao: 'Você soma seu Intelecto na DT para resistir aos seus explosivos e pode excluir dos efeitos da explosão um número de alvos igual ao seu valor de Intelecto.', preRequisito: null },
    { nome: 'Primeira Impressão', descricao: 'Você recebe um bônus de 1 dado no primeiro teste de Diplomacia, Enganação, Intimidação ou Intuição que fizer em uma cena.', preRequisito: null },
    { nome: 'Transcender', descricao: 'Escolha um poder paranormal (p.114). Você recebe o poder escolhido, mas não ganha Sanidade neste aumento de NEX. Pode escolher este poder várias vezes.', preRequisito: null, repetivel: true },
    { nome: 'Treinamento em Perícia', descricao: 'Escolha duas perícias e se torne treinado nelas. A partir de NEX 35%, pode escolher perícias nas quais já é treinado pra se tornar veterano; a partir de NEX 70%, perícias veteranas pra se tornar expert. Pode escolher este poder várias vezes.', preRequisito: null, repetivel: true },
];

export const TRILHAS_ESPECIALISTA = [
    {
        nome: 'Atirador de Elite',
        descricao: 'Um tiro, uma morte. Ao contrário dos combatentes, você é perito em neutralizar ameaças de longe, terminando uma briga antes mesmo que ela comece. Você trata sua arma como uma ferramenta de precisão, sendo capaz de executar façanhas incríveis.',
        poderes: [
            { nex: 10, nome: 'Mira de Elite', descricao: 'Você recebe proficiência com armas de fogo que usam balas longas e soma seu Intelecto em rolagens de dano com essas armas.' },
            { nex: 40, nome: 'Disparo Letal', descricao: 'Quando faz a ação mirar, você pode gastar 1 PE para aumentar em +2 a margem de ameaça do próximo ataque que fizer até o final do seu próximo turno.' },
            { nex: 65, nome: 'Disparo Impactante', descricao: 'Se estiver usando uma arma de fogo com calibre grosso, você pode gastar 2 PE para fazer as manobras derrubar, desarmar, empurrar ou quebrar usando um ataque à distância.' },
            { nex: 99, nome: 'Atirar para Matar', descricao: 'Quando faz um acerto crítico com uma arma de fogo, você causa dano máximo, sem precisar rolar dados.' },
        ],
    },
    {
        nome: 'Infiltrador',
        descricao: 'Você é um perito em infiltração e sabe neutralizar alvos desprevenidos sem causar alarde. Combinando talento acrobático, destreza manual e conhecimento técnico, você é capaz de superar qualquer barreira de defesa, mesmo quando a missão parece impossível.',
        poderes: [
            { nex: 10, nome: 'Ataque Furtivo', descricao: 'Você sabe atingir os pontos vitais de um inimigo distraído. Uma vez por rodada, quando atinge um alvo desprevenido com um ataque corpo a corpo ou em alcance curto, ou um alvo que esteja flanqueando, você pode gastar 1 PE para causar +1d6 pontos de dano do mesmo tipo da arma. Em NEX 40% o dano adicional aumenta para +2d6, em NEX 65% para +3d6 e em NEX 99% para +4d6.' },
            { nex: 40, nome: 'Gatuno', descricao: 'Você recebe +5 em Atletismo e Crime e pode percorrer seu deslocamento normal quando se esconder sem penalidade (veja a perícia Furtividade).', efeitos: [{ tipo: 'periciaBonus', pericia: 'Atletismo', valor: 5 }, { tipo: 'periciaBonus', pericia: 'Crime', valor: 5 }] },
            { nex: 65, nome: 'Assassinar', descricao: 'Você pode gastar uma ação de movimento e 3 PE para analisar um alvo em alcance curto. Até o fim do seu próximo turno, seu primeiro Ataque Furtivo que causar dano a ele tem seus dados de dano extras dessa habilidade dobrados. Além disso, se sofrer dano de seu ataque, o alvo fica inconsciente ou morrendo, à sua escolha (Fortitude DT Agi evita).' },
            { nex: 99, nome: 'Sombra Fugaz', descricao: 'Quando faz um teste de Furtividade após atacar ou fazer outra ação chamativa, você pode gastar 3 PE para não sofrer a penalidade de 3 dados no teste.' },
        ],
    },
    {
        nome: 'Médico de Campo',
        descricao: 'Você é treinado em técnicas de primeiros socorros e tratamento de emergência, o que torna você um membro valioso para qualquer grupo de agentes. Ao contrário dos profissionais de saúde convencionais, você está acostumado com o campo de batalha e sabe tomar decisões rápidas no meio do caos. Especial: para escolher esta trilha, você precisa ser treinado em Medicina. Para usar as habilidades desta trilha, você precisa possuir um kit de medicina.',
        poderes: [
            { nex: 10, nome: 'Paramédico', descricao: 'Você pode usar uma ação padrão e 2 PE para curar 2d10 pontos de vida de si mesmo ou de um aliado adjacente. Você pode curar +1d10 PV adicional respectivamente em NEX 40%, 65% e 99%, gastando +1 PE por dado de cura adicional.' },
            { nex: 40, nome: 'Equipe de Trauma', descricao: 'Você pode usar uma ação padrão e 2 PE para remover uma condição negativa (exceto morrendo) de um aliado adjacente.' },
            { nex: 65, nome: 'Resgate', descricao: 'Uma vez por rodada, se estiver em alcance curto de um aliado machucado ou morrendo, você pode se aproximar dele com uma ação livre (desde que consiga fazê-lo usando seu deslocamento normal). Além disso, sempre que curar PV ou remover condições do aliado, você e ele recebem +5 na Defesa até o início do seu próximo turno. Por fim, pra você, o total de espaços ocupados por carregar um personagem é reduzido pela metade.' },
            { nex: 99, nome: 'Reanimação', descricao: 'Uma vez por cena, pode gastar uma ação completa e 10 PE para trazer de volta à vida um personagem que tenha morrido na mesma cena (exceto morte por dano massivo).' },
        ],
    },
    {
        nome: 'Negociador',
        descricao: 'Você é um diplomata habilidoso e consegue influenciar outras pessoas, seja por lábia ou intimidação. Sua capacidade de avaliar situações com rapidez e eficiência pode tirar o grupo de apuros que nem a mais poderosa das armas poderia resolver.',
        poderes: [
            { nex: 10, nome: 'Eloquência', descricao: 'Você pode usar uma ação completa e 1 PE por alvo em alcance curto para afetar outros personagens com sua fala. Faça um teste de Diplomacia, Enganação ou Intimidação contra a Vontade dos alvos. Se vencer, eles ficam fascinados enquanto você se concentrar (uma ação padrão por rodada). Um alvo hostil ou envolvido em combate recebe +5 no teste de resistência e tem direito a um novo teste por rodada, sempre que você se concentrar.' },
            { nex: 40, nome: 'Discurso Motivador', descricao: 'Você pode gastar uma ação padrão e 4 PE para inspirar seus aliados com suas palavras. Você e todos os seus aliados em alcance curto ganham um bônus de 1 dado em testes de perícia até o fim da cena. A partir de NEX 65%, você pode gastar 8 PE para fornecer um bônus total de 2 dados.' },
            { nex: 65, nome: 'Eu Conheço um Cara', descricao: 'Uma vez por missão, você pode ativar sua rede de contatos para pedir um favor — como trocar todo o equipamento do grupo (como se tivesse uma segunda fase de preparação de missão), conseguir um local de descanso ou mesmo ser resgatado de uma cena. O mestre tem a palavra final sobre quando é possível usar essa habilidade e quais favores podem ser obtidos.' },
            { nex: 99, nome: 'Truque de Mestre', descricao: 'Você pode gastar 5 PE para simular o efeito de qualquer habilidade que tenha visto de um aliado durante a cena. Você ignora os pré-requisitos da habilidade, mas ainda precisa pagar todos os seus custos (ações, PE e materiais), e ela usa seus próprios parâmetros de jogo, como se você estivesse usando a habilidade em questão.' },
        ],
    },
    {
        nome: 'Técnico',
        descricao: 'Sua principal habilidade é a manutenção e reparo do valioso equipamento que seu time carrega em missão. Seu conhecimento técnico também permite que improvise ferramentas com o que tiver à disposição e sabote os itens usados por seus inimigos.',
        poderes: [
            { nex: 10, nome: 'Inventário Otimizado', descricao: 'Você soma seu Intelecto à sua Força para calcular sua capacidade de carga. Por exemplo, se você tem Força 1 e Intelecto 3, seu inventário tem 20 espaços.' },
            { nex: 40, nome: 'Remendão', descricao: 'Você pode gastar uma ação padrão e 1 PE para remover a condição quebrado de um equipamento adjacente até o final da cena. Além disso, qualquer equipamento geral tem sua categoria reduzida em I para você.' },
            { nex: 65, nome: 'Improvisar', descricao: 'Você pode improvisar equipamentos com materiais ao seu redor. Escolha um equipamento geral e gaste uma ação completa e 2 PE, mais 2 PE por categoria do item escolhido. Você cria uma versão funcional do item, que segue suas regras de espaço e categoria normalmente. Ao final da cena, o equipamento improvisado se torna inútil.' },
            { nex: 99, nome: 'Preparado para Tudo', descricao: 'Você sempre tem o que precisa para qualquer situação. Gastando uma ação de movimento e 3 PE por categoria do item, pode lembrar que colocou ele no fundo da bolsa! Depois de encontrado, o item segue normalmente as regras de inventário.' },
        ],
    },
];

export function trilhaEspecialistaPorNome(nome) {
    return TRILHAS_ESPECIALISTA.find(t => t.nome === nome) || null;
}

// ====================================================================
// OCULTISTA (Tabela 1.5, p.32-35)
// ====================================================================

export const PODER_OCULTISTA_MARCOS = [15, 30, 45, 60, 75, 90];

export function slotsPoderOcultistaLiberados(nex) {
    const n = Number(nex) || 0;
    return PODER_OCULTISTA_MARCOS.filter(m => n >= m).length;
}

export const PODERES_OCULTISTA = [
    { nome: 'Camuflar Ocultismo', descricao: 'Você pode gastar uma ação livre para esconder símbolos e sigilos desenhados ou gravados em objetos ou em sua pele, tornando-os invisíveis para outras pessoas além de você. Além disso, quando lança um ritual, pode gastar +2 PE para lançá-lo sem componentes ritualísticos e sem gesticular (mãos presas), usando apenas concentração. Outros seres só percebem que você lançou um ritual se passarem num teste de Ocultismo (DT 25).', preRequisito: null },
    { nome: 'Criar Selo', descricao: 'Você sabe fabricar selos paranormais de rituais que conheça (p.151). Fabricar um selo gasta uma ação de interlúdio e um número de PE igual ao custo de conjurar o ritual. Pode ter um número máximo de selos criados ao mesmo tempo igual à sua Presença.', preRequisito: null },
    { nome: 'Envolto em Mistério', descricao: 'Sua aparência e postura assombrosas permitem manipular e assustar pessoas ignorantes ou supersticiosas (o mestre define quem se encaixa). Como regra geral, você recebe +5 em Enganação e Intimidação contra pessoas não treinadas em Ocultismo.', preRequisito: null },
    { nome: 'Especialista em Elemento', descricao: 'Escolha um elemento. A DT para resistir aos seus rituais desse elemento aumenta em +2.', preRequisito: null },
    { nome: 'Ferramentas Paranormais', descricao: 'Você reduz a categoria de um item paranormal em I e pode ativar itens paranormais sem pagar seu custo em PE.', preRequisito: null },
    { nome: 'Fluxo de Poder', descricao: 'Você pode manter dois efeitos sustentados de rituais ativos ao mesmo tempo com apenas uma ação livre, pagando o custo de cada efeito separadamente.', preRequisito: 'NEX 60%' },
    { nome: 'Guiado pelo Paranormal', descricao: 'Uma vez por cena, você pode gastar 2 PE para fazer uma ação de investigação adicional.', preRequisito: null },
    { nome: 'Identificação Paranormal', descricao: 'Você recebe +10 em testes de Ocultismo para identificar criaturas, objetos ou rituais.', preRequisito: null },
    { nome: 'Improvisar Componentes', descricao: 'Uma vez por cena, você pode gastar uma ação completa para fazer um teste de Investigação (DT 15). Se passar, encontra objetos que podem servir como componentes ritualísticos de um elemento à sua escolha. O mestre define se é possível usar esse poder na cena atual.', preRequisito: null },
    { nome: 'Intuição Paranormal', descricao: 'Sempre que usa a ação facilitar investigação, você soma seu Intelecto ou Presença no teste (à sua escolha).', preRequisito: null },
    { nome: 'Mestre em Elemento', descricao: 'Escolha um elemento. O custo para lançar rituais desse elemento diminui em -1 PE.', preRequisito: 'Especialista em Elemento no elemento escolhido, NEX 45%' },
    { nome: 'Ritual Potente', descricao: 'Você soma seu Intelecto nas rolagens de dano ou nos efeitos de cura de seus rituais.', preRequisito: 'Int 2' },
    { nome: 'Ritual Predileto', descricao: 'Escolha um ritual que você conhece. Você reduz em -1 PE o custo do ritual. Essa redução se acumula com reduções fornecidas por outras fontes.', preRequisito: null },
    { nome: 'Tatuagem Ritualística', descricao: 'Símbolos marcados em sua pele reduzem em -1 PE o custo de rituais de alcance pessoal que têm você como alvo.', preRequisito: null },
    { nome: 'Transcender', descricao: 'Escolha um poder paranormal (p.114). Você recebe o poder escolhido, mas não ganha Sanidade neste aumento de NEX. Pode escolher este poder várias vezes.', preRequisito: null, repetivel: true },
    { nome: 'Treinamento em Perícia', descricao: 'Escolha duas perícias e se torne treinado nelas. A partir de NEX 35%, pode escolher perícias nas quais já é treinado pra se tornar veterano; a partir de NEX 70%, perícias veteranas pra se tornar expert. Pode escolher este poder várias vezes.', preRequisito: null, repetivel: true },
];

export const TRILHAS_OCULTISTA = [
    {
        nome: 'Conduíte',
        descricao: 'Você domina os aspectos fundamentais da conjuração de rituais e é capaz de aumentar o alcance e velocidade de suas conjurações. Conforme sua conexão com as entidades paranormais aumenta, você se torna capaz de interferir com os rituais de outros ocultistas.',
        poderes: [
            { nex: 10, nome: 'Ampliar Ritual', descricao: 'Quando lança um ritual, você pode gastar +2 PE para aumentar seu alcance em um passo (de curto para médio, de médio para longo ou de longo para extremo) ou dobrar sua área de efeito.' },
            { nex: 40, nome: 'Acelerar Ritual', descricao: 'Uma vez por rodada, você pode aumentar o custo de um ritual em 4 PE para conjurá-lo como uma ação livre.' },
            { nex: 65, nome: 'Anular Ritual', descricao: 'Quando for alvo de um ritual, você pode gastar uma quantidade de PE igual ao custo pago por esse ritual e fazer um teste oposto de Ocultismo contra o conjurador. Se vencer, você anula o ritual, cancelando todos os seus efeitos.' },
            { nex: 99, nome: 'Canalizar o Medo', descricao: 'Você aprende o ritual Canalizar o Medo.' },
        ],
    },
    {
        nome: 'Flagelador',
        descricao: 'Dor é um poderoso catalisador paranormal e você aprendeu a transformá-la em poder para seus rituais ocultistas. Quando se torna especialmente poderoso, consegue usar a dor e o sofrimento de seus inimigos como instrumento de seus rituais ocultistas.',
        poderes: [
            { nex: 10, nome: 'Poder do Flagelo', descricao: 'Ao conjurar um ritual, você pode gastar seus próprios pontos de vida para pagar o custo em pontos de esforço, à taxa de 2 PV por PE pago. Pontos de vida gastos dessa forma só podem ser recuperados com descanso.' },
            { nex: 40, nome: 'Abraçar a Dor', descricao: 'Sempre que sofrer dano não paranormal, você pode gastar uma reação e 2 PE para reduzir esse dano à metade.' },
            { nex: 65, nome: 'Absorver Agonia', descricao: 'Sempre que reduz um ou mais inimigos a 0 PV com um ritual, você recebe uma quantidade de PE temporários igual ao círculo do ritual utilizado (ex: ritual de 2º círculo dá 2 PE temporários).' },
            { nex: 99, nome: 'Medo Tangível', descricao: 'Você aprende o ritual Medo Tangível.' },
        ],
    },
    {
        nome: 'Intuitivo',
        descricao: 'Assim como combatentes treinam seus corpos para resistir a traumas físicos, você preparou sua mente para resistir aos efeitos do Outro Lado. Seu foco e força de vontade fazem com que você expanda os limites de suas capacidades paranormais.',
        poderes: [
            { nex: 10, nome: 'Mente Sã', descricao: 'Você compreende melhor as entidades do Outro Lado e passa a ser menos abalado por seus efeitos. Você recebe resistência paranormal +5 (+5 em testes de resistência contra efeitos paranormais).' },
            { nex: 40, nome: 'Presença Poderosa', descricao: 'Sua resiliência mental faz com que você possa extrair mais do Outro Lado. Você adiciona sua Presença ao seu limite de PE por turno, mas apenas para conjurar rituais (não para DT).' },
            { nex: 65, nome: 'Inabalável', descricao: 'Você recebe resistência a dano mental e paranormal 10. Além disso, quando é alvo de um efeito paranormal que permite um teste de Vontade para reduzir o dano à metade, você não sofre dano algum se passar.' },
            { nex: 99, nome: 'Presença do Medo', descricao: 'Você aprende o ritual Presença do Medo.' },
        ],
    },
    {
        nome: 'Graduado',
        descricao: 'Você foca seus estudos em se tornar um conjurador versátil e poderoso, conhecendo mais rituais que os outros ocultistas e sendo capaz de torná-los mais difíceis de serem resistidos. Seu objetivo é desvendar e dominar os segredos do Outro Lado, custe o que custar.',
        poderes: [
            { nex: 10, nome: 'Saber Ampliado', descricao: 'Você aprende um ritual de 1º círculo. Toda vez que ganha acesso a um novo círculo, aprende um ritual adicional daquele círculo. Esses rituais não contam no seu limite de rituais conhecidos.' },
            { nex: 40, nome: 'Grimório Ritualístico', descricao: 'Você cria um grimório especial que armazena rituais que sua mente não seria capaz de guardar. Você aprende uma quantidade de rituais de 1º ou 2º círculos igual ao seu Intelecto (e mais um a cada novo círculo liberado). Esses rituais não contam em seu limite de rituais conhecidos. Para conjurar um ritual armazenado no grimório, precisa antes empunhá-lo e gastar uma ação completa folheando-o. O grimório ocupa 1 espaço no inventário; se perdido, pode ser replicado com duas ações de interlúdio.' },
            { nex: 65, nome: 'Rituais Eficientes', descricao: 'A DT para resistir a todos os seus rituais aumenta em +5.' },
            { nex: 99, nome: 'Conhecendo o Medo', descricao: 'Você aprende o ritual Conhecendo o Medo.' },
        ],
    },
    {
        nome: 'Lâmina Paranormal',
        descricao: 'Alguns ocultistas preferem ficar fechados em suas bibliotecas estudando livros e rituais. Outros preferem investigar fenômenos paranormais em sua fonte. Já você prefere usar o paranormal como uma arma — aprendeu técnicas de luta mesclando suas habilidades de conjuração com suas capacidades de combate.',
        poderes: [
            { nex: 10, nome: 'Lâmina Maldita', descricao: 'Você aprende o ritual Amaldiçoar Arma (se já o conhece, seu custo é reduzido em -1 PE). Além disso, quando conjura esse ritual, pode usar testes de Ocultismo (em vez de Luta ou Pontaria) para testes de ataque com a arma amaldiçoada.' },
            { nex: 40, nome: 'Gladiador Paranormal', descricao: 'Sempre que acerta um ataque corpo a corpo em um inimigo, você recebe 2 PE temporários (máximo por cena igual ao seu limite de PE). PE temporários desaparecem no final da cena.' },
            { nex: 65, nome: 'Conjuração Marcial', descricao: 'Uma vez por rodada, quando lança um ritual com execução de uma ação padrão, pode gastar 2 PE para fazer um ataque corpo a corpo como uma ação livre.' },
            { nex: 99, nome: 'Lâmina do Medo', descricao: 'Você aprende o ritual Lâmina do Medo.' },
        ],
    },
];

export function trilhaOcultistaPorNome(nome) {
    return TRILHAS_OCULTISTA.find(t => t.nome === nome) || null;
}

export function poderesDisponiveisParaSlot(catalogo, escolhidos, indice) {
    const escolhidosEmOutrosSlots = new Set(
        (escolhidos || []).filter((_, i) => i !== indice).filter(Boolean)
    );
    return catalogo.filter(p => p.repetivel || !escolhidosEmOutrosSlots.has(p.nome));
}

export function bonusNumericoDosPoderes({
    nex,
    poderesCombatenteEscolhidos,
    trilhaCombatenteEscolhida,
    poderesEspecialistaEscolhidos,
    trilhaEspecialistaEscolhida,
    poderesOcultistaEscolhidos,
    trilhaOcultistaEscolhida,
} = {}) {
    const resultado = { defesa: 0, pericias: {} };

    function aplicar(efeitos) {
        if (!Array.isArray(efeitos)) return;
        for (const efeito of efeitos) {
            if (efeito.tipo === 'defesa') {
                resultado.defesa += efeito.valor;
            } else if (efeito.tipo === 'periciaBonus') {
                resultado.pericias[efeito.pericia] = (resultado.pericias[efeito.pericia] || 0) + efeito.valor;
            }
        }
    }

    (poderesCombatenteEscolhidos || []).forEach(nomePoder => {
        aplicar(PODERES_COMBATENTE.find(p => p.nome === nomePoder)?.efeitos);
    });
    (poderesEspecialistaEscolhidos || []).forEach(nomePoder => {
        aplicar(PODERES_ESPECIALISTA.find(p => p.nome === nomePoder)?.efeitos);
    });
    (poderesOcultistaEscolhidos || []).forEach(nomePoder => {
        aplicar(PODERES_OCULTISTA.find(p => p.nome === nomePoder)?.efeitos);
    });

    const n = Number(nex) || 0;
    const trilhaComb = trilhaCombatentePorNome(trilhaCombatenteEscolhida);
    if (trilhaComb) {
        trilhaComb.poderes.forEach(poder => {
            if (n >= poder.nex) aplicar(poder.efeitos);
        });
    }
    const trilhaEsp = trilhaEspecialistaPorNome(trilhaEspecialistaEscolhida);
    if (trilhaEsp) {
        trilhaEsp.poderes.forEach(poder => {
            if (n >= poder.nex) aplicar(poder.efeitos);
        });
    }
    const trilhaOcu = trilhaOcultistaPorNome(trilhaOcultistaEscolhida);
    if (trilhaOcu) {
        trilhaOcu.poderes.forEach(poder => {
            if (n >= poder.nex) aplicar(poder.efeitos);
        });
    }

    return resultado;
}
