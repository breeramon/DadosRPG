// ============================================================
// useSalvamentoAutomatico.js
//
// Salvamento automático da Ficha (CharacterSheetPage.jsx): cada
// alteração feita durante o jogo (PV, PE, Sanidade, inventário,
// rituais, ataques, poderes...) chama salvarCampos({ campo: valor }) e
// este hook cuida de mandar pro Firestore.
//
// Antes isso era um setTimeout de 400ms solto dentro da própria
// página, e tinha um bug: se a pessoa fechasse ou recarregasse a aba
// (ou o celular matasse o navegador em segundo plano) dentro desses
// 400ms, o timer nunca chegava a disparar e a última alteração se
// perdia. Reproduzido em teste: tirar 5 de PV e recarregar logo em
// seguida -> voltava com a vida cheia. Também misturava campos de dois
// personagens se a ficha trocasse de id com algo ainda pendente.
//
// Como funciona agora (três camadas de proteção):
//
//   1) Agrupamento (igual antes): várias alterações seguidas dentro de
//      400ms viram UM update só no Firestore, em vez de um por clique.
//
//   2) Envio imediato quando a página vai sumir: se a aba ficar
//      escondida (troca de app no celular, minimizar, trocar de aba),
//      ou a página for fechada/recarregada, ou a ficha desmontar
//      (voltar pra "Meus Personagens", abrir outro personagem), o que
//      estiver pendente é enviado NA HORA, sem esperar os 400ms.
//
//   3) Cópia de segurança local (localStorage): toda alteração também
//      é gravada na hora no localStorage do navegador — gravação
//      síncrona, que termina antes da aba fechar, diferente do envio
//      pro Firestore (que é pela rede e pode ser cortado no meio). A
//      cópia só é apagada depois que o Firestore CONFIRMA que salvou.
//      Se a aba fechar antes disso (ou a internet cair), da próxima
//      vez que a ficha abrir, recuperarPendente() devolve essas
//      alterações pra página aplicar e reenviar (ver CharacterSheetPage).
// ============================================================

import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { Characters } from '@/services/firebase';

// Espera antes de enviar, pra agrupar cliques seguidos (ex: apertar
// "-1 PV" cinco vezes rápido vira um update só, com o valor final).
const ATRASO_ENVIO_MS = 400;

// Cópias de segurança mais antigas que isso são descartadas em vez de
// aplicadas. Proteção contra um caso raro: alteração ficou presa neste
// aparelho (ex: sem internet), a pessoa continuou jogando em OUTRO
// aparelho por dias, e só depois voltou aqui — aplicar a cópia antiga
// por cima sobrescreveria o progresso mais novo feito no outro
// aparelho. Uma semana cobre com folga "fechei a aba sem querer" e
// "fiquei sem internet na sessão".
const VALIDADE_COPIA_MS = 7 * 24 * 60 * 60 * 1000;

function chaveCopia(uid, id) {
    return `breusrpg_pendente_${uid}_${id}`;
}

// localStorage pode estar indisponível (aba anônima com armazenamento
// bloqueado, cota cheia...) — nesses casos a cópia de segurança só é
// pulada, o salvamento normal no Firestore continua funcionando.
function gravarCopia(uid, id, campos) {
    try {
        localStorage.setItem(chaveCopia(uid, id), JSON.stringify({ salvoEm: Date.now(), campos }));
    } catch {
        // sem cópia local, segue só com o Firestore
    }
}

function apagarCopia(uid, id) {
    try {
        localStorage.removeItem(chaveCopia(uid, id));
    } catch {
        // nada a fazer
    }
}

// Lê (e valida) a cópia de segurança de um personagem. Devolve o
// objeto de campos pendentes, ou null se não houver nada a recuperar.
// Exportada pra CharacterSheetPage chamar logo depois de carregar o
// personagem do Firestore.
export function recuperarPendente(uid, id) {
    try {
        const bruto = localStorage.getItem(chaveCopia(uid, id));
        if (!bruto) return null;
        const { salvoEm, campos } = JSON.parse(bruto);
        const valida = campos && typeof campos === 'object' && Object.keys(campos).length > 0;
        if (!valida || !salvoEm || Date.now() - salvoEm > VALIDADE_COPIA_MS) {
            apagarCopia(uid, id);
            return null;
        }
        return campos;
    } catch {
        return null;
    }
}

