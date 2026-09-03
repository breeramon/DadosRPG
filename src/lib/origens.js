import { passosDeNex, RECURSOS } from './pericias';

// As 28 perícias válidas (mesmos nomes de PERICIAS_CATALOGO em
// pericias.js) que as Origens abaixo podem treinar.
export const ORIGENS_CATALOGO = [
    {
        nome: 'Acadêmico',
        descricao: 'Pesquisador ou professor universitário cujos estudos tocaram em assuntos misteriosos, chamando a atenção da Ordo Realitas.',
        periciasTreinadas: ['Ciências', 'Investigação'],
        poder: { nome: 'Saber é Poder', descricao: 'Quando faz um teste usando Intelecto, pode gastar 2 PE para receber +5 nesse teste.' },
        efeitos: [],
        confianca: 2,
    },
    {
        nome: 'Amnésico',
        descricao: 'Perdeu a maior parte da memória; hoje a Ordem é a única família que conhece.',
        periciasTreinadas: [],
        notaPericias: 'Duas perícias à escolha do Mestre (não fixas) — marque-as manualmente na lista de Perícias abaixo.',
        poder: { nome: 'Vislumbres do Passado', descricao: 'Uma vez por sessão, teste de Intelecto (DT 10) para reconhecer pessoas/lugares familiares de antes da amnésia. Se passar, recebe 1d4 PE temporários e, a critério do mestre, uma informação útil.' },
        efeitos: [],
        confianca: 2,
    },
    {
        nome: 'Artista',
        descricao: 'Ator, músico, escritor, dançarino ou influenciador cujo trabalho foi tocado pelo paranormal.',
        periciasTreinadas: ['Artes', 'Enganação'],
        poder: { nome: 'Magnum Opus', descricao: 'É famoso por uma obra. Uma vez por missão, pode determinar que uma pessoa numa cena de interação o reconheça, recebendo +5 em testes de Presença e perícias baseadas em Presença contra essa pessoa.' },
        efeitos: [],
        confianca: 2,
    },
    {
        nome: 'Atleta',
        descricao: 'Competia em esporte individual ou coletivo; o desempenho pode ter origem paranormal.',
        periciasTreinadas: ['Acrobacia', 'Atletismo'],
        poder: { nome: '110%', descricao: 'Ao fazer teste de perícia usando Força ou Agilidade (exceto Luta e Pontaria), pode gastar 2 PE para receber +5 nesse teste.' },
        efeitos: [],
        confianca: 2,
    },
    {
        nome: 'Chef',
        descricao: 'Cozinheiro amador ou profissional cuja comida o envolveu com o paranormal.',
        periciasTreinadas: ['Fortitude', 'Profissão'],
        poder: { nome: 'Ingrediente Secreto', descricao: 'Em cenas de interlúdio, ao usar a ação alimentar-se pra cozinhar um prato especial, você e o grupo recebem o benefício de dois pratos (efeitos acumulam se o mesmo benefício for escolhido duas vezes).' },
        efeitos: [],
        confianca: 2,
    },
    {
        nome: 'Criminoso',
        descricao: 'Vivia fora da lei (batedor de carteiras ou membro de facção); recrutado pela Ordem em vez de processado.',
        periciasTreinadas: ['Crime', 'Furtividade'],
        poder: { nome: 'O Crime Compensa', descricao: 'No final de uma missão, escolha um item encontrado; na próxima missão, pode incluí-lo no inventário sem contar no limite de itens da patente.' },
        efeitos: [],
        confianca: 2,
    },
    {
        nome: 'Cultista Arrependido',
        descricao: 'Fez parte de um culto paranormal, mas teve os olhos abertos e agora luta pelo lado certo.',
        periciasTreinadas: ['Ocultismo', 'Religião'],
        poder: { nome: 'Traços do Outro Lado', descricao: 'Possui um poder paranormal à sua escolha; porém, começa o jogo com metade da Sanidade normal para sua classe.' },
        // "Metade da Sanidade normal" é lido aqui como metade só da
        // Sanidade INICIAL da trilha (o termo fixo de sanidadeMaxima),
        // não do total já somado com os incrementos por NEX — ver
        // sanidadeMetadeInicial em bonusNumericoDaOrigem.
        efeitos: [
            { tipo: 'sanidadeMetadeInicial' },
        ],
        confianca: 2,
    },
    {
        nome: 'Investigador',
        descricao: 'Investigador do governo (perito forense, policial federal) ou particular (detetive).',
        periciasTreinadas: ['Investigação', 'Percepção'],
        poder: { nome: 'Faro para Pistas', descricao: 'Uma vez por cena, ao fazer teste para procurar pistas, pode gastar 1 PE para receber +5 nesse teste.' },
        efeitos: [],
        confianca: 2,
    },
    {
        nome: 'Lutador',
        descricao: 'Pratica arte marcial ou esporte de luta, ou aprendeu briga de rua num bairro perigoso.',
        periciasTreinadas: ['Luta', 'Reflexos'],
        poder: { nome: 'Mão Pesada', descricao: '+2 em rolagens de dano com ataques corpo a corpo.' },
        // Bônus passivo e permanente, mas específico de "ataques corpo a
        // corpo" — o app ainda não tem um jeito estruturado de aplicar
        // isso só nesse subconjunto de ataques (ver ataques automáticos
        // do inventário), então fica só como texto por enquanto.
        efeitos: [],
        confianca: 2,
    },
    {
        nome: 'Mercenário',
        descricao: 'Soldado de aluguel — escoltas e assassinatos até se envolver com o paranormal.',
        periciasTreinadas: ['Iniciativa', 'Intimidação'],
        poder: { nome: 'Posição de Combate', descricao: 'No primeiro turno de cada cena de ação, pode gastar 2 PE para receber uma ação de movimento adicional.' },
        efeitos: [],
        confianca: 2,
    },
    {
        nome: 'Militar',
        descricao: 'Serviu em força militar (exército, marinha), perito em armas de fogo.',
        periciasTreinadas: ['Pontaria', 'Tática'],
        poder: { nome: 'Para Bellum', descricao: '+2 em rolagens de dano com armas de fogo.' },
        efeitos: [], // mesma limitação do Mão Pesada (Lutador) — ver acima
        confianca: 2,
    },
    {
        nome: 'Operário',
        descricao: 'Pedreiro, industriário ou operador de máquinas; visão pragmática do mundo confrontada pelo paranormal.',
        periciasTreinadas: ['Fortitude', 'Profissão'],
        poder: { nome: 'Ferramenta de Trabalho', descricao: 'Escolhe uma arma simples ou tática que, a critério do mestre, poderia ser ferramenta de sua profissão (ex: marreta pra um pedreiro). Sabe usá-la e recebe +1 em testes de ataque, rolagens de dano e margem de ameaça com ela.' },
        efeitos: [],
        confianca: 2,
    },
    {
        nome: 'Policial',
        descricao: 'Fez parte de força de segurança pública, civil ou militar; deparou-se com um caso paranormal em patrulha.',
        periciasTreinadas: ['Percepção', 'Pontaria'],
        poder: { nome: 'Patrulha', descricao: '+2 em Defesa.' },
        // Único caso "limpo" da lista original: bônus passivo, sempre
        // ativo, e mapeia direto pro cálculo de Defesa já existente —
        // aplicado automaticamente (ver bonusNumericoDaOrigem abaixo).
        efeitos: [{ tipo: 'defesa', valor: 2 }],
        confianca: 2,
    },
    {
        nome: 'Religioso',
        descricao: 'Devoto ou sacerdote de uma fé, dedicado a ajudar pessoas com problemas espirituais.',
        periciasTreinadas: ['Religião', 'Vontade'],
        poder: { nome: 'Acalentar', descricao: '+5 em testes de Religião para acalmar; além disso, ao acalmar uma pessoa, ela recebe pontos de Sanidade iguais a 1d6 + sua Presença.' },
        efeitos: [],
        confianca: 2,
    },
    {
        nome: 'Trabalhador Rural',
        descricao: 'Trabalhava no campo ou em áreas isoladas (fazendeiro, pescador, biólogo, veterinário).',
        periciasTreinadas: ['Adestramento', 'Sobrevivência'],
        poder: { nome: 'Desbravador', descricao: 'Ao fazer teste de Adestramento ou Sobrevivência, pode gastar 2 PE para receber +5 nesse teste; além disso, não sofre penalidade de deslocamento em terreno difícil.' },
        efeitos: [],
        confianca: 2,
    },
    {
        nome: 'Vítima',
        descricao: 'Encontrou o paranormal numa experiência traumática (infância/juventude) e decidiu lutar pra impedir que outros passem pelo mesmo.',
        periciasTreinadas: ['Reflexos', 'Vontade'],
        poder: { nome: 'Cicatrizes Psicológicas', descricao: '+1 de Sanidade para cada 5% de NEX.' },
        // Efeito numérico limpo — mesmo padrão de passosNex já usado
        // em vidaPorPassoNex (Sanidade agora é modelada na ficha).
        efeitos: [
            { tipo: 'sanidadePorPassoNex', valor: 1 },
        ],
        confianca: 2,
    },

    // ============================================================
    // AS 10 ADICIONAIS — confiança média (ver comentário no topo)
    // ============================================================
    {
        nome: 'Agente de Saúde',
        descricao: 'Profissional da saúde (enfermeiro, farmacêutico, médico, psicólogo, socorrista).',
        periciasTreinadas: ['Intuição', 'Medicina'],
        poder: { nome: 'Técnica Medicinal', descricao: 'Sempre que cura um personagem, adiciona seu Intelecto ao total de PV curados.' },
        efeitos: [], // depende de um "sistema de cura" que o app ainda não modela
        confianca: 1,
    },
    {
        nome: 'Desgarrado',
        descricao: 'Vivia fora das normas da sociedade (eremita, pessoa em situação de rua, ou quem abandonou a rotina após descobrir o paranormal).',
        periciasTreinadas: ['Fortitude', 'Sobrevivência'],
        poder: { nome: 'Calejado', descricao: '+1 PV para cada 5% de NEX.' },
        // Bônus limpo e escalável — soma direto na Vida Máxima (mesma
        // lógica de "passos de NEX" já usada em vidaMaxima/pericias.js).
        efeitos: [{ tipo: 'vidaPorPassoNex', valor: 1 }],
        confianca: 1,
    },
    {
        nome: 'Engenheiro',
        descricao: 'Engenheiro profissional ou inventor de garagem que criou um dispositivo paranormal.',
        periciasTreinadas: ['Profissão', 'Tecnologia'],
        poder: { nome: 'Ferramenta Favorita', descricao: 'Um item à escolha (exceto armas) conta como uma categoria de Carga abaixo (ex: categoria II conta como categoria I).' },
        efeitos: [],
        confianca: 1,
    },
    {
        nome: 'Executivo',
        descricao: 'Trabalho de escritório em grande empresa ou banco (administrador, advogado, contador) até descobrir algo que não devia.',
        periciasTreinadas: ['Diplomacia', 'Profissão'],
        poder: { nome: 'Processo Otimizado', descricao: 'Ao fazer teste de perícia durante um teste estendido, ou ação para revisar documentos (físicos ou digitais), pode pagar 2 PE para receber +5 nesse teste.' },
        efeitos: [],
        confianca: 1,
    },
    {
        nome: 'Magnata',
        descricao: 'Possui muito dinheiro/patrimônio (herdeiro, ex-empresário, ganhador de loteria amaldiçoada).',
        periciasTreinadas: ['Diplomacia', 'Pilotagem'],
        poder: { nome: 'Patrocinador da Ordem', descricao: 'Seu limite de crédito é sempre considerado um acima do atual.' },
        efeitos: [],
        confianca: 1,
    },
    {
        nome: 'Servidor Público',
        descricao: 'Carreira em órgão do governo (burocracia/atendimento) até descobrir corrupção ou um culto entre representantes.',
        periciasTreinadas: ['Intuição', 'Vontade'],
        poder: { nome: 'Espírito Cívico', descricao: 'Sempre que faz um teste para ajudar (ação "ajudar"), pode gastar 1 PE para aumentar o bônus concedido em +2.' },
        efeitos: [],
        confianca: 1,
    },
    {
        nome: 'T.I.',
        descricao: 'Programador, engenheiro de software, "o cara da T.I." — talento com sistemas informatizados.',
        periciasTreinadas: ['Investigação', 'Tecnologia'],
        poder: { nome: 'Motor de Busca', descricao: 'A critério do mestre, sempre que tiver acesso à internet, pode gastar 2 PE para substituir um teste de perícia qualquer por um teste de Tecnologia.' },
        efeitos: [],
        confianca: 1,
    },
    {
        nome: 'Teórico da Conspiração',
        descricao: 'Investigou a fundo teorias (lua, reptilianos, Terra plana, Illuminati) até esbarrar no paranormal de verdade.',
        periciasTreinadas: ['Investigação', 'Ocultismo'],
        poder: { nome: 'Eu Já Sabia', descricao: 'Recebe resistência a dano mental igual ao seu Intelecto.' },
        efeitos: [], // "Resistências" é um campo de texto livre no app, sem cálculo estruturado
        confianca: 1,
    },
    {
        nome: 'Trambiqueiro',
        descricao: 'Vivia de pequenos golpes, jogatina ilegal e falcatruas até enganar a pessoa errada.',
        periciasTreinadas: ['Crime', 'Enganação'],
        poder: { nome: 'Impostor', descricao: 'Uma vez por cena, pode gastar 2 PE para substituir um teste de perícia qualquer por um teste de Enganação.' },
        efeitos: [],
        confianca: 1,
    },
    {
        nome: 'Universitário',
        descricao: 'Aluno de faculdade que descobriu algo que não devia (ex: um livro amaldiçoado na biblioteca do campus).',
        periciasTreinadas: ['Atualidades', 'Investigação'],
        poder: { nome: 'Dedicação', descricao: '+1 PE, e mais 1 PE adicional a cada NEX ímpar (15%, 25%, 35%...). Além disso, o limite de PE gasto por turno aumenta em 1.' },
        // Três efeitos limpos e numéricos — ver bonusNumericoDaOrigem.
        efeitos: [
            { tipo: 'peFixo', valor: 1 },
            { tipo: 'pePorNexImpar', valor: 1 },
            { tipo: 'peRodadaBonus', valor: 1 },
        ],
        confianca: 1,
    },
];

