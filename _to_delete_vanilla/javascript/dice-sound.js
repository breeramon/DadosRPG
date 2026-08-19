// ============================================================
// dice-sound.js
//
// Efeito sonoro de dados rolando, sintetizado na hora via Web Audio
// API — sem precisar baixar/hospedar nenhum arquivo de áudio (evita
// problema de licença de som pronto e de link quebrado). Toca uma
// sequência curta de "batidas" de ruído filtrado, parecido com dados
// caindo/chacoalhando numa mesa, toda vez que uma rolagem começa.
//
// Expõe: window.playDiceRollSound(qtdDados) -> void. Dispara e
// esquece (não trava a rolagem esperando o som acabar). Se o
// navegador não suportar Web Audio, ou ainda não liberou áudio por
// falta de interação do usuário, simplesmente não toca nada — não
// quebra a rolagem em si, que sempre depende só do resultado dos
// dados (aqui) e não do som.
// ============================================================

(function () {
    let audioCtx = null;

    function getContext() {
        if (!audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) return null;
            audioCtx = new AudioContextClass();
        }
        // Navegadores começam o contexto "suspenso" até o primeiro gesto
        // do usuário (clique) — como isso aqui só é chamado a partir de
        // um clique num botão de rolar, já dá pra retomar sem problema.
        if (audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => {});
        }
        return audioCtx;
    }

    // Uma "batida" curta de ruído filtrado com decaimento — o som de um
    // dado batendo na mesa/caixa. `tempo` é o instante (em segundos,
    // relativo a ctx.currentTime) em que essa batida deve soar.
    function tocarBatida(ctx, tempo, volume) {
        const duracao = 0.05 + Math.random() * 0.04;
        const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duracao));
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const dados = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            // Ruído branco com decaimento exponencial -- soa como um "toc" seco.
            const decaimento = 1 - (i / bufferSize);
            dados[i] = (Math.random() * 2 - 1) * decaimento;
        }

        const fonte = ctx.createBufferSource();
        fonte.buffer = buffer;

        const filtro = ctx.createBiquadFilter();
        filtro.type = 'bandpass';
        filtro.frequency.value = 800 + Math.random() * 1400; // varia o "tom" de cada batida
        filtro.Q.value = 0.7;

        const ganho = ctx.createGain();
        ganho.gain.setValueAtTime(volume, tempo);
        ganho.gain.exponentialRampToValueAtTime(0.001, tempo + duracao);

        fonte.connect(filtro);
        filtro.connect(ganho);
        ganho.connect(ctx.destination);

        fonte.start(tempo);
        fonte.stop(tempo + duracao);
    }

    window.playDiceRollSound = function playDiceRollSound(qtdDados) {
        const ctx = getContext();
        if (!ctx) return;

        // Trava entre 1 e 8 pra rolagens gigantes (ex: 10d6) não virarem
        // uma zoeira de batidas sobrepostas.
        const qtd = Math.max(1, Math.min(Number(qtdDados) || 1, 8));
        const batidas = 6 + qtd * 2; // mais dados = chacoalhar um pouco mais longo
        const duracaoTotal = 0.45;

        for (let i = 0; i < batidas; i++) {
            const tempo = ctx.currentTime + (i / batidas) * duracaoTotal * (0.6 + Math.random() * 0.4);
            const volume = 0.15 * (1 - (i / batidas) * 0.5); // vai diminuindo, como se os dados fossem parando
            tocarBatida(ctx, tempo, volume);
        }
    };
})();
