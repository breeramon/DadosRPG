// ============================================================
// SobrePage.jsx
//
// Tela "Sobre esta Ficha" -- reúne num lugar só as informações que
// antes só apareciam espalhadas (e só quando a condição específica
// era atingida): o que a ficha cobre, quais regras são extensões não-
// oficiais (a ficha "inventa" algo que o livro não define), e quais
// mecânicas o livro descreve mas que ainda não foram implementadas de
// verdade. Serve tanto pro próprio mantenedor quanto pra quem mais
// jogar usando esta ficha entender rápido "isso é regra oficial, ou é
// coisa desta ficha?" sem precisar ler o código.
//
// Puramente informativa -- sem estado, sem chamada ao Firestore.
// ============================================================

import { useNavigate } from 'react-router-dom';

export default function SobrePage() {
    const navigate = useNavigate();

    return (
        <div className="screen screen-sobre">
            <div className="sobre-panel">
                <div className="sobre-header">
                    <h2>Sobre esta Ficha</h2>
                    <button type="button" className="btn-secondary" onClick={() => navigate('/characters')}>
                        &larr; Meus Personagens
                    </button>
                </div>

                <p className="sobre-intro">
                    Esta ficha é uma implementação web das regras de <strong>Ordem Paranormal</strong> pra
                    jogar sem precisar de papel na mesa. Ela tenta seguir o livro de regras à risca, mas em
                    alguns pontos específicos precisou tomar uma decisão que o livro não deixa 100% explícita,
                    ou ainda não modelou alguma mecânica por completo. Esta página reúne esses pontos, pra não
                    ficarem escondidos só nos comentários do código.
                </p>

                <section className="sobre-section">
                    <h3>O que esta ficha cobre</h3>
                    <ul className="sobre-lista">
                        <li>Atributos (com rolagem de teste direto no pentagrama) e as 20 perícias do livro, com grau de treino, bônus de poder de trilha e a regra de 2d20 (fica com o menor) pra atributo 0.</li>
                        <li>Vida, PE (Pontos de Esforço), Sanidade (opcional, pode ser ocultada), Defesa detalhada e Proteção/Resistências.</li>
                        <li>Inventário com carga (sobrecarga e limite absoluto) e ataques — manuais ou gerados automaticamente pela arma equipada.</li>
                        <li>Rituais: catálogo filtrável por Elemento/Círculo, círculo liberado pelo NEX e cota de rituais conhecidos (ver "Extensões" abaixo pra como essa cota é calculada).</li>
                        <li>Poderes de Trilha e sub-trilha das 3 trilhas (Combatente, Especialista, Ocultista), liberados progressivamente pelo NEX.</li>
                        <li>Rolagem de dados 3D animada, com log de rolagens e um gerador comum de números como reserva caso o navegador não consiga rodar a animação.</li>
                    </ul>
                </section>

                <section className="sobre-section">
                    <h3>Extensões não-oficiais (regras de casa)</h3>
                    <p className="sobre-section-intro">
                        Coisas que esta ficha assume por conta própria porque o livro não cobre esse caso, ou
                        cobre de um jeito que não dava pra automatizar sem uma decisão de design. Combine com
                        seu mestre se preferirem outra convenção — nada aqui é regra oficial.
                    </p>
                    <div className="sobre-callout sobre-callout-info">
                        <strong>Pontos de atributo continuam subindo depois do NEX 5%.</strong> O livro básico
                        define o total de pontos e o máximo por atributo só pro NEX inicial; esta ficha estende
                        esses dois números a cada marco de NEX (20%, 50%, 80%, 95%), pra criação/evolução de
                        personagens mais avançados não travarem nesse teto inicial. Esse aviso também aparece
                        direto na tela de Criar/Editar Personagem sempre que ele se aplica.
                    </div>
                </section>

                <section className="sobre-section">
                    <h3>Limitações conhecidas</h3>
                    <p className="sobre-section-intro">
                        Mecânicas que o livro descreve mas que esta ficha ainda não modela por completo — o
                        texto do poder aparece normalmente na aba Trilha, só o efeito mecânico é que ainda
                        precisa ser feito na mão.
                    </p>
                    <div className="sobre-callout sobre-callout-aviso">
                        <strong>Ritual "Amaldiçoar Arma"</strong> (concedido pelo poder Lâmina Maldita, trilha
                        secundária Lâmina Paranormal do Ocultista) ainda não tem ficha técnica cadastrada no
                        catálogo de rituais — o personagem tem o poder, mas o ritual em si não aparece pra
                        conjurar ainda.
                    </div>
                    <div className="sobre-callout sobre-callout-aviso">
                        <strong>Grimório Ritualístico</strong> (poder da sub-trilha Graduado do Ocultista) só
                        tem implementada a cota extra de rituais que ele libera — o grimório como item físico
                        (ocupar espaço no inventário, precisar ser empunhado e folheado numa ação completa pra
                        conjurar um ritual armazenado nele) ainda não existe na ficha.
                    </div>
                    <div className="sobre-callout sobre-callout-aviso">
                        Esta ficha é só pro personagem jogador — não tem nada voltado pra NPCs, adversários ou
                        ferramentas de apoio ao mestre.
                    </div>
                </section>

                <section className="sobre-section">
                    <h3>Convenções da interface</h3>
                    <ul className="sobre-lista">
                        <li>O selo <strong>"Automático"</strong> num ritual indica que ele foi concedido por um poder de sub-trilha (não por escolha sua no catálogo) — não conta na sua cota de rituais conhecidos, e some sozinho se você trocar de sub-trilha ou cair de NEX.</li>
                        <li>Números com um tracejado por baixo, ou textos como "Rituais conhecidos: X / Y", geralmente têm um tooltip (passe o mouse por cima) detalhando de onde vem cada parte daquele total.</li>
                    </ul>
                </section>
            </div>
        </div>
    );
}
