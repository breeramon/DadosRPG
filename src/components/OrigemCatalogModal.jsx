// ============================================================
// OrigemCatalogModal.jsx
//
// Modal "Escolher Origem" — catálogo das Origens oficiais de Ordem
// Paranormal (ver src/lib/origens.js), com busca por nome e cartões
// expansíveis mostrando descrição, Perícias Treinadas e o Poder de
// Origem. Diferente da RitualCatalogModal (onde dá pra ir clicando em
// vários rituais sem fechar a modal), aqui é SELEÇÃO ÚNICA — um
// personagem só tem uma Origem por vez, então escolher uma diferente
// SUBSTITUI a atual (não acumula). Quem usa esta modal decide o que
// fazer com a escolha e fecha a modal (ver onEscolher).
//
// Compartilhada entre CharacterFormPage.jsx (criação/edição) e
// CharacterSheetPage.jsx (trocar a Origem direto na ficha já criada) —
// diferente do RitualCatalogModal histórico, que ficou duplicado por
// segurança; aqui não há versão legada pra arriscar quebrar, então um
// componente só mesmo.
// ============================================================

import { useEffect, useMemo, useState } from 'react';
import { ORIGENS_CATALOGO } from '@/lib/origens';

export default function OrigemCatalogModal({ aberto, onFechar, origemAtual, onEscolher }) {
    const [busca, setBusca] = useState('');
    const [expandidos, setExpandidos] = useState(() => new Set());

    useEffect(() => {
        if (!aberto) return;
        setBusca('');
        setExpandidos(new Set());
    }, [aberto]);

    useEffect(() => {
        if (!aberto) return;
        function onKeyDown(ev) {
            if (ev.key === 'Escape') onFechar();
        }
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [aberto, onFechar]);

    const cardsFiltrados = useMemo(() => {
        const termo = busca.trim().toLowerCase();
        if (!termo) return ORIGENS_CATALOGO;
        return ORIGENS_CATALOGO.filter(o => o.nome.toLowerCase().includes(termo));
    }, [busca]);

    function toggleExpandido(nome) {
        setExpandidos(prev => {
            const next = new Set(prev);
            if (next.has(nome)) next.delete(nome); else next.add(nome);
            return next;
        });
    }

    if (!aberto) return null;

    return (
        <div className="modal-overlay" onClick={ev => { if (ev.target === ev.currentTarget) onFechar(); }}>
            <div className="modal-box wide">
                <div className="modal-header">
                    <h3>Escolher Origem</h3>
                    <button type="button" className="modal-close" title="Fechar" onClick={onFechar}>&times;</button>
                </div>

                <input
                    type="text"
                    className="modal-search-input"
                    placeholder="Buscar origem..."
                    value={busca}
                    onChange={e => setBusca(e.target.value)}
                />

                <div className="modal-item-cards">
                    {cardsFiltrados.length === 0 && (
                        <div className="modal-item-cards-empty">Nenhuma origem encontrada.</div>
                    )}
                    {cardsFiltrados.map(origem => {
                        const abertoCard = expandidos.has(origem.nome);
                        const atual = origem.nome === origemAtual;
                        return (
                            <div className={`modal-item-card origem-card${abertoCard ? ' expanded' : ''}`} key={origem.nome}>
                                <div className="modal-item-card-header" onClick={() => toggleExpandido(origem.nome)}>
                                    <span className="modal-item-card-chevron">▶</span>
                                    <div className="modal-item-card-info">
                                        <div className="modal-item-card-title-row">
                                            <span className="modal-item-card-nome">{origem.nome}</span>
                                            {atual && <span className="modal-item-card-badge badge-auto">Atual</span>}
                                        </div>
                                        <div className="modal-item-card-sub">{origem.descricao}</div>
                                    </div>
                                    <button
                                        type="button"
                                        className={`modal-item-card-add${atual ? ' added' : ''}`}
                                        title={atual ? 'Já é a Origem atual' : 'Escolher esta Origem'}
                                        disabled={atual}
                                        onClick={ev => { ev.stopPropagation(); onEscolher(origem); }}
                                    >
                                        {atual ? '✓' : '+'}
                                    </button>
                                </div>
                                <div className={`modal-item-card-body${abertoCard ? '' : ' hidden'}`}>
                                    <div className="origem-campo">
                                        <span className="modal-item-stat-label">Perícias Treinadas</span>
                                        <span className="modal-item-stat-value">
                                            {origem.periciasTreinadas.length ? origem.periciasTreinadas.join(', ') : (origem.notaPericias || '—')}
                                        </span>
                                    </div>
                                    <div className="origem-campo">
                                        <span className="modal-item-stat-label">Poder de Origem — {origem.poder.nome}</span>
                                        <span className="modal-item-stat-value">{origem.poder.descricao}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
