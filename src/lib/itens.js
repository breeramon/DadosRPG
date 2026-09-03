export const ITENS_CATALOGO = [
    // ============================================================
    // ARMAS — Corpo a Corpo
    // ============================================================
    { nome: 'Faca', grupo: 'armas', tipoArma: 'corpo', categoria: 'Simples', empunhadura: 'Leve', dano: '1d4', critico: '19 (19-20/×2)', tipoDano: 'Corte', espacos: 1, efeito: 'Arremessável (alcance Curto se arremessada). Ágil.', confianca: 1 },
    { nome: 'Punhal', grupo: 'armas', tipoArma: 'corpo', categoria: 'Simples', empunhadura: 'Leve', dano: '1d4', critico: '×3', tipoDano: 'Perfurante', espacos: 1, efeito: 'Ágil. Alcance pessoal.', confianca: 1 },
    { nome: 'Bastão', grupo: 'armas', tipoArma: 'corpo', categoria: 'Simples', empunhadura: 'Uma Mão', dano: '1d6', critico: '×2 (padrão)', tipoDano: 'Impacto', espacos: 1, efeito: 'Empunhadura adaptável.', confianca: 1 },
    { nome: 'Machete', grupo: 'armas', tipoArma: 'corpo', categoria: 'Simples', empunhadura: 'Uma Mão', dano: '1d6', critico: '19 (19-20/×2)', tipoDano: 'Corte', espacos: 1, efeito: '', confianca: 1 },
    { nome: 'Martelo', grupo: 'armas', tipoArma: 'corpo', categoria: 'Simples', empunhadura: 'Leve', dano: '1d6', critico: '×2 (padrão)', tipoDano: 'Impacto', espacos: 1, efeito: '', confianca: 1 },
    { nome: 'Lança', grupo: 'armas', tipoArma: 'corpo', categoria: 'Simples', empunhadura: 'Uma Mão', dano: '1d6', critico: '×2 (padrão)', tipoDano: 'Perfurante', espacos: 1, efeito: 'Arremessável, alcance Curto.', confianca: 1 },
    { nome: 'Cajado', grupo: 'armas', tipoArma: 'corpo', categoria: 'Simples', empunhadura: 'Duas Mãos', dano: '1d6', critico: '×2 (padrão)', tipoDano: 'Impacto', espacos: 2, efeito: 'Ágil.', confianca: 1 },
    { nome: 'Corrente', grupo: 'armas', tipoArma: 'corpo', categoria: 'Tática', empunhadura: 'Uma Mão', dano: '1d8', critico: '×2 (padrão)', tipoDano: 'Impacto', espacos: 1, efeito: '', confianca: 1 },
    { nome: 'Machadinha', grupo: 'armas', tipoArma: 'corpo', categoria: 'Tática', empunhadura: 'Leve', dano: '1d6', critico: '×3', tipoDano: 'Corte', espacos: 1, efeito: 'Arremessável, alcance Curto.', confianca: 1 },
    { nome: 'Nunchaku', grupo: 'armas', tipoArma: 'corpo', categoria: 'Tática', empunhadura: 'Leve', dano: '1d8', critico: '×2 (padrão)', tipoDano: 'Impacto', espacos: 1, efeito: 'Ágil.', confianca: 1 },
    { nome: 'Espada', grupo: 'armas', tipoArma: 'corpo', categoria: 'Tática', empunhadura: 'Uma Mão', dano: '1d8', critico: '19 (19-20/×2)', tipoDano: 'Corte', espacos: 1, efeito: 'Empunhadura adaptável.', confianca: 1 },
    { nome: 'Florete', grupo: 'armas', tipoArma: 'corpo', categoria: 'Tática', empunhadura: 'Uma Mão', dano: '1d6', critico: '18 (18-20/×2)', tipoDano: 'Impacto', espacos: 1, efeito: '⚠ Tipo de dano registrado como Impacto na fonte — o esperado pra uma arma de estocada seria Perfurante. Não confirmado, mantido como veio. Ágil.', confianca: 1 },
    { nome: 'Machado', grupo: 'armas', tipoArma: 'corpo', categoria: 'Tática', empunhadura: 'Uma Mão', dano: '1d8', critico: '×3', tipoDano: 'Corte', espacos: 1, efeito: '', confianca: 1 },
    { nome: 'Acha', grupo: 'armas', tipoArma: 'corpo', categoria: 'Tática', empunhadura: 'Duas Mãos', dano: '1d12', critico: '×3', tipoDano: 'Corte', espacos: 2, efeito: '', confianca: 2 },
    { nome: 'Gadanho', grupo: 'armas', tipoArma: 'corpo', categoria: 'Tática', empunhadura: 'Duas Mãos', dano: '2d4', critico: '×4', tipoDano: 'Corte', espacos: 2, efeito: '', confianca: 1 },
    { nome: 'Maça', grupo: 'armas', tipoArma: 'corpo', categoria: 'Tática', empunhadura: 'Uma Mão', dano: '2d4', critico: '×2 (padrão)', tipoDano: 'Impacto', espacos: 1, efeito: '', confianca: 1 },
    { nome: 'Marreta', grupo: 'armas', tipoArma: 'corpo', categoria: 'Tática', empunhadura: 'Duas Mãos', dano: '3d4', critico: '×2 (padrão)', tipoDano: 'Impacto', espacos: 2, efeito: '', confianca: 1 },
    { nome: 'Montante', grupo: 'armas', tipoArma: 'corpo', categoria: 'Tática', empunhadura: 'Duas Mãos', dano: '2d6', critico: '19 (19-20/×2)', tipoDano: 'Corte', espacos: 2, efeito: '', confianca: 2 },
    { nome: 'Motoserra', grupo: 'armas', tipoArma: 'corpo', categoria: 'Tática', empunhadura: 'Duas Mãos', dano: '3d6', critico: '×2 (padrão)', tipoDano: 'Corte', espacos: 2, efeito: '', confianca: 1 },
    { nome: 'Katana', grupo: 'armas', tipoArma: 'corpo', categoria: 'Tática', empunhadura: 'Duas Mãos', dano: '1d10', critico: '19 (19-20/×2)', tipoDano: 'Corte', espacos: 2, efeito: 'Ágil.', confianca: 2 },

    // ============================================================
    // ARMAS — Distância
    // ============================================================
    { nome: 'Arco', grupo: 'armas', tipoArma: 'distancia', categoria: 'Simples', empunhadura: 'Duas Mãos', dano: '1d6', critico: '×3', tipoDano: 'Perfurante', alcance: 'Médio', municao: 'Flechas', espacos: 2, efeito: '', confianca: 1 },
    { nome: 'Besta', grupo: 'armas', tipoArma: 'distancia', categoria: 'Simples', empunhadura: 'Duas Mãos', dano: '1d8', critico: '19 (19-20/×2)', tipoDano: 'Perfurante', alcance: 'Médio', municao: 'Flechas', espacos: 2, efeito: '', confianca: 1 },
    { nome: 'Pistola', grupo: 'armas', tipoArma: 'distancia', categoria: 'Simples', empunhadura: 'Leve', dano: '1d12', critico: '18 (18-20/×2)', tipoDano: 'Balístico', alcance: 'Curto', municao: 'Balas Curtas', espacos: 1, efeito: '', confianca: 1 },
    { nome: 'Revólver', grupo: 'armas', tipoArma: 'distancia', categoria: 'Simples', empunhadura: 'Leve', dano: '2d6', critico: '19 (19-20/×3)', tipoDano: 'Balístico', alcance: 'Curto', municao: 'Balas Curtas', espacos: 1, efeito: '', confianca: 1 },
    { nome: 'Fuzil de Caça', grupo: 'armas', tipoArma: 'distancia', categoria: 'Simples', empunhadura: 'Duas Mãos', dano: '2d8', critico: '19 (19-20/×3)', tipoDano: 'Balístico', alcance: 'Médio', municao: 'Balas Longas', espacos: 2, efeito: '', confianca: 1 },
    { nome: 'Arco Composto', grupo: 'armas', tipoArma: 'distancia', categoria: 'Tática', empunhadura: 'Duas Mãos', dano: '1d10', critico: '×3', tipoDano: 'Perfurante', alcance: 'Médio', municao: 'Flechas', espacos: 2, efeito: '', confianca: 2 },
    { nome: 'Balestra', grupo: 'armas', tipoArma: 'distancia', categoria: 'Tática', empunhadura: 'Duas Mãos', dano: '1d12', critico: '19 (19-20/×2)', tipoDano: 'Perfurante', alcance: 'Médio', municao: 'Flechas', espacos: 2, efeito: '', confianca: 1 },
    { nome: 'Espingarda', grupo: 'armas', tipoArma: 'distancia', categoria: 'Tática', empunhadura: 'Duas Mãos', dano: '4d6', critico: '×3', tipoDano: 'Balístico', alcance: 'Curto', municao: 'Cartuchos', espacos: 2, efeito: '', confianca: 1 },
    { nome: 'Submetralhadora', grupo: 'armas', tipoArma: 'distancia', categoria: 'Tática', empunhadura: 'Uma Mão', dano: '2d6', critico: '19 (19-20/×3)', tipoDano: 'Balístico', alcance: 'Curto', municao: 'Balas Curtas', espacos: 1, efeito: 'Automática (rajada).', confianca: 1 },
    { nome: 'Fuzil de Assalto', grupo: 'armas', tipoArma: 'distancia', categoria: 'Tática', empunhadura: 'Duas Mãos', dano: '2d10', critico: '19 (19-20/×3)', tipoDano: 'Balístico', alcance: 'Médio', municao: 'Balas Longas', espacos: 2, efeito: 'Automática (rajada).', confianca: 2 },
    { nome: 'Fuzil de Precisão', grupo: 'armas', tipoArma: 'distancia', categoria: 'Tática', empunhadura: 'Duas Mãos', dano: '2d10', critico: '19 (19-20/×3)', tipoDano: 'Balístico', alcance: 'Longo', municao: 'Balas Longas', espacos: 2, efeito: '', confianca: 2 },
    { nome: 'Metralhadora', grupo: 'armas', tipoArma: 'distancia', categoria: 'Pesada', empunhadura: 'Duas Mãos', dano: '2d12', critico: '19 (19-20/×3)', tipoDano: 'Balístico', alcance: 'Médio', municao: 'Balas Longas', espacos: 2, efeito: 'Automática (rajada).', confianca: 1 },
    { nome: 'Bazuca', grupo: 'armas', tipoArma: 'distancia', categoria: 'Pesada', empunhadura: 'Duas Mãos', dano: '10d8', critico: '×2 (padrão)', tipoDano: 'Impacto', alcance: 'Médio', municao: 'Foguetes', espacos: 2, efeito: '', confianca: 1 },
    { nome: 'Lança-chamas', grupo: 'armas', tipoArma: 'distancia', categoria: 'Pesada', empunhadura: 'Duas Mãos', dano: '6d6', critico: '×2 (padrão)', tipoDano: '(não especificado na fonte, provavelmente Fogo)', alcance: 'Curto', municao: 'Combustível', espacos: 2, efeito: '', confianca: 1 },

    // ============================================================
    // MUNIÇÕES
    // ============================================================
    { nome: 'Balas Curtas', grupo: 'municoes', categoria: 'Munição', compativel: 'Pistola, Revólver, Submetralhadora', espacos: 1, efeito: 'Um pacote dura duas cenas de combate.', confianca: 2 },
    { nome: 'Balas Longas', grupo: 'municoes', categoria: 'Munição', compativel: 'Fuzil de Caça, Fuzil de Assalto, Fuzil de Precisão, Metralhadora', espacos: 1, efeito: 'Um pacote (20 unidades) dura uma cena de combate.', confianca: 2 },
    { nome: 'Cartuchos', grupo: 'municoes', categoria: 'Munição', compativel: 'Espingarda', espacos: 1, efeito: 'Um pacote dura uma cena de combate.', confianca: 2 },
    { nome: 'Flechas', grupo: 'municoes', categoria: 'Munição', compativel: 'Arco, Besta, Arco Composto, Balestra', espacos: 1, efeito: 'Podem ser reaproveitadas após o combate; um pacote dura uma missão inteira.', confianca: 2 },
    { nome: 'Foguetes', grupo: 'municoes', categoria: 'Munição', compativel: 'Bazuca', espacos: 1, efeito: 'Cada foguete dura um único disparo.', confianca: 2 },
    { nome: 'Combustível', grupo: 'municoes', categoria: 'Munição', compativel: 'Lança-chamas', espacos: 1, efeito: 'Um pacote de combustível para o lança-chamas.', confianca: 1 },

    // ============================================================
    // PROTEÇÕES (alimentam o bônus de Equipamento da Defesa)
    // ============================================================
    { nome: 'Proteção Leve', grupo: 'protecoes', categoria: 'Leve', tipoProtecao: 'corpo', espacos: 2, defesaBonus: 5, efeito: 'Jaqueta de couro pesada ou colete de kevlar, usada por seguranças e policiais. Sem penalidade de carga.', confianca: 2 },
    { nome: 'Proteção Pesada', grupo: 'protecoes', categoria: 'Pesada', tipoProtecao: 'corpo', espacos: 5, defesaBonus: 10, efeito: 'Capacete, ombreiras, joelheiras, caneleiras e colete de kevlar. Resistência a balístico, corte, impacto e perfuração 2. Penalidade: -5 em testes de perícia afetados por carga. ⚠ Espaços: uma fonte (guia rápido, resumido) diz 2 em vez de 5 — mantido 5 por vir da fonte mais detalhada (livro completo), mas não é 100% certo.', confianca: 1 },
    { nome: 'Escudo', grupo: 'protecoes', categoria: 'Pesada', tipoProtecao: 'escudo', espacos: 1, defesaBonus: 2, efeito: 'Empunhado em uma mão. Conta como proteção pesada para efeitos de proficiência. Bônus acumula com o de outra proteção equipada.', confianca: 1 },

    // ============================================================
    // ITENS GERAIS / TÁTICOS / EXPLOSIVOS / NÃO LETAIS
    // ============================================================
    { nome: 'Granada de Fragmentação', grupo: 'geral', categoria: 'Explosivo', espacos: 1, efeito: 'Dano em área ao explodir.' },
    { nome: 'Granada de Atordoamento', grupo: 'geral', categoria: 'Explosivo', espacos: 1, efeito: 'Atordoa alvos em área. Não letal.' },
    { nome: 'Granada de Fumaça', grupo: 'geral', categoria: 'Explosivo', espacos: 1, efeito: 'Cria uma área de fumaça, reduz visibilidade.' },
    { nome: 'Spray de Pimenta', grupo: 'geral', categoria: 'Não Letal', espacos: 1, efeito: 'Incapacita temporariamente a curta distância.' },
    { nome: 'Taser', grupo: 'geral', categoria: 'Não Letal', espacos: 1, efeito: 'Choque elétrico, pode atordoar o alvo.' },
    { nome: 'Kit Médico', grupo: 'geral', categoria: 'Item Geral', espacos: 1, efeito: 'Permite estabilizar/curar Vida fora de combate.' },
    { nome: 'Lanterna', grupo: 'geral', categoria: 'Item Geral', espacos: 1, efeito: 'Ilumina ambientes escuros.' },
    { nome: 'Corda (10m)', grupo: 'geral', categoria: 'Item Geral', espacos: 1, efeito: 'Escalar, amarrar, resgatar.' },
    { nome: 'Kit de Arrombamento', grupo: 'geral', categoria: 'Item Geral', espacos: 1, efeito: 'Facilita testes de Crime para abrir fechaduras.' },
    { nome: 'Câmera / Gravador', grupo: 'geral', categoria: 'Item Geral', espacos: 1, efeito: 'Registra evidências de atividade paranormal.' },
    { nome: 'Rádio Comunicador', grupo: 'geral', categoria: 'Item Geral', espacos: 1, efeito: 'Comunicação entre agentes a distância.' },
    { nome: 'Laboratório Portátil', grupo: 'geral', categoria: 'Item Geral', espacos: 1, efeito: 'Auxilia testes de Ciências em campo.' },
    { nome: 'Equipamento de Proteção (EPI)', grupo: 'geral', categoria: 'Item Geral', espacos: 1, efeito: 'Protege contra contaminação/exposição.' },
    { nome: 'Sal Grosso', grupo: 'geral', categoria: 'Ocultismo', espacos: 1, efeito: 'Usado em barreiras e rituais de proteção simples.' },
    { nome: 'Água Benta', grupo: 'geral', categoria: 'Ocultismo', espacos: 1, efeito: 'Eficaz contra certas entidades paranormais.' },
    { nome: 'Medalhão de Fé', grupo: 'geral', categoria: 'Ocultismo', espacos: 1, efeito: 'Item de proteção ligado à crença/religião.' },
];

