# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

O próprio usuário (Breno) e seu grupo de mesa de RPG: cada jogador loga com
sua própria conta (Firebase Auth) e gerencia seus próprios personagens de
forma independente. Não existe hoje uma visão de "mestre" administrando as
fichas de outros jogadores — cada conta só vê e edita os personagens que
criou.

## Product Purpose

Ficha de personagem digital pro RPG de mesa **Ordem Paranormal**, feita
pra substituir a ficha de papel durante a própria sessão de jogo (uso
"ao vivo", não só entre sessões): login e personagens salvos na nuvem,
rolagem de dados 3D animada, pentagrama ritualístico de atributos,
catálogos de perícias/itens/rituais fiéis às regras do sistema, controle
de Vida/PE (Pontos de Esforço), inventário e rituais conhecidos, e um log
de rolagens. Sucesso = um jogador consegue jogar a sessão inteira só com
a ficha aberta — rolar testes, conjurar rituais, gastar/recuperar PE,
gerenciar inventário — sem precisar abrir o livro físico ou uma ficha de
papel em paralelo.

## Positioning

Ao contrário de uma ficha digital genérica ou de uma ferramenta de VTT
universal, esse app é construído em cima das mecânicas específicas de
Ordem Paranormal (círculos de rituais liberados por NEX, rituais
coloridos por Elemento, fórmula de PE por rodada, regras de perícia por
Trilha, layout de atributos em pentagrama espelhando o livro) —
pesquisadas com cuidado direto no livro oficial (inclusive via PDF
enviado pelo usuário, quando a regra era incerta) em vez de seguir
convenções genéricas de ficha de RPG. Uma ficha genérica concorrente não
reproduziria essa fidelidade de regras sem refazer essa pesquisa.

## Operating Context

Uso principal é **ao vivo, durante a sessão de jogo** (presencial ou
remota) — a ficha é a interface que o jogador deixa aberta enquanto joga,
então precisa ser rápida e "de relance" nesse momento (rolar um dado,
gastar PE, checar um item/ritual), não só organizada pra planejamento
entre sessões. Cada jogador do grupo tem sua própria conta/personagens,
gerenciados de forma independente uns dos outros.

## Capabilities and Constraints

Stack já estabelecida (React + Vite, Firebase Auth + Firestore, dados 3D
via `@3d-dice/dice-box`) — ver seção Stack omitida de propósito, já que o
código existente já responde essa pergunta.

Os dados de regras (perícias, itens, rituais, NEX) em `src/lib/pericias.js`,
`src/lib/itens.js` e `src/lib/rituais.js` vêm de pesquisa cuidadosa, já
que o livro oficial nem sempre estava disponível pra conferência 100%
garantida — os comentários no topo desses arquivos documentam o nível de
confiança de cada bloco e como ajustar se a mesa usar uma regra diferente.

Terminologia: "PE" é o rótulo visível no lugar do "Determinação" do
livro — os campos internos (`detAtual`, `determinacaoAtual` no
Firestore, `determinacaoMaxima()`) continuam com o nome antigo de
propósito, pra não arriscar migração de dado em personagens já salvos
(renomeação não-destrutiva). Do mesmo jeito, o campo interno `trilha`
representa o conceito de "Classe" do livro, mas não foi renomeado.

## Evidence on Hand

O usuário já enviou o PDF do livro básico de Ordem Paranormal em uma
sessão anterior (usado pra confirmar a fórmula de PE por rodada — Tabela
1.2, "Progressão de Personagem") — o arquivo em si não está neste
diretório de projeto, então não citar um caminho específico sem
reconferir com o usuário. Também foram fornecidas, em conversas
anteriores, imagens de referência (um app de 3 colunas com estilo mais
polido, e a página da ficha do livro oficial) que guiaram o redesenho
atual do layout — essas imagens também não estão salvas como assets do
projeto.

## Product Principles

- Fidelidade às regras e ao layout do livro oficial de Ordem Paranormal
  vem antes de convenções genéricas de app de RPG ou do gosto estético
  de quem estiver desenvolvendo.
- Construído pra velocidade na mesa: qualquer interação (rolar, gastar
  PE, procurar um ritual/item) deve ser rápida e legível "de relance"
  durante o jogo, não só organizada entre sessões.
- Evolução não-destrutiva: renomear/relabelar algo na tela (ex: "PE" no
  lugar de "Determinação") muda o que é exibido, nunca o formato dos
  dados já salvos — personagens existentes não podem quebrar.
- Cada jogador é dono e gerencia seus próprios personagens de forma
  independente; não existe hoje uma visão compartilhada/administrada por
  um mestre.
- Quando o livro é ambíguo ou não está disponível pra conferência, a
  decisão é documentada com seu nível de confiança em vez de assumida
  silenciosamente.
