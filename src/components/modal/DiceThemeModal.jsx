// ============================================================
// DiceThemeModal.jsx
//
// Modal "Aparência dos Dados" — escolher o tema (formato/textura) e a
// cor dos dados 3D (ver useDiceBox.js). É uma preferência DA CONTA
// (useDicePreferences.js), não de um personagem só: escolheu aqui,
// vale em qualquer ficha, em qualquer aparelho onde a pessoa logar.
//
// Segue a mesma estrutura do OrigemCatalogModal (mesmo .modal-overlay/
// .modal-box, trava o scroll de fundo, fecha com Esc), mas aqui a
// escolha só é aplicada/salva ao clicar em "Salvar" — diferente da
// modal de Origem (que aplica na hora de cada clique), porque aqui tem
// DUAS decisões (tema + cor) que fazem mais sentido revisadas juntas
// antes de confirmar.
// ============================================================

import { useEffect, useState } from 'react';
import { TEMAS_DADOS, PALETA_CORES_DADOS, temaPorId } from '@/lib/diceThemes';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';

export default function DiceThemeModal({ aberto, onFechar, temaAtual, corAtual, onSalvar }) {
    const [temaEscolhido, setTemaEscolhido] = useState(temaAtual);
    const [corEscolhida, setCorEscolhida] = useState(corAtual);
    const [salvando, setSalvando] = useState(false);

    useLockBodyScroll(aberto);

    // Reabre sempre a partir do que está de fato salvo — evita que uma
    // troca cancelada (fechou no X) "vaze" pra próxima vez que a modal
    // abrir. Se não há cor salva ainda pro tema atual, pré-seleciona a
    // sugestão daquele tema (ver diceThemes.js) só como ponto de
    // partida — nada é aplicado até clicar em "Salvar".
    useEffect(() => {
        if (!aberto) return;
        setTemaEscolhido(temaAtual);
        setCorEscolhida(corAtual || temaPorId(temaAtual).corPadrao);
    }, [aberto, temaAtual, corAtual]);

    useEffect(() => {
        if (!aberto) return;
        function onKeyDown(ev) {
            if (ev.key === 'Escape') onFechar();
        }
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [aberto, onFechar]);

    if (!aberto) return null;

    const temaInfo = temaPorId(temaEscolhido);

    function escolherTema(id) {
        setTemaEscolhido(id);
        const info = temaPorId(id);
        // Trocou pra um tema com cor fixa (Dice of Rolling): não faz
        // sentido manter uma cor "pendurada" que não vai ser usada.
        // Trocou pra um tema colorável sem nenhuma cor ainda escolhida
        // nesta sessão da modal: sugere a cor própria dele.
        if (!info.corAtiva) {
            setCorEscolhida(null);
        } else if (!corEscolhida) {
            setCorEscolhida(info.corPadrao);
        }
    }

    async function handleSalvar() {
        setSalvando(true);
        try {
            await onSalvar(temaEscolhido, temaInfo.corAtiva ? corEscolhida : null);
        } finally {
            setSalvando(false);
        }
    }

    return (
        <div className="modal-overlay">
            <div className="modal-box wide">
                <div className="modal-header">
                    <h3>Aparência dos Dados</h3>
                    <button type="button" className="modal-close" title="Fechar" onClick={onFechar}>&times;</button>
                </div>

                <p className="dice-theme-modal-intro">
                    Vale pra todos os seus personagens, em qualquer aparelho.
                </p>

                <div className="dice-theme-grid">
                    {TEMAS_DADOS.map(tema => (
                        <button
                            type="button"
                            key={tema.id}
                            className={`dice-theme-card${tema.id === temaEscolhido ? ' selected' : ''}`}
                            onClick={() => escolherTema(tema.id)}
                        >
                            <span className="dice-theme-card-nome">{tema.nome}</span>
                            <span className="dice-theme-card-desc">{tema.descricao}</span>
                        </button>
                    ))}
                </div>

                {temaInfo.corAtiva ? (
                    <div className="dice-color-section">
                        <span className="dice-color-section-label">Cor</span>
                        <div className="dice-color-swatches">
                            {PALETA_CORES_DADOS.map(cor => (
                                <button
                                    type="button"
                                    key={cor.hex}
                                    className={`dice-color-swatch${corEscolhida === cor.hex ? ' selected' : ''}`}
                                    style={{ backgroundColor: cor.hex }}
                                    title={cor.nome}
                                    aria-label={cor.nome}
                                    onClick={() => setCorEscolhida(cor.hex)}
                                />
                            ))}
                            <label className="dice-color-custom" title="Escolher outra cor">
                                <input
                                    type="color"
                                    value={corEscolhida || temaInfo.corPadrao}
                                    onChange={e => setCorEscolhida(e.target.value)}
                                />
                            </label>
                        </div>
                    </div>
                ) : (
                    <p className="dice-color-section-aviso">
                        Esse tema já vem com cores fixas de fábrica — não dá pra customizar.
                    </p>
                )}

                <div className="dice-theme-modal-actions">
                    <button type="button" className="btn-secondary" onClick={onFechar}>Cancelar</button>
                    <button type="button" className="btn-action" onClick={handleSalvar} disabled={salvando}>
                        {salvando ? 'Salvando…' : 'Salvar'}
                    </button>
                </div>
            </div>
        </div>
    );
}
