// ============================================================
// Accordion.jsx
//
// Seções de conteúdo que expandem/recolhem ao clicar no cabeçalho
// (React Bits "Accordion", reimplementado do zero em CSS + JS puro, sem
// dependência nova -- mesma linha dos outros componentes desta pasta).
// Cada item abre/fecha de forma independente (não é "só um aberto por
// vez") -- pensado pra telas com bastante texto de referência, como
// "Sobre esta Ficha" (ver SobrePage.jsx), onde nem todo mundo precisa
// ler tudo sempre.
//
// A animação de abrir/fechar usa o truque de CSS grid-template-rows
// 0fr -> 1fr (ver .accordion-painel-wrap no index.css) em vez de altura
// calculada via JS -- funciona pra conteúdo de altura variável sem medir
// nada, e já reage sozinho a prefers-reduced-motion (a transição só é
// desligada lá, o grid continua funcionando).
//
// Uso:
//   <Accordion items={[
//     { id: 'a', titulo: 'Título', conteudo: <p>...</p> },
//     ...
//   ]} abertosPadrao={['a']} />
// ============================================================

import { useState } from 'react';

export default function Accordion({ items, abertosPadrao = [] }) {
    const [abertos, setAbertos] = useState(() => new Set(abertosPadrao));

    function toggle(id) {
        setAbertos(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    return (
        <div className="accordion">
            {items.map(({ id, titulo, conteudo }) => {
                const aberto = abertos.has(id);
                return (
                    <div className={`accordion-item${aberto ? ' accordion-item-aberto' : ''}`} key={id}>
                        <div className="accordion-header">
                            <button
                                type="button"
                                className="accordion-trigger"
                                onClick={() => toggle(id)}
                                aria-expanded={aberto}
                            >
                                <span>{titulo}</span>
                                <span className="accordion-icone" aria-hidden="true">&#9662;</span>
                            </button>
                        </div>
                        <div className="accordion-painel-wrap">
                            <div className="accordion-painel-inner">
                                <div className="accordion-painel">{conteudo}</div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
