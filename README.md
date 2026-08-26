# BreusRPG - Fichas de Ordem Paranormal

Ficha de personagem web para o RPG de mesa **Ordem Paranormal** — feita
pra substituir a ficha de papel durante a própria sessão de jogo.

Feito em **React + Vite** (migrado a partir de uma versão anterior em
HTML/CSS/JS puro).

## Funcionalidades

- Login e personagens salvos na nuvem (Firebase Auth + Firestore) — cada
  jogador só vê e edita os próprios personagens.
- Pentagrama ritualístico de atributos, com rolagem de teste direto no
  número de cada atributo.
- Catálogos de Perícias, Itens e Rituais fiéis às regras do sistema
  (filtráveis por busca, Elemento, Círculo etc.), com controle de
  Vida, PE (Pontos de Esforço), Defesa, Proteção e Resistências.
- Rolagem de dados 3D animada (`@3d-dice/dice-box`), com log de
  rolagens e rolagem personalizada (Nd + bônus). Caso o navegador não
  consiga rodar a animação 3D (sem aceleração de GPU/WebGL
  disponível), a ficha detecta isso sozinha, mostra um aviso discreto
  e usa um gerador de números comum — o resultado da rolagem nunca
  fica errado, só a animação em si que pode não aparecer.
- Layout responsivo: funciona tanto em telas largas (desktop) quanto
  em janelas mais estreitas, monitores em pé/retrato, tablet e
  celular — o conteúdo se reorganiza em uma coluna só e a caixa de
  rolagem de dados se move pra perto das Perícias em vez de flutuar no
  topo da tela.
- Modais (catálogos, novo ataque etc.) travam o scroll da página por
  trás enquanto abertas, e só fecham pelo "X" ou Esc — não saem mais
  clicando fora sem querer.

## Rodando o projeto

Pré-requisitos: [Node.js](https://nodejs.org/) 18 ou mais recente (inclui o `npm`).

```bash
npm install
npm run dev
```

Durante o `npm install`, o pacote da animação 3D dos dados
(`@3d-dice/dice-box`) mostra uma pergunta no terminal:

```
Path to your static assets folder (press "Enter" for /public/assets):
```

É só apertar **Enter** (usa o padrão certo automaticamente — se
demorar mais de 10s sem resposta, ele também segue com o padrão
sozinho). Isso copia os modelos/texturas dos dados pra dentro do
projeto; só precisa ser feito de novo se você apagar a pasta
`public/assets` ou reinstalar as dependências do zero.

Abra o endereço que aparecer no terminal (normalmente `http://localhost:5173`).

## Configurando o Firebase (login e salvamento de personagens)

O projeto precisa de um arquivo `.env.local` (não vai pro Git) com as
chaves do seu projeto Firebase:

1. Copie `.env.example` para `.env.local`.
2. Preencha os valores com as chaves do seu projeto — veja o passo a
   passo completo em [`GUIA_FIREBASE.md`](./GUIA_FIREBASE.md).
3. Rode `npm run dev` de novo se o servidor já estava aberto (variáveis
   de ambiente só são lidas ao iniciar).

Se você já rodava a versão antiga (HTML/CSS/JS puro) deste projeto e
tinha um `javascript/firebase-config.js` preenchido, é só usar as
mesmas chaves de lá no `.env.local` novo — é o mesmo projeto Firebase,
só muda onde as chaves ficam guardadas.

## Scripts disponíveis

- `npm run dev` — servidor de desenvolvimento com hot reload.
- `npm run build` — gera a versão de produção em `dist/` (arquivos
  estáticos, prontos pra hospedar em qualquer servidor).
- `npm run preview` — serve a build de produção localmente, pra
  conferir antes de publicar.
- `npm run dev:e2e` — servidor de desenvolvimento usando um Firebase
  "falso" (guardado no localStorage do navegador, sem tocar no banco de
  dados real) — usado só pra testes automatizados.
- `npm run lint` — roda o [oxlint](https://oxc.rs/docs/guide/usage/linter.html) no projeto.

## Estrutura do projeto

```
src/
  components/   Componentes de UI reutilizados entre telas (pentagrama de atributos, modais de catálogo, RequireAuth)
  hooks/        Hooks React (autenticação, trava de scroll das modais, integração com a animação de dados 3D)
  lib/          Regras do sistema Ordem Paranormal (perícias, itens, rituais, origens, NEX) e som dos dados
  pages/        Uma página por rota (Login, Personagens, Criar/Editar, Ficha)
  services/     Integração com o Firebase (Auth + Firestore)
```

As rotas (`src/App.jsx`) espelham as 4 telas do app:

- `/` — Login / Cadastro
- `/characters` — Meus Personagens
- `/form` e `/form/:id` — Criar / Editar Personagem
- `/sheet/:id` — Ficha do Personagem

## Sobre a precisão das regras

Os dados de perícias, NEX, itens e armas (`src/lib/pericias.js` e
`src/lib/itens.js`) vieram de pesquisa cuidadosa em fontes on-line, já
que o livro oficial não está disponível pra conferência 100% garantida
— os comentários no topo desses dois arquivos explicam o nível de
confiança de cada bloco de dados e como ajustar se sua mesa usar uma
regra diferente.
