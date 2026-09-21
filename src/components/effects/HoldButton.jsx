// ============================================================
// HoldButton.jsx
//
// Botão de "segure para confirmar" (React Bits "Hold Button",
// reimplementado do zero em CSS + JS puro): em vez de disparar
// onConfirm no primeiro clique, preenche uma barrinha por baixo do
// ícone enquanto o botão fica pressionado -- só chama onConfirm se o
// preenchimento chegar ao fim. Soltar antes cancela sem efeito
// nenhum.
//
// Criado pra dar uma rede de segurança nas ações destrutivas rápidas
// da Ficha que hoje removem na hora com um clique só (Esquecer ritual,
// Remover ataque, Remover item -- ver RitualTab/CombateTab/
// InventarioTab.jsx): diferente da Excluir Personagem, que já tem uma
// modal de confirmação com "digite o nome" (ver CharactersPage.jsx),
// essas ficavam sem nenhuma proteção contra um clique sem querer no
// meio de uma sessão.
//
// stopPropagation aqui dentro (não deixado pro chamador) porque todo
// uso atual está dentro do cabeçalho clicável de um cartão expansível
// (onClick de abrir/fechar) -- sem isso, tanto o mousedown/touchstart
// quanto o "click" residual do soltar o botão iriam borbulhar e
// abrir/fechar o cartão por baixo enquanto o usuário só queria
// segurar o botão de remover.
//
// Uso: <HoldButton className="modal-item-card-remove" title="Remover"
//                   durationMs={650} onConfirm={() => ...}>
//        <TrashIcon />
//      </HoldButton>
// ============================================================

import { useRef, useState } from 'react';

const DURACAO_PADRAO_MS = 650;

export default function HoldButton({ children, className = '', onConfirm, durationMs = DURACAO_PADRAO_MS, ...rest }) {
    const [segurando, setSegurando] = useState(false);
    const timeoutRef = useRef(null);

    function iniciar(e) {
        e.stopPropagation();
        setSegurando(true);
        timeoutRef.current = setTimeout(() => {
            setSegurando(false);
            onConfirm && onConfirm();
        }, durationMs);
    }

    function cancelar(e) {
        e.stopPropagation();
        clearTimeout(timeoutRef.current);
        setSegurando(false);
    }

    return (
        <button
            type="button"
            className={`hold-button${segurando ? ' hold-button-segurando' : ''} ${className}`}
            style={{ '--hold-duration': `${durationMs}ms` }}
            onMouseDown={iniciar}
            onMouseUp={cancelar}
            onMouseLeave={cancelar}
            onTouchStart={iniciar}
            onTouchEnd={cancelar}
            onTouchCancel={cancelar}
            onClick={e => e.stopPropagation()}
            {...rest}
        >
            <span className="hold-button-progress" aria-hidden="true" />
            <span className="hold-button-icon">{children}</span>
        </button>
    );
}
