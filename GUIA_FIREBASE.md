# Configurando o login e o salvamento de personagens (Firebase)

A ficha tem login por e-mail/senha e salva os personagens de cada
usuário na nuvem, usando o Firebase (serviço gratuito do Google). Esse
passo eu não consigo fazer por você — precisa da sua conta Google —,
mas leva uns 5 minutos. Depois disso, o código já está pronto pra
funcionar.

## 1. Criar o projeto no Firebase

1. Acesse [console.firebase.google.com](https://console.firebase.google.com/) e faça login com sua conta Google.
2. Clique em **"Criar projeto"** (ou "Add project").
3. Dê um nome (ex: `dados-rpg`) e siga o assistente (pode desativar o Google Analytics, não é necessário).

## 2. Criar um "app Web" e pegar as chaves de configuração

1. Na página inicial do projeto, clique no ícone **`</>`** ("Web") para adicionar um app.
2. Dê um apelido (ex: `ficha-web`) e clique em **"Registrar app"**. Não precisa marcar a opção de Firebase Hosting.
3. O Firebase vai mostrar um bloco de código com um objeto `firebaseConfig` parecido com este:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "dados-rpg-xxxxx.firebaseapp.com",
  projectId: "dados-rpg-xxxxx",
  storageBucket: "dados-rpg-xxxxx.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};
```

4. Copie **`.env.example`** (na raiz do projeto) para um novo arquivo chamado **`.env.local`**, e preencha cada linha com o valor correspondente do bloco acima:

```
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=dados-rpg-xxxxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=dados-rpg-xxxxx
VITE_FIREBASE_STORAGE_BUCKET=dados-rpg-xxxxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
```

Essas chaves não são secretas (não são como uma senha) — só identificam o projeto. O `.env.local` não sobe pro Git (já está no `.gitignore` por padrão do Vite).

## 3. Ativar login por e-mail/senha

1. No menu lateral do console, vá em **Build → Authentication**.
2. Clique em **"Get started"**.
3. Na aba **"Sign-in method"**, clique em **"Email/Password"**, ative a primeira opção (Email/Password) e salve.

## 3b. Ativar login com o Google (opcional)

A ficha também tem um botão "Entrar com o Google" na tela de login,
além do e-mail/senha do passo 3 — é opcional, mas reduz a chance de
alguém esquecer a senha ou reusar uma senha fraca.

1. Ainda na aba **"Sign-in method"**, clique em **"Google"** na lista
   de provedores.
2. Ative o provedor ("Ativar"/"Enable").
3. Em **"Nome público do projeto"**, troque o valor genérico que o
   Firebase preenche sozinho (tipo `project-123456789012`) por algo
   reconhecível, tipo `BreusRPG` — é esse nome que aparece pro usuário
   na tela de consentimento do Google ("Fazer login em [Nome] com o
   Google...").
4. Em **"E-mail de suporte do projeto"**, escolha seu e-mail (geralmente
   já vem preenchido certo).
5. As duas seções recolhidas ("Adicionar IDs de cliente...",
   "Configuração do SDK da Web") podem ficar como estão — não são
   necessárias pro fluxo padrão de popup que a ficha usa.
6. Clique em **"Salvar"**.
7. **Importante pra quando for publicar o site**: o Firebase só permite
   o login do Google rodar em domínios que você autorizou
   explicitamente. `localhost` já vem liberado por padrão pra
   desenvolvimento, mas o domínio de produção (ex: o `.vercel.app` do
   seu deploy, ou um domínio próprio) precisa ser adicionado à mão —
   veja **Authentication → Settings → Authorized domains** ("Domínios
   autorizados"), clique em **"Add domain"** e cole o domínio (sem
   `https://`). Sem esse passo, o botão falha com o erro
   `auth/unauthorized-domain` assim que alguém tentar usá-lo fora do
   `localhost`.

## 4. Criar o banco de dados (Firestore)

1. No menu lateral, vá em **Build → Firestore Database**.
2. Clique em **"Create database"**.
3. Escolha a localização (qualquer uma serve; `southamerica-east1` fica mais perto do Brasil) e clique em avançar.
4. Pode iniciar em **modo de produção** (production mode) — no próximo passo vamos colar as regras corretas.

## 5. Colar as regras de segurança

Isso é o que garante que cada usuário só enxerga e edita os **próprios**
personagens, nunca os de outra pessoa — e, além disso, que ninguém
(nem um usuário legítimo autenticado, nem um script usando as mesmas
chaves do navegador) consiga gravar campos fora do esperado ou
documentos gigantes no seu banco. As regras antigas só checavam "é o
dono?" — qualquer um logado podia gravar **qualquer campo, de
qualquer tamanho** no documento (até o limite físico do Firestore, 1
MB por documento). A versão abaixo valida nome dos campos, tipo e
tamanho de cada um.

1. Ainda em Firestore Database, vá na aba **"Rules"**.
2. Apague o conteúdo atual e cole:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ---- Funções auxiliares ----

    function donoAutenticado(userId) {
      return request.auth != null && request.auth.uid == userId;
    }

    function ehTexto(valor, tamanhoMax) {
      return valor is string && valor.size() <= tamanhoMax;
    }

    function ehLista(valor, tamanhoMax) {
      return valor is list && valor.size() <= tamanhoMax;
    }

    // Mapa de atributos: só as 5 chaves do jogo, cada uma um número
    // dentro de uma faixa generosa (as regras não tentam recalcular a
    // distribuição de pontos do NEX -- isso já é validado no app; aqui
    // é só pra impedir um valor absurdo tipo -999999 ou 9999999).
    function atributosValidos(a) {
      return a is map
        && a.keys().hasOnly(['agi', 'int', 'vig', 'pre', 'for'])
        && a.agi is number && a.agi >= -5 && a.agi <= 15
        && a.int is number && a.int >= -5 && a.int <= 15
        && a.vig is number && a.vig >= -5 && a.vig <= 15
        && a.pre is number && a.pre >= -5 && a.pre <= 15
        && a.for is number && a.for >= -5 && a.for <= 15;
    }

    // Um personagem só pode ter exatamente estes campos (nada de
    // extra), com o tipo e o tamanho esperado em cada um. Listas como
    // "pericias"/"rituais"/"poderes...Escolhidos" têm o conteúdo de
    // cada item validado pelo próprio app (as regras só limitam
    // QUANTOS itens cabem, não o formato interno de cada um).
    function personagemValido(p) {
      return p.keys().hasOnly([
            'nome', 'trilha', 'nex', 'atributos', 'pericias', 'origem',
            'rituais', 'trilhaCombatenteEscolhida', 'poderesCombatenteEscolhidos',
            'trilhaEspecialistaEscolhida', 'poderesEspecialistaEscolhidos',
            'trilhaOcultistaEscolhida', 'poderesOcultistaEscolhidos', 'criadoEm'
          ])
        && ehTexto(p.nome, 100) && p.nome.size() >= 1
        && p.trilha in ['Combatente', 'Especialista', 'Ocultista']
        && p.nex is number && p.nex >= 5 && p.nex <= 99
        && atributosValidos(p.atributos)
        && ehLista(p.pericias, 100)
        && ehTexto(p.origem, 100)
        && ehLista(p.rituais, 100)
        && ehTexto(p.trilhaCombatenteEscolhida, 100)
        && ehLista(p.poderesCombatenteEscolhidos, 50)
        && ehTexto(p.trilhaEspecialistaEscolhida, 100)
        && ehLista(p.poderesEspecialistaEscolhidos, 50)
        && ehTexto(p.trilhaOcultistaEscolhida, 100)
        && ehLista(p.poderesOcultistaEscolhidos, 50);
    }

    // Preferências da conta (tema/cor dos dados 3D, atalhos de
    // teclado) -- ver Preferences.get/save em firebase.js. Usa
    // setDoc(merge:true), então o documento pode chegar com só um
    // subconjunto desses 3 campos a cada gravação.
    function preferenciasValidas(d) {
      return d.keys().hasOnly(['dadosTema', 'dadosCor', 'atalhosAtivos'])
        && (!('dadosTema' in d) || ehTexto(d.dadosTema, 50))
        && (!('dadosCor' in d) || d.dadosCor == null || ehTexto(d.dadosCor, 50))
        && (!('atalhosAtivos' in d) || d.atalhosAtivos is bool);
    }

    // ---- Regras ----

    match /usuarios/{userId} {
      allow read, delete: if donoAutenticado(userId);
      allow create, update: if donoAutenticado(userId) && preferenciasValidas(request.resource.data);
    }

    match /usuarios/{userId}/personagens/{personagemId} {
      allow read, delete: if donoAutenticado(userId);

      // "criadoEm" é escrito com serverTimestamp() (ver firebase.js) --
      // ao criar, tem que ser exatamente o horário do servidor; ao
      // editar, tem que continuar o mesmo (ninguém pode "voltar no
      // tempo" o personagem).
      allow create: if donoAutenticado(userId)
        && personagemValido(request.resource.data)
        && request.resource.data.criadoEm == request.time;

      allow update: if donoAutenticado(userId)
        && personagemValido(request.resource.data)
        && request.resource.data.criadoEm == resource.data.criadoEm;
    }
  }
}
```

(O bloco `usuarios/{userId}` -- o documento em si, não a subcoleção de
personagens -- guarda as preferências da conta que valem pra todos os
personagens. Se você já tinha as regras antigas publicadas, volte aqui
e cole essa versão atualizada.)

3. Clique em **"Publish"**.

**O que essas regras NÃO fazem** (caso um dia você precise disso):
elas não limitam **quantos personagens** cada usuário pode criar --
isso exigiria um contador separado (um documento "resumo" por usuário,
atualizado em transação a cada criação/remoção), que é mais trabalho e
não foi pedido agora. Se isso virar um problema de verdade (alguém
criando centenas de personagens-lixo), é possível adicionar depois.

**Se você mudar os nomes dos campos no código** (por exemplo, trocar
`trilhaCombatenteEscolhida` por outro nome, ou adicionar uma quarta
trilha): a função `personagemValido` acima vai **rejeitar** a
gravação até você atualizar a lista de campos permitidos nas regras
também -- é o preço de ter uma lista branca em vez de aceitar
qualquer coisa.

## 5b. Ativar o Firebase App Check (opcional, mas recomendado)

As regras do passo 5 garantem que só o dono acessa seus próprios
dados, e com o formato esperado -- mas nada ali impede que alguém
copie a sua `apiKey` (ela aparece no código do navegador de qualquer
app 100% front-end, não é segredo) e escreva um script próprio
batendo direto na API do Firestore, se passando por "um usuário
autenticado". O **App Check** resolve esse problema: ele faz o
navegador provar, a cada requisição, que quem está chamando é
mesmo o seu site rodando num navegador de verdade -- não um script.
Sem a chave configurada, o app continua funcionando normalmente
(é opcional); com ela, fica mais difícil abusar da sua API de fora
do site.

1. **Criar uma chave reCAPTCHA v3**: acesse
   [google.com/recaptcha/admin](https://www.google.com/recaptcha/admin/create)
   e registre um novo site.
   - Tipo: **reCAPTCHA v3**.
   - Domínios: adicione `localhost` (pra testar em dev) e o domínio de
     produção (ex: o seu `.vercel.app`, sem `https://`).
   - Ao salvar, copie a **"Chave do site"** (site key) -- é essa que
     entra no `.env.local`, não a chave secreta (essa última o App
     Check nunca usa no front-end).
