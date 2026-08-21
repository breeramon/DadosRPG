// ============================================================
// RitualCatalogModal.jsx
//
// A modal "Adicionar Ritual" (catálogo filtrável por Elemento + Círculo,
// com busca), extraída da versão que já existia embutida em
// CharacterSheetPage.jsx pra poder ser reaproveitada também na tela de
// Criar/Editar Personagem (CharacterFormPage.jsx) — antes só dava pra
// escolher rituais depois de já ter criado o personagem, direto na
// ficha.
//
// A ficha (CharacterSheetPage.jsx) continua com sua própria cópia
// inline dessa modal por enquanto (não foi mexida nesta mudança, pra
// não arriscar regressão num arquivo grande e já testado) — esta versão
// exportada é a usada pelo formulário. Os dois ficam visualmente
// idênticos porque a marcação/classes CSS são as mesmas
// (.modal-item-card, .modal-subtab, etc. — ver index.css).
//
// Também exporta os pequenos helpers de exibição (elementoSlug,
// subtituloRitual, statsDoRitual, TrashIcon) usados tanto pela modal
// quanto pela lista de "Rituais Conhecidos" do formulário.
// ============================================================

import { useEffect, useMemo, useState } from 'react';
import * as OPR from '@/lib/rituais';
import * as OP from '@/lib/pericias';

// Os nomes dos elementos no catálogo (Conhecimento/Energia/Morte/
// Sangue/Medo) não têm acento, mas a normalização fica aqui pra não
// quebrar se algum dia mudar.
export function elementoSlug(elemento) {
    return String(elemento || '').trim().toLowerCase();
}

// Texto curto embaixo do nome no cartão de ritual.
export function subtituloRitual(ritual) {
    return `${ritual.execucao || '—'} · Alcance ${ritual.alcance || '—'}`;
}

// Linhas de estatística mostradas quando o cartão de ritual expande —
// características fixas de todo ritual, mais o custo em PE (fixo por
// círculo — ver CUSTO_PE_POR_CIRCULO) e o dano/cura só quando existe.
export function statsDoRitual(ritual) {
    const stats = [
        { label: 'Execução', valor: ritual.execucao || '—' },
        { label: 'Alcance', valor: ritual.alcance || '—' },
        { label: ritual.area ? 'Área' : 'Alvo', valor: ritual.area || ritual.alvo || '—' },
        { label: 'Duração', valor: ritual.duracao || '—' },
    ];
    if (ritual.resistencia) stats.push({ label: 'Resistência', valor: ritual.resistencia });
    stats.push({ label: 'Custo', valor: `${OPR.CUSTO_PE_POR_CIRCULO[ritual.circulo] || '?'} PE` });
    if (ritual.dano) stats.push({ label: 'Dano/Cura', valor: ritual.dano });
    return stats;
}

// Ícone de lixeira (SVG inline, sem depender de nenhuma lib de ícones)
// — usado nos botões de "remover" que envolvem rituais (ficha e
// formulário), pra manter a mesma consistência visual entre telas.
export function TrashIcon() {
    return (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
        </svg>
    );
}

