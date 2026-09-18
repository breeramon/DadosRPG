// ============================================================
// useListaAnimada.js
//
// Hook auxiliar do "Animated List" (React Bits -- ver Accordion.jsx e
// Stepper.jsx nesta mesma pasta pros outros componentes React Bits do
// projeto, mesma ideia de zero dependência nova): centraliza o "atraso
// de saída" usado nas listas de Inventário e Rituais
// (InventarioTab.jsx / RitualTab.jsx) -- marca um item como "saindo"
// (pra CSS aplicar o fade/encolhe via uma classe), espera a transição
// acabar, e só então chama o callback que de fato remove o item dos
// dados. Guarda um Set (não um valor único) pra suportar remover mais
// de um item em sequência rápida sem que um cancele a animação do
// outro.
//
// A entrada (item novo aparecendo) não precisa de hook nenhum -- é só
// uma animação CSS que dispara sozinha quando o navegador cria o nó
// (ver @keyframes listItemEntrar no index.css); só a saída precisa de
// JS, porque tem que esperar a transição antes de sumir da lista de
// verdade.
//
// Uso:
//   const { estaSaindo, iniciarSaida } = useListaAnimada();
//   ...
//   className={estaSaindo(chave) ? 'algo-saindo' : ''}
//   onClick={() => iniciarSaida(chave, () => onRemover(chave))}
// ============================================================

import { useCallback, useState } from 'react';

const DURACAO_SAIDA_MS = 200;

export default function useListaAnimada(duracaoMs = DURACAO_SAIDA_MS) {
    const [saindo, setSaindo] = useState(() => new Set());

    const estaSaindo = useCallback(chave => saindo.has(chave), [saindo]);

    const iniciarSaida = useCallback((chave, aoConcluir) => {
        setSaindo(prev => new Set(prev).add(chave));
        setTimeout(() => {
            aoConcluir();
            setSaindo(prev => {
                const next = new Set(prev);
                next.delete(chave);
                return next;
            });
        }, duracaoMs);
    }, [duracaoMs]);

    return { estaSaindo, iniciarSaida };
}