2. **Registrar o app no Firebase**: no Console, vá em **Build → App
   Check**, clique em **"Get started"** e registre o seu app Web,
   escolhendo o provedor **reCAPTCHA v3** e colando a chave de site do
   passo anterior.
3. **Preencher a variável de ambiente**: copie a chave de site pro seu
   `.env.local` (veja o modelo já atualizado em `.env.example`):
   ```
   VITE_RECAPTCHA_SITE_KEY=sua-chave-de-site-aqui
   ```
   Reinicie `npm run dev` depois de salvar.
4. **Registrar o "token de depuração" pra testar em localhost**: o
   reCAPTCHA de verdade não valida bem o `localhost`, então o App
   Check tem um modo de depuração só pra isso. Com a chave já no
   `.env.local`, rode `npm run dev`, abra o site e veja o **console do
   navegador** (F12 → Console): na primeira vez vai aparecer uma
   mensagem com um token longo (algo como "App Check debug token:
   xxxxxxxx-xxxx-..."). Copie esse token e cole em **Build → App
   Check → aba "Apps" → ⋮ no seu app → "Manage debug tokens"**, dando
   um nome qualquer (ex: "meu notebook"). Sem isso, toda chamada ao
   Firestore feita a partir do `npm run dev` vai falhar assim que você
   fizer o passo 5 abaixo.
5. **Ativar a aplicação ("Enforced") -- faça isso por último, com
   calma**: enquanto você não mexe em nada, o App Check só *observa*
   (modo "Unenforced") -- ele não bloqueia ninguém ainda, só mostra
   métricas de quantas requisições vêm com e sem o token válido. Depois
   de testar o site normalmente (logado, criando/editando/removendo
   personagem) por alguns dias e ver que a maioria das requisições
   aparece como "verificadas" nas métricas de **Build → App Check →
   aba "APIs"**, aí sim mude o Cloud Firestore de "Unenforced" pra
   **"Enforced"**. Fazer isso cedo demais, sem testar, corre o risco de
   bloquear o próprio site se algo no passo 2-4 estiver errado.

## 6. Testar

## 6. Testar

1. Salve o `.env.local` com suas chaves.
2. Instale as dependências e rode o servidor local (veja abaixo).
3. Abra o endereço que aparecer no terminal: deve aparecer a tela de login. Clique em "Criar conta", cadastre um e-mail/senha de teste, e você deve cair na tela "Meus Personagens".

### Como rodar o projeto (lembrete)

```bash
npm install
npm run dev
```

Abra o endereço que aparecer no terminal (normalmente `http://localhost:5173`).

## Já tinha a versão antiga (HTML/CSS/JS puro) rodando?

Se você já tinha um `javascript/firebase-config.js` preenchido na
versão anterior deste projeto, não precisa criar um projeto Firebase
novo — é o mesmo projeto, só muda onde as chaves ficam guardadas.
Copie os mesmos valores de lá pro `.env.local` novo, seguindo o passo 2
acima (`apiKey` → `VITE_FIREBASE_API_KEY`, `authDomain` →
`VITE_FIREBASE_AUTH_DOMAIN`, e assim por diante).

## Estrutura dos dados no Firestore

Cada personagem é salvo em `usuarios/{seu-uid}/personagens/{id-do-personagem}` com este formato:

```json
{
  "nome": "Kaelen Vance",
  "trilha": "Ocultista",
  "atributos": { "agi": 1, "int": 3, "vig": 2, "pre": 2, "for": 0 },
  "pericias": [
    { "nome": "Ocultismo", "atributo": "int", "bonus": 5, "treinado": true }
  ]
}
```

## Problemas comuns

- **Tela de login não sai do lugar / erro no console mencionando "firebase" ou ".env"**: as chaves em `.env.local` ainda não foram preenchidas (ou o arquivo tem outro nome) — volte no passo 2, e lembre de reiniciar `npm run dev` depois de criar/editar o `.env.local`.
- **"Missing or insufficient permissions"**: as regras de segurança (passo 5) não foram publicadas, ou você editou a estrutura de pastas do Firestore.
- **E-mail/senha não funciona**: confira se o método "Email/Password" está mesmo ativado (passo 3).
- **Login com o Google dá erro `auth/unauthorized-domain`**: o domínio de onde você está acessando a ficha não está na lista de "Domínios autorizados" (Authentication → Settings → Authorized domains) — veja o passo 3b, item 7. Costuma acontecer na primeira vez que se testa fora do `localhost` (ex: logo depois de publicar em produção).
- **"Missing or insufficient permissions" só depois de criar/editar personagem (regras novas do passo 5)**: confira se o documento tem exatamente os campos esperados — um campo extra, faltando, ou com o tipo errado (ex: `nex` como texto em vez de número) faz a regra `personagemValido` rejeitar a gravação. Se você mudou algum nome de campo no código, atualize a lista em `personagemValido` nas regras também.
- **Firestore para de funcionar depois de ativar o App Check (passo 5b)**: geralmente é token de depuração não cadastrado (em dev/`localhost`) ou chave de site do reCAPTCHA errada/sem o domínio certo cadastrado. Volte a Cloud Firestore pra "Unenforced" em Build → App Check → APIs enquanto investiga — isso desbloqueia todo mundo na hora, sem precisar reverter nada no código.
