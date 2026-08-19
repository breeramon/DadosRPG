// ============================================================
// pericias.js
//
// Catálogo de perícias e regras de NEX do sistema Ordem Paranormal,
// usados pelo formulário de criação/edição de personagem (app-ui.js)
// pra montar a lista de perícias e travar o que cada NEX libera.
//
// IMPORTANTE — sobre a precisão destes números:
// Os nomes e atributos das 28 perícias são bem estabelecidos e vieram
// de múltiplas fontes concordantes. Já os marcos exatos de NEX (grau
// veterano/expert em 35%/70%, círculos de ritual em 5/25/55/85 etc)
// vieram de uma pesquisa on-line cuidadosa, mas o livro oficial não
// está disponível de forma aberta pra conferência 100% garantida —
// então trate os marcos de NEX abaixo como "melhor estimativa
// documentada", não como transcrição literal do livro. Se você notar
// algo diferente na sua mesa/livro físico, é só ajustar os números
// aqui embaixo (tudo centralizado neste arquivo) que o resto do app
// (formulário, travas de perícia, aviso de círculo de ritual) se
// adapta sozinho.
// ============================================================

(function () {
    // As 28 perícias oficiais e o atributo que cada uma usa.
    // `somenteTreinada: true` = perícia que só pode ser rolada se o
    // personagem for treinado nela (não dá pra tentar "no perigo" sem
    // treino) — confirmado direto numa ficha oficial preenchida que o
    // usuário me mandou (as 9 perícias marcadas com "*" nela).
    const PERICIAS_CATALOGO = [
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

    // Quantas perícias "à escolha" cada trilha ganha na criação, além
    // das automáticas. A fórmula real soma o Intelecto do personagem.
    // Combatente e Ocultista também têm perícias automáticas (fixas ou
    // escolhidas dentro de um par obrigatório).
    const TRILHA_REGRAS = {
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
    const GRAU_BONUS = { treinado: 5, veterano: 10, expert: 15 };
    const GRAU_ORDEM = ['treinado', 'veterano', 'expert'];
    const GRAU_LABEL = { treinado: 'Treinado', veterano: 'Veterano', expert: 'Expert' };

    // NEX mínimo pra poder elevar uma perícia treinada a cada grau.
    const GRAU_NEX_MIN = { treinado: 5, veterano: 35, expert: 70 };

    // Círculos de ritual do Ocultista e o NEX mínimo de cada um.
    // (Não há lista de rituais no app ainda — isso é só informativo,
    // pra mostrar até que círculo o personagem já tem acesso.)
    const CIRCULOS_RITUAL = [
        { circulo: 1, nexMinimo: 5 },
        { circulo: 2, nexMinimo: 25 },
        { circulo: 3, nexMinimo: 55 },
        { circulo: 4, nexMinimo: 85 },
    ];

    // Vida (PV) e Determinação, por trilha: valor inicial (NEX 5%) e
    // quanto aumenta a cada "subida" de NEX (cada 5%), sempre somando o
    // atributo relevante (Vigor pra Vida, Presença pra Determinação) de
    // novo em cada subida.
    //
    // O valor do Combatente foi CALIBRADO batendo com uma ficha real
    // preenchida que o usuário me mandou (Combatente, NEX 20%, VIG 3 ->
    // Vida 44; PRE 1 -> Determinação 19) — bate certinho com as fórmulas
    // abaixo. Especialista e Ocultista eu não tive como calibrar (não
    // tenho ficha real deles pra conferir), então são a melhor estimativa
    // da pesquisa, seguindo o mesmo padrão decrescente do Combatente. Se
    // notar um valor errado no seu livro, ajusta só aqui.
    const RECURSOS = {
        Combatente: { pvInicial: 20, pvIncremento: 4, detInicial: 6, detIncremento: 3 },
        Especialista: { pvInicial: 16, pvIncremento: 3, detInicial: 12, detIncremento: 6 },
        Ocultista: { pvInicial: 12, pvIncremento: 2, detInicial: 10, detIncremento: 5 },
    };

    // Quantas "subidas" de NEX o personagem já teve, contando a partir do
    // NEX inicial de 5% (NEX 5 = 0 subidas, NEX 20 = 3 subidas, etc).
    function passosDeNex(nex) {
        return Math.max(0, Math.round((clampNex(nex) - 5) / 5));
    }

    function vidaMaxima(trilha, vigor, nex) {
        const r = RECURSOS[trilha] || RECURSOS.Combatente;
        const vig = Number(vigor) || 0;
        const passos = passosDeNex(nex);
        return (r.pvInicial + vig) + passos * (r.pvIncremento + vig);
    }

    function determinacaoMaxima(trilha, presenca, nex) {
        const r = RECURSOS[trilha] || RECURSOS.Combatente;
        const pre = Number(presenca) || 0;
        const passos = passosDeNex(nex);
        return (r.detInicial + pre) + passos * (r.detIncremento + pre);
    }

    // Defesa = 10 + Agilidade + bônus de equipamento/armadura + outros
    // bônus (talentos, condições) — a classe não entra direto na conta
    // (só indiretamente, por talentos que dão "outros").
    function defesaTotal(agilidade, bonusEquipamento, bonusOutros) {
        return 10 + (Number(agilidade) || 0) + (Number(bonusEquipamento) || 0) + (Number(bonusOutros) || 0);
    }

    function clampNex(valor) {
        let n = parseInt(valor, 10);
        if (Number.isNaN(n)) n = 5;
        n = Math.round(n / 5) * 5;
        if (n < 5) n = 5;
        if (n > 99) n = 99;
        return n;
    }

    function grauMaximoPorNex(nex) {
        if (nex >= GRAU_NEX_MIN.expert) return 'expert';
        if (nex >= GRAU_NEX_MIN.veterano) return 'veterano';
        return 'treinado';
    }

    // Lista de graus que já estão liberados nesse NEX (ex: NEX 40 ->
    // ['treinado', 'veterano']), na ordem em que foram liberados.
    function grausPermitidos(nex) {
        const max = grauMaximoPorNex(nex);
        const idx = GRAU_ORDEM.indexOf(max);
        return GRAU_ORDEM.slice(0, idx + 1);
    }

    function quotaPericiasLivres(trilha, intelecto) {
        const regra = TRILHA_REGRAS[trilha] || TRILHA_REGRAS.Combatente;
        return Math.max(0, regra.baseLivre + (Number(intelecto) || 0));
    }

    // Devolve o círculo de ritual mais alto já liberado nesse NEX (0 =
    // nenhum). Só faz sentido pra trilha Ocultista.
    function circuloRitualLiberado(nex) {
        let liberado = 0;
        CIRCULOS_RITUAL.forEach(c => {
            if (nex >= c.nexMinimo) liberado = c.circulo;
        });
        return liberado;
    }

    // Tenta descobrir o grau de uma perícia salva no formato antigo
    // (só tinha um "bonus" numérico, sem o campo "grau"), pra manter
    // compatibilidade com personagens criados antes dessa função.
    function grauApartirDoBonus(bonus) {
        const n = Number(bonus) || 0;
        if (n >= GRAU_BONUS.expert) return 'expert';
        if (n >= GRAU_BONUS.veterano) return 'veterano';
        return 'treinado';
    }

    window.OrdemParanormal = {
        PERICIAS_CATALOGO,
        TRILHA_REGRAS,
        RECURSOS,
        GRAU_BONUS,
        GRAU_ORDEM,
        GRAU_LABEL,
        GRAU_NEX_MIN,
        CIRCULOS_RITUAL,
        passosDeNex,
        vidaMaxima,
        determinacaoMaxima,
        defesaTotal,
        clampNex,
        grauMaximoPorNex,
        grausPermitidos,
        quotaPericiasLivres,
        circuloRitualLiberado,
        grauApartirDoBonus,
    };
})();
