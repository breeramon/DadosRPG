// ============================================================
// useAtalhosPreferences.js
//
// Preferência de "atalhos de teclado pra rolagem" (R = repetir a
// última perícia rolada, Espaço = 1d20 avulso — ver
// CharacterSheetPage.jsx) — é da CONTA do usuário, não de um
// personagem específico: ativa/desativa uma vez, vale pra todas as
// fichas, em qualquer aparelho onde ele logar (fica salva no
// Firestore via Preferences.get/save, ver firebase.js).
//
// Começa DESATIVADA por padrão (ativos: false) — atalho de teclado
// pra rolar dado é o tipo de coisa que pode surpreender quem não
// pediu, então só liga depois que o usuário escolher explicitamente
// no botão da Ficha.
//
// "carregado" começa false pra CharacterSheetPage saber esperar a
// resposta do Firestore antes de deixar o botão de atalhos
// clicável -- sem isso, um clique bem no início poderia ser
// sobrescrito pela preferência de verdade chegando um instante
// depois.
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { Preferences } from '@/services/firebase';

export function useAtalhosPreferences(uid) {
    const [ativos, setAtivos] = useState(false);
    const [carregado, setCarregado] = useState(false);
    const uidRef = useRef(uid);
    uidRef.current = uid;

    useEffect(() => {
        let cancelado = false;
        setCarregado(false);
        Preferences.get(uid)
            .then(dados => {
                if (cancelado) return;
                if (dados && typeof dados.atalhosAtivos === 'boolean') {
                    setAtivos(dados.atalhosAtivos);
                }
            })
            .catch(err => {
                console.warn('[atalhos-preferences] Não foi possível carregar a preferência de atalhos — usando o padrão (desativado).', err);
            })
            .finally(() => {
                if (!cancelado) setCarregado(true);
            });
        return () => { cancelado = true; };
    }, [uid]);

    // Atualiza o estado local na hora (pro botão da Ficha refletir o
    // clique imediatamente) e salva no Firestore em paralelo -- se o
    // salvamento falhar (rede caiu etc.), a escolha ainda vale pro
    // resto desta sessão, só não persiste pra próxima vez.
    const salvar = useCallback((novoValor) => {
        setAtivos(novoValor);
        return Preferences.save(uidRef.current, { atalhosAtivos: novoValor }).catch(err => {
            console.warn('[atalhos-preferences] Não foi possível salvar a preferência de atalhos.', err);
            throw err;
        });
    }, []);

    return { ativos, carregado, salvar };
}
