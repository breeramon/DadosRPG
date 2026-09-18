// ============================================================
// Stepper.jsx
//
// Indicador de progresso em etapas (React Bits "Stepper", reimplementado
// do zero em CSS + JS puro, sem dependência nova -- mesma linha dos
// outros componentes desta pasta): bolinhas numeradas conectadas por uma
// linha, a etapa atual em destaque e as anteriores marcadas com "✓".
// Usado no formulário de criação/edição de personagem (ver
// CharacterFormPage.jsx) pra dividir um formulário longo em passos
// menores em vez de uma rolagem única enorme.
//
// É puramente de navegação/exibição -- não guarda nem valida nada; quem
// decide qual etapa está ativa e o que acontece ao trocar é o
// componente pai. Clicar numa bolinha pula direto pra aquela etapa (não
// tem passos "trancados"), já que tudo aqui é estado local no formulário,
// sem submissão por etapa.
//
// Uso: <Stepper etapas={['Identidade', 'Perícias']} etapaAtual={0}
//               onSelecionar={setEtapaAtual} />
// ============================================================

import { Fragment } from 'react';

export default function Stepper({ etapas, etapaAtual, onSelecionar }) {
    return (
        <div className="form-stepper" role="navigation" aria-label="Etapas do formulário">
            {etapas.map((rotulo, i) => (
                <Fragment key={rotulo}>
                    <div className="form-stepper-step">
                        <button
                            type="button"
                            className={`form-stepper-dot${i === etapaAtual ? ' form-stepper-dot-ativo' : ''}${i < etapaAtual ? ' form-stepper-dot-concluido' : ''}`}
                            onClick={() => onSelecionar && onSelecionar(i)}
                            aria-current={i === etapaAtual ? 'step' : undefined}
                            title={rotulo}
                        >
                            {i < etapaAtual ? '✓' : i + 1}
                        </button>
                        <span className="form-stepper-label">{rotulo}</span>
                    </div>
                    {i < etapas.length - 1 && (
                        <div className={`form-stepper-line${i < etapaAtual ? ' form-stepper-line-concluido' : ''}`} />
                    )}
                </Fragment>
            ))}
        </div>
    );
}
