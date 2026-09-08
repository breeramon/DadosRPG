// ============================================================
// NovoAtaqueModal.jsx
//
// Modal "Novo Ataque" da aba Combate da Ficha -- um formulário simples
// pra cadastrar um ataque manual (nome, dano, crítico, alcance,
// observações). Extraída de CharacterSheetPage.jsx no mesmo espírito
// da RitualCatalogModal.jsx: o estado do formulário fica local aqui
// dentro, e quem usa o componente só recebe o ataque pronto e decide
// como guardar.
//
// Props:
//   aberto              -- controla se a modal é renderizada
//   onFechar()           -- chamado ao clicar no X, apertar Esc ou
//                           depois de adicionar com sucesso
//   onAdicionar(ataque)  -- chamado com { nome, dano, critico, alcance,
//                           observacoes } já validado (nome não vazio)
// ============================================================

import { useEffect, useState } from 'react';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';

export default function NovoAtaqueModal({ aberto, onFechar, onAdicionar }) {
    const [nome, setNome] = useState('');
    const [dano, setDano] = useState('');
    const [critico, setCritico] = useState('');
    const [alcance, setAlcance] = useState('');
    const [observacoes, setObservacoes] = useState('');

    useLockBodyScroll(aberto);

    // Limpa o formulário toda vez que a modal abre de novo.
    useEffect(() => {
        if (!aberto) return;
        setNome('');
        setDano('');
        setCritico('');
        setAlcance('');
        setObservacoes('');
    }, [aberto]);

    useEffect(() => {
        if (!aberto) return;
        function onKeyDown(ev) {
            if (ev.key === 'Escape') onFechar();
        }
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [aberto, onFechar]);

    function handleAdicionar() {
        const nomeLimpo = nome.trim();
        if (!nomeLimpo) {
            window.alert('Dê um nome para o ataque.');
            return;
        }
        onAdicionar({
            nome: nomeLimpo,
            dano: dano.trim(),
            critico: critico.trim(),
            alcance: alcance.trim(),
            observacoes: observacoes.trim(),
        });
        onFechar();
    }

    if (!aberto) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-box">
                <div className="modal-header">
                    <h3>Novo Ataque</h3>
                    <button type="button" className="modal-close" title="Fechar" onClick={onFechar}>&times;</button>
                </div>

                <div className="modal-tab-content">
                    <div className="control-group full">
                        <label>Nome do ataque</label>
                        <input type="text" placeholder="Ex: Revólver" value={nome} onChange={e => setNome(e.target.value)} />
                    </div>
                    <div className="ataque-form-row">
                        <div className="control-group">
                            <label>Dano</label>
                            <input type="text" placeholder="Ex: 2d6" value={dano} onChange={e => setDano(e.target.value)} />
                        </div>
                        <div className="control-group">
                            <label>Crítico</label>
                            <input type="text" placeholder="Ex: 19/x3" value={critico} onChange={e => setCritico(e.target.value)} />
                        </div>
                        <div className="control-group">
                            <label>Alcance</label>
                            <input type="text" placeholder="Ex: Curto" value={alcance} onChange={e => setAlcance(e.target.value)} />
                        </div>
                    </div>
                    <div className="control-group full">
                        <label>Observações (opcional)</label>
                        <textarea rows={3} placeholder="Munição, propriedades especiais..." value={observacoes} onChange={e => setObservacoes(e.target.value)}></textarea>
                    </div>
                    <div className="modal-item-actions">
                        <button type="button" className="btn-action" onClick={handleAdicionar}>Adicionar</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