export function origemPorNome(nome) {
    return ORIGENS_CATALOGO.find(o => o.nome === nome) || null;
}

// NEX "ímpares" no sentido usado pelo poder do Universitário (15%,
// 25%, 35% ... 95% — os marcos que terminam em 5, alternados com os
// marcos "redondos" 10/20/30 etc). Ver ressalva de confiança média no
// comentário da Origem acima.
const NEX_IMPAR_MARCOS = [15, 25, 35, 45, 55, 65, 75, 85, 95];

// Soma todos os efeitos NUMÉRICOS (estruturados) da Origem escolhida,
// prontos pra somar direto nas contas que já existem em
// CharacterSheetPage.jsx (vidaMaxima, determinacaoMaxima, defesaTotal,
// peRodadaPorNex, sanidadeMaxima) — nunca substituem essas contas, só
// entram como mais um termo somado, do mesmo jeito que o bônus de
// Equipamento já soma na Defesa. Poderes que não têm um efeito
// numérico "limpo" (ver `efeitos: []` no catálogo acima) simplesmente
// não contribuem aqui — o poder continua sendo mostrado como texto na
// ficha, só não vira número sozinho. Ex: "Acalentar" (concede Sanidade
// a OUTRA pessoa, 1d6+Presença, sob demanda) e "Eu Já Sabia"
// (resistência a dano mental = Intelecto) não têm um jeito limpo de
// virar um termo somado aqui — continuam só texto.
//
// `trilha` só é necessário pro efeito 'sanidadeMetadeInicial' (precisa
// saber a Sanidade Inicial da classe pra calcular a metade) — passar
// undefined é seguro pros personagens sem essa Origem.
export function bonusNumericoDaOrigem(nomeOrigem, nex, trilha) {
    const origem = origemPorNome(nomeOrigem);
    const resultado = { defesa: 0, vida: 0, pe: 0, peRodada: 0, sanidade: 0 };
    if (!origem) return resultado;

    const passosNex = passosDeNex(nex);
    const marcosImparAtingidos = NEX_IMPAR_MARCOS.filter(m => (Number(nex) || 0) >= m).length;

    origem.efeitos.forEach(efeito => {
        switch (efeito.tipo) {
            case 'defesa':
                resultado.defesa += efeito.valor;
                break;
            case 'vidaPorPassoNex':
                resultado.vida += efeito.valor * passosNex;
                break;
            case 'peFixo':
                resultado.pe += efeito.valor;
                break;
            case 'pePorNexImpar':
                resultado.pe += efeito.valor * marcosImparAtingidos;
                break;
            case 'peRodadaBonus':
                resultado.peRodada += efeito.valor;
                break;
            case 'sanidadePorPassoNex':
                resultado.sanidade += efeito.valor * passosNex;
                break;
            case 'sanidadeMetadeInicial': {
                // "Começa o jogo com metade da Sanidade normal para sua
                // classe" — reduz só o termo Inicial da fórmula (não o
                // total já com incrementos de NEX). Sem trilha (Origem
                // escolhida antes de escolher a trilha, ou dado antigo),
                // não dá pra saber o Inicial da classe ainda — não
                // aplica o desconto até a trilha ser definida.
                const r = RECURSOS[trilha];
                if (r) resultado.sanidade -= r.sanInicial / 2;
                break;
            }
            default:
                break;
        }
    });

    return resultado;
}