// ---------------------------------------------------------------
// A modal em si.
//
// Props:
//   aberto             — controla se a modal é renderizada
//   onFechar()          — chamado ao clicar fora, no X ou apertar Esc
//   trilha, nex         — só pra mostrar o aviso "seu NEX libera até o
//                         Xº círculo" (Ocultista) — não impede escolher
//                         um ritual de círculo mais alto, só avisa,
//                         igual ao inventário com o limite de carga
//   rituaisConhecidos  — array dos já conhecidos, pra marcar "já
//                         conhecido" (✓, desabilitado) nos cartões
//   onAdicionar(ritual) — chamado ao clicar "+" num cartão; quem chama
//                         decide se aceita (duplicata etc.) e mostra o
//                         feedback
//   feedback            — texto de feedback (controlado por quem usa a
//                         modal, ex: "X adicionado aos rituais")
// ---------------------------------------------------------------
export default function RitualCatalogModal({ aberto, onFechar, trilha, nex, rituaisConhecidos, onAdicionar, feedback }) {
    const [elementoAtivo, setElementoAtivo] = useState(OPR.ELEMENTOS_RITUAL[0]);
    const [circuloFiltro, setCirculoFiltro] = useState(0); // 0 = todos os círculos
    const [busca, setBusca] = useState('');
    const [expandidos, setExpandidos] = useState(() => new Set());

    // Reseta os filtros toda vez que a modal abre de novo.
    useEffect(() => {
        if (!aberto) return;
        setElementoAtivo(OPR.ELEMENTOS_RITUAL[0]);
        setCirculoFiltro(0);
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

    const circuloLiberado = useMemo(
        () => (trilha === 'Ocultista' ? OP.circuloRitualLiberado(nex) : 0),
        [trilha, nex]
    );

    const cardsFiltrados = useMemo(() => {
        const termo = busca.trim().toLowerCase();
        return OPR.rituaisDoElemento(elementoAtivo).filter(ritual => {
            if (circuloFiltro && ritual.circulo !== circuloFiltro) return false;
            if (termo && !ritual.nome.toLowerCase().includes(termo)) return false;
            return true;
        });
    }, [elementoAtivo, circuloFiltro, busca]);

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
                    <h3>Adicionar Ritual</h3>
                    <button type="button" className="modal-close" title="Fechar" onClick={onFechar}>&times;</button>
                </div>

                <div className="modal-catalogo-subtabs">
                    {OPR.ELEMENTOS_RITUAL.map(el => (
                        <button
                            type="button"
                            key={el}
                            className={`modal-subtab elemento-${elementoSlug(el)}${el === elementoAtivo ? ' active' : ''}`}
                            onClick={() => setElementoAtivo(el)}
                        >
                            {el}
                        </button>
                    ))}
                </div>

                <div className="modal-catalogo-subtabs modal-circulo-filtro">
                    {[0, 1, 2, 3, 4].map(c => (
                        <button
                            type="button"
                            key={c}
                            className={`modal-subtab${c === circuloFiltro ? ' active' : ''}`}
                            onClick={() => setCirculoFiltro(c)}
                        >
                            {c === 0 ? 'Todos os círculos' : `${c}º círculo`}
                        </button>
                    ))}
                </div>

                <input
                    type="text"
                    className="modal-search-input"
                    placeholder="Buscar ritual..."
                    value={busca}
                    onChange={e => setBusca(e.target.value)}
                />

                {trilha === 'Ocultista' && (
                    <div className="rituals-nex-info">
                        Seu NEX libera até o{' '}
                        <strong>{circuloLiberado > 0 ? `${circuloLiberado}º círculo` : 'nenhum círculo ainda'}</strong>.
                    </div>
                )}

                <div className="modal-item-cards">
                    {cardsFiltrados.length === 0 && (
                        <div className="modal-item-cards-empty">Nenhum ritual encontrado.</div>
                    )}
                    {cardsFiltrados.map(ritual => {
                        const abertoCard = expandidos.has(ritual.nome);
                        const jaConhece = rituaisConhecidos.some(r => r.nome === ritual.nome);
                        const bloqueadoPorNex = trilha === 'Ocultista' && ritual.circulo > circuloLiberado;
                        return (
                            <div className={`modal-item-card ritual-card elemento-${elementoSlug(ritual.elemento)}${abertoCard ? ' expanded' : ''}`} key={ritual.nome}>
                                <div className="modal-item-card-header" onClick={() => toggleExpandido(ritual.nome)}>
                                    <span className="modal-item-card-chevron">▶</span>
                                    <div className="modal-item-card-info">
                                        <div className="modal-item-card-title-row">
                                            <span className="modal-item-card-nome">{ritual.nome}</span>
                                            <span className={`modal-item-card-badge badge-elemento-${elementoSlug(ritual.elemento)}`}>{ritual.elemento}</span>
                                            <span className="modal-item-card-badge badge-circulo">{ritual.circulo}º círc.</span>
                                            {bloqueadoPorNex && (
                                                <span className="modal-item-card-badge badge-locked" title={`Seu NEX só libera até o ${circuloLiberado}º círculo`}>
                                                    NEX insuficiente
                                                </span>
                                            )}
                                        </div>
                                        <div className="modal-item-card-sub">{subtituloRitual(ritual)}</div>
                                    </div>
                                    <button
                                        type="button"
                                        className={`modal-item-card-add${jaConhece ? ' added' : ''}`}
                                        title={jaConhece ? 'Já conhecido' : 'Adicionar aos rituais'}
                                        disabled={jaConhece}
                                        onClick={ev => { ev.stopPropagation(); onAdicionar(ritual); }}
                                    >
                                        {jaConhece ? '✓' : '+'}
                                    </button>
                                </div>
                                <div className={`modal-item-card-body${abertoCard ? '' : ' hidden'}`}>
                                    <div className="modal-item-stats-grid">
                                        {statsDoRitual(ritual).map(({ label, valor }) => (
                                            <div className="modal-item-stat" key={label}>
                                                <span className="modal-item-stat-label">{label}</span>
                                                <span className="modal-item-stat-value">{valor}</span>
                                            </div>
                                        ))}
                                    </div>
                                    {ritual.descricao && <div className="modal-item-card-efeito">{ritual.descricao}</div>}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="modal-item-actions">
                    <span className="modal-item-feedback">{feedback}</span>
                </div>
            </div>
        </div>
    );
}
