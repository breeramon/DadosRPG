// ============================================================
// TrilhaTab.jsx
//
// Conteúdo da aba/seção Trilha para UMA trilha específica (Combatente,
// Especialista ou Ocultista) -- "número limpo" (Ataque Especial /
// Eclético-Perito, quando a trilha tem um; Ocultista não tem), o
// seletor de sub-trilha com a descrição e os 4 poderes de sub-trilha, e
// os slots de Poder de Trilha (6, liberados por NEX).
//
// Extraído de CharacterSheetPage.jsx, onde os 3 blocos (Combatente/
// Especialista/Ocultista) eram JSX quase idêntico copiado 3 vezes lado
// a lado -- esta versão é a mesma marcação parametrizada por trilha, e
// serve tanto a Ficha quanto a tela de Criação/Edição (CharacterFormPage.jsx),
// que tinha a mesma triplicação. Quem decide QUAL trilha renderizar (o
// `trilha === 'Combatente' ? ... : ...` de cada tela) continua no
// componente-pai, que também decide o que fazer com cada mudança
// (persistir na Ficha via salvarCampos, ou só guardar em estado local
// no Formulário até salvar tudo de uma vez).
//
// Props:
//   trilha                 -- 'Combatente' | 'Especialista' | 'Ocultista'
//                              (usado no texto e pra montar os ids)
//   nex
//   numeroLimpo             -- { label, texto } já formatado pelo pai
//                              (a redação varia por trilha -- ver
//                              ataqueEspecialAtual/peritoEspecialistaAtual
//                              em trilhas.js) ou undefined/null se essa
//                              trilha não tem número limpo (caso do
//                              Ocultista)
//   catalogoSecundario      -- TRILHAS_COMBATENTE/ESPECIALISTA/OCULTISTA
//   trilhaSecundariaEscolhida, onEscolherTrilhaSecundaria(nome)
//   poderMarcos             -- PODER_COMBATENTE/ESPECIALISTA/OCULTISTA_MARCOS
//   poderCatalogo           -- PODERES_COMBATENTE/ESPECIALISTA/OCULTISTA
//   poderesEscolhidos, onEscolherPoder(indice, nome)
//   idPrefix                -- prefixo dos ids/htmlFor (ex: 'form-' no
//                              Formulário; '' na Ficha), pra não colidir
//                              entre as duas telas quando ambas usam
//                              este componente na mesma página (não
//                              acontece hoje, mas custa nada)
// ============================================================

import { poderesDisponiveisParaSlot } from '@/lib/trilhas';

export default function TrilhaTab({
    trilha,
    nex,
    numeroLimpo,
    catalogoSecundario,
    trilhaSecundariaEscolhida,
    onEscolherTrilhaSecundaria,
    poderMarcos,
    poderCatalogo,
    poderesEscolhidos,
    onEscolherPoder,
    idPrefix = '',
}) {
    const slug = trilha.toLowerCase();
    const trilhaSecundariaInfo = catalogoSecundario.find(t => t.nome === trilhaSecundariaEscolhida) || null;
    const slotsLiberados = poderMarcos.filter(m => nex >= m).length;

    return (
        <>
            {numeroLimpo && (
                <div className="trilha-numero-limpo">
                    <span className="trilha-numero-limpo-label">{numeroLimpo.label}</span>
                    <span className="trilha-numero-limpo-valor">{numeroLimpo.texto}</span>
                </div>
            )}

            <div className="trilha-secundaria-picker">
                <label htmlFor={`${idPrefix}trilha-${slug}-select`}>Trilha de {trilha}</label>
                <select
                    id={`${idPrefix}trilha-${slug}-select`}
                    value={trilhaSecundariaEscolhida}
                    onChange={e => onEscolherTrilhaSecundaria(e.target.value)}
                >
                    <option value="">— Escolher (liberado em NEX 10%) —</option>
                    {catalogoSecundario.map(t => (
                        <option key={t.nome} value={t.nome}>{t.nome}</option>
                    ))}
                </select>
            </div>

            {trilhaSecundariaInfo && (
                <div className="trilha-secundaria-poderes">
                    <p className="trilha-secundaria-descricao">{trilhaSecundariaInfo.descricao}</p>
                    {trilhaSecundariaInfo.poderes.map(poder => {
                        const liberado = nex >= poder.nex;
                        return (
                            <div
                                className={`trilha-poder-card${liberado ? '' : ' trilha-poder-bloqueado'}`}
                                key={poder.nome}
                            >
                                <div className="trilha-poder-card-header">
                                    <strong>{poder.nome}</strong>
                                    <span className="trilha-poder-nex">NEX {poder.nex}%{liberado ? '' : ' (bloqueado)'}</span>
                                </div>
                                <p className="trilha-poder-descricao">{poder.descricao}</p>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="trilha-poder-slots">
                <h3>Poderes de {trilha}</h3>
                {slotsLiberados === 0 ? (
                    <p className="trilha-em-breve">Libera o primeiro em NEX 15%.</p>
                ) : (
                    Array.from({ length: slotsLiberados }).map((_, indice) => (
                        <div className="trilha-poder-slot" key={indice}>
                            <label htmlFor={`${idPrefix}poder-${slug}-${indice}`}>
                                Poder {indice + 1} <small>(NEX {poderMarcos[indice]}%)</small>
                            </label>
                            <select
                                id={`${idPrefix}poder-${slug}-${indice}`}
                                value={poderesEscolhidos[indice] || ''}
                                onChange={e => onEscolherPoder(indice, e.target.value)}
                            >
                                <option value="">— Escolher —</option>
                                {poderesDisponiveisParaSlot(poderCatalogo, poderesEscolhidos, indice).map(p => (
                                    <option key={p.nome} value={p.nome}>{p.nome}</option>
                                ))}
                            </select>
                            {poderesEscolhidos[indice] && (() => {
                                const escolhido = poderCatalogo.find(p => p.nome === poderesEscolhidos[indice]);
                                return escolhido ? (
                                    <p className="trilha-poder-descricao">
                                        {escolhido.descricao}
                                        {escolhido.preRequisito && (
                                            <em className="trilha-poder-prereq"> (Pré-requisito: {escolhido.preRequisito})</em>
                                        )}
                                    </p>
                                ) : null;
                            })()}
                        </div>
                    ))
                )}
            </div>
        </>
    );
}
