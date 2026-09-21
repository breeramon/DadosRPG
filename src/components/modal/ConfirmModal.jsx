// ============================================================
// ConfirmModal.jsx
//
// Modal de confirmação genérica pra ações destrutivas rápidas
// (Esquecer ritual, Remover ataque, Remover item -- ver
// RitualTab/CombateTab/InventarioTab.jsx): clicar no botão de remover
// abre essa modal em vez de remover na hora, e só remove de verdade se
// o usuário clicar de novo no botão de confirmar dela.
//
// Mesma estrutura/classes do resto das modais do projeto (.modal-
// overlay/.modal-box, trava o scroll de fundo, fecha com Esc -- ver
// DiceThemeModal.jsx) e da modal de "Excluir personagem" em
// CharactersPage.jsx, só que sem o "digite o nome pra confirmar":
// aqui a ação é sempre reversível voltando a adicionar o mesmo
// ritual/ataque/item de novo, então um clique de confirmação já basta
// -- diferente de excluir o personagem inteiro, que é permanente.
//
// Uso: <ConfirmModal
//        aberto={!!pendente}
//        titulo="Remover item"
//        mensagem={<>Remover <strong>{pendente?.nome}</strong> do inventário?</>}
//        textoConfirmar="Remover"
//        onFechar={() => setPendente(null)}
//        onConfirmar={() => { remover(pendente); setPendente(null); }}
//      />
// ============================================================

import { useEffect } from 'react';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';

export default function ConfirmModal({
    aberto,
    titulo,
    mensagem,
    textoConfirmar = 'Remover',
    textoCancelar = 'Cancelar',
    onConfirmar,
    onFechar,
}) {
    useLockBodyScroll(aberto);

    useEffect(() => {
        if (!aberto) return;
        function onKeyDown(ev) {
            if (ev.key === 'Escape') onFechar();
        }
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [aberto, onFechar]);

    if (!aberto) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-box modal-box-danger">
                <div className="modal-header">
                    <h3>{titulo}</h3>
                    <button type="button" className="modal-close" title="Fechar" onClick={onFechar}>&times;</button>
                </div>

                <p className="modal-confirm-text">{mensagem}</p>

                <div className="modal-item-actions">
                    <button type="button" className="btn-secondary" onClick={onFechar}>{textoCancelar}</button>
                    <button type="button" className="btn-danger" autoFocus onClick={onConfirmar}>{textoConfirmar}</button>
                </div>
            </div>
        </div>
    );
}