export function useSalvamentoAutomatico(uid, id) {
    // Campos alterados que ainda não foram enviados pro Firestore.
    const pendenteRef = useRef({});
    const timeoutRef = useRef(null);
    // Qual personagem a ficha está mostrando AGORA. A resposta do
    // Firestore pode chegar depois que a pessoa já trocou de
    // personagem — nesse caso pendenteRef já é do personagem NOVO, e o
    // .then/.catch abaixo não pode mexer nele com a cópia do antigo.
    // (atualizado num efeito, não direto no render, pra seguir a regra
    // do React de não escrever em ref durante a renderização.)
    const atualRef = useRef(`${uid}/${id}`);
    useEffect(() => {
        atualRef.current = `${uid}/${id}`;
    }, [uid, id]);

    // Envia AGORA o que estiver pendente (se houver algo). Usado tanto
    // pelo timer normal de 400ms quanto pelos gatilhos de "a página vai
    // sumir" (ver useEffect abaixo).
    const enviarAgora = useCallback(() => {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;

        const aEnviar = pendenteRef.current;
        if (Object.keys(aEnviar).length === 0) return;
        pendenteRef.current = {};

        Characters.update(uid, id, aEnviar)
            .then(() => {
                if (atualRef.current !== `${uid}/${id}`) {
                    // Já trocou de personagem: o que era deste foi salvo,
                    // e tudo dele foi enviado antes da troca (cleanup).
                    apagarCopia(uid, id);
                    return;
                }
                // Firestore confirmou. Se nada novo foi alterado enquanto
                // o envio estava em andamento, a cópia local pode sumir;
                // se teve alteração nova nesse meio-tempo, a cópia passa
                // a conter só ela (o que acabou de salvar já está seguro).
                if (Object.keys(pendenteRef.current).length === 0) {
                    apagarCopia(uid, id);
                } else {
                    gravarCopia(uid, id, pendenteRef.current);
                }
            })
            .catch(err => {
                console.error('[character-sheet] Erro ao salvar alterações da ficha:', err);
                toast.error('Não foi possível salvar — verifique sua conexão.', { id: 'sheet-autosave-error' });
                if (atualRef.current !== `${uid}/${id}`) {
                    // Já trocou de personagem: deixa o que falhou só na
                    // cópia local DESTE personagem (recuperada na próxima
                    // vez que ele abrir), sem misturar com a fila do novo.
                    gravarCopia(uid, id, { ...aEnviar, ...(recuperarPendente(uid, id) || {}) });
                    return;
                }
                // Devolve o que falhou pra fila (sem passar por cima de
                // alterações mais novas feitas depois), pra ir junto no
                // próximo envio. A cópia local continua lá também, então
                // nada se perde mesmo se a aba for fechada agora.
                pendenteRef.current = { ...aEnviar, ...pendenteRef.current };
                gravarCopia(uid, id, pendenteRef.current);
            });
    }, [uid, id]);

    // Chamado pela ficha a cada alteração. Grava a cópia local na hora
    // e agenda o envio pro Firestore em 400ms (reiniciando o relógio se
    // vier outra alteração antes disso).
    const salvarCampos = useCallback((campos) => {
        Object.assign(pendenteRef.current, campos);
        gravarCopia(uid, id, pendenteRef.current);
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(enviarAgora, ATRASO_ENVIO_MS);
    }, [uid, id, enviarAgora]);

    // Gatilhos de "a página vai sumir": manda o pendente na hora.
    //  - visibilitychange (hidden): o mais confiável no celular — é o
    //    último evento garantido antes do sistema poder matar a aba
    //    em segundo plano (trocar de app, bloquear a tela).
    //  - pagehide: fechar/recarregar a aba no computador.
    //  - cleanup do efeito: a ficha desmontou (navegação dentro do
    //    site) ou trocou de personagem (id mudou) — envia o que era do
    //    personagem ANTERIOR com o id dele (enviarAgora antigo, ainda
    //    preso ao id de antes), sem misturar com o próximo.
    useEffect(() => {
        function aoEsconder() {
            if (document.visibilityState === 'hidden') enviarAgora();
        }
        document.addEventListener('visibilitychange', aoEsconder);
        window.addEventListener('pagehide', enviarAgora);
        return () => {
            document.removeEventListener('visibilitychange', aoEsconder);
            window.removeEventListener('pagehide', enviarAgora);
            enviarAgora();
        };
    }, [enviarAgora]);

    return { salvarCampos };
}
