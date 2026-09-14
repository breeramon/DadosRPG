// ============================================================
// PericiasTable.jsx
//
// Lista de Perícias da Ficha (.skills-section): nome, dados a rolar,
// bônus total (com tooltip mostrando base vs. bônus de poder de
// trilha), grau de treino e botão de rolagem. Extraída de
// CharacterSheetPage.jsx -- componente "burro", só lê os valores já
// calculados e chama onRollSkill quando o dado é clicado.
//
// Props:
//   atributos       -- { agi, int, vig, pre, for } do personagem
//   salvasPorNome   -- mapa nome -> { treinado, grau, bonus, ... }
//                      (ver personagem.pericias, montado no pai)
//   bonusPericias   -- mapa nome -> bônus numérico de poder de trilha
//                      (ver OPT.bonusNumericoDosPoderes(...).pericias)
//   onRollSkill(nome, valorAtributo, bonus) -- clicou pra rolar
// ============================================================

import * as OP from '@/lib/pericias';
import ClickSpark from '@/components/ClickSpark';

const ATTR_LABEL = { agi: 'AGI', int: 'INT', vig: 'VIG', pre: 'PRE', for: 'FOR' };
const GRAU_ABREV = { treinado: 'T', veterano: 'V', expert: 'E' };

function D20Icon() {
    return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3L19.8 7.5V16.5L12 21L4.2 16.5V7.5Z" />
            <path d="M12 12L12 3M12 12L19.8 16.5M12 12L4.2 16.5" />
        </svg>
    );
}

export default function PericiasTable({ atributos, salvasPorNome, bonusPericias, onRollSkill }) {
    return (
        <section className="skills-section">
            <h3>Perícias</h3>
            <div className="skills-header">
                <span>Nome</span>
                <span>Dados</span>
                <span>Bônus</span>
                <span>Treino</span>
                <span>Ação</span>
            </div>
            <div className="skills-list">
                {OP.PERICIAS_CATALOGO.map(catItem => {
                    const salva = salvasPorNome[catItem.nome];
                    const treinado = !!(salva && salva.treinado);
                    const valorAtributo = Number(atributos[catItem.atributo]) || 0;
                    const bonusBase = treinado ? (Number(salva.bonus) || 0) : 0;
                    // Bônus de poder de trilha (ex: Hacker +5 Tecnologia) soma
                    // independente de treino/destreino — é um bônus concedido
                    // pelo poder escolhido, não pelo grau de treinamento.
                    const bonusPoder = bonusPericias[catItem.nome] || 0;
                    const bonus = bonusBase + bonusPoder;
                    const grau = treinado ? (salva.grau || 'treinado') : null;
                    const bloqueada = !!catItem.somenteTreinada && !treinado;
                    const labelAtributo = ATTR_LABEL[catItem.atributo] || '?';

                    return (
                        <div className={`skill-item${treinado ? ' treinada' : ''}${bloqueada ? ' bloqueada' : ''}`} key={catItem.nome}>
                            <span className="skill-name">
                                {catItem.nome}{catItem.somenteTreinada ? '*' : ''}{' '}
                                <span className="skill-attr-ref">({labelAtributo})</span>
                            </span>
                            <span className="skill-dice">{valorAtributo > 0 ? `${valorAtributo}d20` : '2d20↓'}</span>
                            <span
                                className="skill-bonus"
                                title={bonusPoder ? `Base: ${bonusBase >= 0 ? '+' + bonusBase : bonusBase} · Poderes de trilha: +${bonusPoder}` : undefined}
                            >
                                {bonus >= 0 ? `+${bonus}` : `${bonus}`}
                            </span>
                            <span
                                className="skill-treino"
                                title={treinado ? (OP.GRAU_LABEL[grau] || 'Treinado') : (bloqueada ? 'Só pode ser usada treinada' : 'Destreinado')}
                            >
                                {treinado ? (GRAU_ABREV[grau] || 'T') : '-'}
                            </span>
                            {/* ClickSpark: teste de "faísca" de partículas no
                                clique (React Bits, sem dependência nova -- ver
                                ClickSpark.jsx). className faz ele abraçar o
                                tamanho do botão (36x36) em vez de esticar pra
                                célula inteira da grid -- ver .skill-roll-spark
                                no index.css. */}
                            <ClickSpark className="skill-roll-spark" sparkColor="#b39ddb" sparkSize={8} sparkRadius={14} sparkCount={6} duration={350}>
                                <button
                                    className="btn-roll-skill"
                                    disabled={bloqueada}
                                    title={`Rolar ${catItem.nome}`}
                                    aria-label={`Rolar ${catItem.nome}`}
                                    onClick={() => onRollSkill(catItem.nome, valorAtributo, bonus)}
                                >
                                    <D20Icon />
                                </button>
                            </ClickSpark>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
