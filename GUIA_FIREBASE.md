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

## 4. Criar o banco de dados (Firestore)

1. No menu lateral, vá em **Build → Firestore Database**.
2. Clique em **"Create database"**.
3. Escolha a localização (qualquer uma serve; `southamerica-east1` fica mais perto do Brasil) e clique em avançar.
4. Pode iniciar em **modo de produção** (production mode) — no próximo passo vamos colar as regras corretas.

## 5. Colar as regras de segurança

Isso é o que garante que cada usuário só enxerga e edita os **próprios**
personagens, nunca os de outra pessoa.

1. Ainda em Firestore Database, vá na aba **"Rules"**.
2. Apague o conteúdo atual e cole:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /usuarios/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /usuarios/{userId}/personagens/{personagemId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

(O primeiro bloco, pro documento `usuarios/{userId}` em si — não a
subcoleção de personagens —, guarda preferências da conta que valem
pra todos os personagens, como o tema/cor escolhida pros dados 3D. Se
você já tinha as regras antigas publicadas antes dessa funcionalidade
existir, volte aqui e cole essa versão atualizada.)

3. Clique em **"Publish"**.

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
