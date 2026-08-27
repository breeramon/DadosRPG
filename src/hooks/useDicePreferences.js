// ============================================================
// useDicePreferences.js
//
// Preferência de tema/cor dos dados 3D (ver DiceThemeModal.jsx e
// diceThemes.js) — é da CONTA do usuário, não de um personagem
// específico: escolheu uma vez, vale pra todas as fichas, em qualquer
// aparelho onde ele logar (fica salva no Firestore via
// Preferences.get/save, ver firebase.js).
//
// "carregado" começa false pra CharacterSheetPage saber esperar a
// resposta do Firestore antes de aplicar alguma coisa na DiceBox —
// sem isso, aplicaria sempre o tema "default" (o valor inicial de
// "prefs" aqui) por uma fração de segundo antes da preferência de
// verdade chegar, um "flash" desnecessário pra quem tem outro tema
// escolhido.
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { Preferences } from '@/services/firebase';

const TEMA_PADRAO = 'default';

export function useDicePreferences(uid) {
    const [prefs, setPrefs] = useState({ tema: TEMA_PADRAO, cor: null });
    const [carregado, setCarregado] = useState(false);
    const uidRef = useRef(uid);
    uidRef.current = uid;

    useEffect(() => {
        let cancelado = false;
        setCarregado(false);
        Preferences.get(uid)
            .then(dados => {
                if (cancelado) return;
                if (dados && dados.dadosTema) {
                    setPrefs({ tema: dados.dadosTema, cor: dados.dadosCor || null });
                }
            })
            .catch(err => {
                console.warn('[dice-preferences] Não foi possível carregar as preferências de dado — usando o padrão.', err);
            })
            .finally(() => {
                if (!cancelado) setCarregado(true);
            });
        return () => { cancelado = true; };
    }, [uid]);

    // Atualiza o estado local na hora (pra DiceThemeModal/CharacterSheetPage
    // aplicarem o visual imediatamente) e salva no Firestore em paralelo —
    // se o salvamento falhar (rede caiu etc.), a escolha ainda vale pro
    // resto desta sessão, só não persiste pra próxima vez.
    const salvar = useCallback((novoTema, novaCor) => {
        setPrefs({ tema: novoTema, cor: novaCor });
        return Preferences.save(uidRef.current, { dadosTema: novoTema, dadosCor: novaCor }).catch(err => {
            console.warn('[dice-preferences] Não foi possível salvar as preferências de dado.', err);
            throw err;
        });
    }, []);

    return { prefs, carregado, salvar };
}
