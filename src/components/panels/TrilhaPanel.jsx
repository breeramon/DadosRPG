// ============================================================
// TrilhaPanel.jsx
//
// Conteúdo da aba/seção "Trilha" -- decide QUAL das 3 trilhas
// (Combatente/Especialista/Ocultista) desenhar (cada uma com seu
// <TrilhaTab>, ver TrilhaTab.jsx) e monta o "número limpo" de cada uma
// (Ataque Especial pro Combatente, Eclético/Perito pro Especialista;
// Ocultista não tem número limpo). Se a trilha salva não for nenhuma
// das 3 (dado antigo/corrompido), mostra um aviso em vez de quebrar.
//
// Extraído de CharacterSheetPage.jsx e CharacterFormPage.jsx, que
// tinham exatamente este bloco (o `trilha === 'Combatente' ? ... :
// trilha === 'Especialista' ? ... : trilha === 'Ocultista' ? ... :
// <aviso>`) duplicado palavra por palavra entre as duas telas -- a
// única diferença era o idPrefix="form-" que o Formulário passa pro
// TrilhaTab (pra não colidir ids de <select>/<label> com a Ficha, caso
// as duas um dia apareçam juntas na mesma página).
//
// Props:
//   trilha, nex
//   ataqueEspecialAtual   -- { pe, bonus } | null, pro número limpo do
//                            Combatente (ver ataqueEspecialMaximo em
//                            trilhas.js)
//   peritoEspecialistaAtual -- { pe, dado } | null, pro número limpo
//                            do Especialista (ver peritoEspecialistaMaximo
//                            em trilhas.js)
//   trilhaCombatenteEscolhida, onEscolherTrilhaCombatente(nome)
//   poderesCombatenteEscolhidos, onEscolherPoderCombatente(indice, nome)
//   trilhaEspecialistaEscolhida, onEscolherTrilhaEspecialista(nome)
//   poderesEspecialistaEscolhidos, onEscolherPoderEspecialista(indice, nome)
//   trilhaOcultistaEscolhida, onEscolherTrilhaOcultista(nome)
//   poderesOcultistaEscolhidos, onEscolherPoderOcultista(indice, nome)
//   idPrefix              -- prefixo dos ids/htmlFor repassado pro
//                            TrilhaTab (ex: 'form-' no Formulário; ''
//                            na Ficha), ver TrilhaTab.jsx
// ============================================================

import TrilhaTab from '@/components/tabs/TrilhaTab';
import * as OPT from '@/lib/trilhas';

export default function TrilhaPanel({
    trilha,
    nex,
    ataqueEspecialAtual,
    peritoEspecialistaAtual,
    trilhaCombatenteEscolhida,
    onEscolherTrilhaCombatente,
    poderesCombatenteEscolhidos,
    onEscolherPoderCombatente,
    trilhaEspecialistaEscolhida,
    onEscolherTrilhaEspecialista,
    poderesEspecialistaEscolhidos,
    onEscolherPoderEspecialista,
    trilhaOcultistaEscolhida,
    onEscolherTrilhaOcultista,
    poderesOcultistaEscolhidos,
    onEscolherPoderOcultista,
    idPrefix = '',
}) {
    return (
        <div className="tab-panel-trilha">
            {trilha === 'Combatente' ? (
                <TrilhaTab
                    trilha="Combatente"
                    nex={nex}
                    numeroLimpo={{
                        label: 'Ataque Especial',
                        texto: ataqueEspecialAtual
                            ? `até ${ataqueEspecialAtual.pe} PE por +${ataqueEspecialAtual.bonus} (no ataque ou no dano)`
                            : '—',
                    }}
                    catalogoSecundario={OPT.TRILHAS_COMBATENTE}
                    trilhaSecundariaEscolhida={trilhaCombatenteEscolhida}
                    onEscolherTrilhaSecundaria={onEscolherTrilhaCombatente}
                    poderMarcos={OPT.PODER_COMBATENTE_MARCOS}
                    poderCatalogo={OPT.PODERES_COMBATENTE}
                    poderesEscolhidos={poderesCombatenteEscolhidos}
                    onEscolherPoder={onEscolherPoderCombatente}
                    idPrefix={idPrefix}
                />
            ) : trilha === 'Especialista' ? (
                <TrilhaTab
                    trilha="Especialista"
                    nex={nex}
                    numeroLimpo={{
                        label: 'Eclético / Perito',
                        texto: peritoEspecialistaAtual
                            ? `até ${peritoEspecialistaAtual.pe} PE por +${peritoEspecialistaAtual.dado} numa perícia (Eclético/Perito)`
                            : '—',
                    }}
                    catalogoSecundario={OPT.TRILHAS_ESPECIALISTA}
                    trilhaSecundariaEscolhida={trilhaEspecialistaEscolhida}
                    onEscolherTrilhaSecundaria={onEscolherTrilhaEspecialista}
                    poderMarcos={OPT.PODER_ESPECIALISTA_MARCOS}
                    poderCatalogo={OPT.PODERES_ESPECIALISTA}
                    poderesEscolhidos={poderesEspecialistaEscolhidos}
                    onEscolherPoder={onEscolherPoderEspecialista}
                    idPrefix={idPrefix}
                />
            ) : trilha === 'Ocultista' ? (
                <TrilhaTab
                    trilha="Ocultista"
                    nex={nex}
                    catalogoSecundario={OPT.TRILHAS_OCULTISTA}
                    trilhaSecundariaEscolhida={trilhaOcultistaEscolhida}
                    onEscolherTrilhaSecundaria={onEscolherTrilhaOcultista}
                    poderMarcos={OPT.PODER_OCULTISTA_MARCOS}
                    poderCatalogo={OPT.PODERES_OCULTISTA}
                    poderesEscolhidos={poderesOcultistaEscolhidos}
                    onEscolherPoder={onEscolherPoderOcultista}
                    idPrefix={idPrefix}
                />
            ) : (
                <p className="trilha-em-breve">
                    Poderes de trilha para {trilha || 'essa trilha'} ainda não foram modelados nesta ficha.
                </p>
            )}
        </div>
    );
}