// Rótulos e ordem das abas da modal de adicionar item.
export const GRUPOS = [
    { chave: 'armas', label: 'Armas' },
    { chave: 'municoes', label: 'Munições' },
    { chave: 'protecoes', label: 'Proteções' },
    { chave: 'geral', label: 'Geral' },
];

// Espaços disponíveis sem penalidade, a partir da Força.
export function espacosMaximos(forca) {
    return 5 + 5 * Math.max(0, Number(forca) || 0);
}

// Limite absoluto "sobrecarregado" — acima disso o livro não deixa
// carregar mais. Entre o normal e esse limite, o personagem sofre
// penalidade (-5 em Atletismo/Furtividade, -3m de deslocamento) — o
// app avisa isso, mas não aplica a penalidade automaticamente ainda.
export function espacosSobrecarga(forca) {
    return espacosMaximos(forca) * 2;
}

export function espacosUsados(itens) {
    return (itens || []).reduce((total, item) => {
        return total + (Number(item.espacos) || 0) * (Number(item.quantidade) || 1);
    }, 0);
}

// 'normal' | 'sobrecarregado' (penalidade) | 'excesso' (acima do limite absoluto)
export function estadoCarga(usados, forca) {
    const max = espacosMaximos(forca);
    const limite = espacosSobrecarga(forca);
    if (usados <= max) return 'normal';
    if (usados <= limite) return 'sobrecarregado';
    return 'excesso';
}

export function tipoProtecaoDoItem(item) {
    if (item.tipoProtecao) return item.tipoProtecao;
    const doCatalogo = ITENS_CATALOGO.find(c => c.grupo === 'protecoes' && c.nome === item.nome);
    return doCatalogo ? doCatalogo.tipoProtecao : undefined;
}

export function defesaDoInventario(itens) {
    const equipadas = (itens || []).filter(item => item.grupo === 'protecoes' && item.equipado);
    const corpo = equipadas.filter(item => tipoProtecaoDoItem(item) === 'corpo');
    const resto = equipadas.filter(item => tipoProtecaoDoItem(item) !== 'corpo');
    const bonusCorpo = corpo.reduce((max, item) => Math.max(max, Number(item.defesaBonus) || 0), 0);
    const bonusResto = resto.reduce((total, item) => total + (Number(item.defesaBonus) || 0), 0);
    return bonusCorpo + bonusResto;
}
