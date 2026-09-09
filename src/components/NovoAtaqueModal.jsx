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
//                           observacoes } já validado (nome não vazio).
//                           dano e alcance vêm de presets (mesmas
//                           listas de lib/itens.js usadas pelo item
//                           personalizado tipo "Arma" em
//                           AdicionarItemModal.jsx, pra não ter duas
//                           formas diferentes de cadastrar uma arma
//                           nesta ficha) -- só nome, crítico e
//                           observações continuam texto livre.
// ============================================================

import { useEffect, useState } from 'react';
import * as OPI from '@/lib/itens';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';

export default function NovoAtaqueModal({ aberto, onFechar, onAdicionar }) {
    const [nome, setNome] = useState('');
    const [danoQtd, setDanoQtd] = useState(1);
    const [danoDado, setDanoDado] = useState(6);
    const [critico, setCritico] = useState('');
    const [alcance, setAlcance] = useState(OPI.ALCANCES_PRESET[0]);
    const [observacoes, setObservacoes] = useState('');

    useLockBodyScroll(aberto);

    // Limpa o formulário toda vez que a modal abre de novo.
    useEffect(() => {
        if (!aberto) return;
        setNome('');
        setDanoQtd(1);
        setDanoDado(6);
        setCritico('');
        setAlcance(OPI.ALCANCES_PRESET[0]);
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
            dano: `${danoQtd}d${danoDado}`,
            critico: critico.trim(),
            alcance,
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
                            <label htmlFor="novo-ataque-dano-qtd">Dano</label>
                            <div className="dano-preset-row">
                                <select
                                    id="novo-ataque-dano-qtd"
                                    value={danoQtd}
                                    onChange={e => setDanoQtd(Number(e.target.value))}
                                >
                                    {OPI.QUANTIDADES_DANO_PRESET.map(qtd => (
                                        <option key={qtd} value={qtd}>{qtd}</option>
                                    ))}
                                </select>
                                <span className="dano-preset-d">d</span>
                                <select
                                    aria-label="Lados do dado de dano"
                                    value={danoDado}
                                    onChange={e => setDanoDado(Number(e.target.value))}
                                >
                                    {OPI.DADOS_PRESET.map(lados => (
                                        <option key={lados} value={lados}>{lados}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="control-group">
                            <label>Crítico</label>
                            <input type="text" placeholder="Ex: 19/x3" value={critico} onChange={e => setCritico(e.target.value)} />
                        </div>
                        <div className="control-group">
                            <label htmlFor="novo-ataque-alcance">Alcance</label>
                            <select
                                id="novo-ataque-alcance"
                                value={alcance}
                                onChange={e => setAlcance(e.target.value)}
                            >
                                {OPI.ALCANCES_PRESET.map(op => (
                                    <option key={op} value={op}>{op}</option>
                                ))}
                            </select>
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
