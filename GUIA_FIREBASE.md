# Configurando o login e o salvamento de personagens (Firebase)

A ficha agora tem login por e-mail/senha e salva os personagens de cada
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

4. Copie esses valores e cole no arquivo **`javascript/firebase-config.js`** do projeto, substituindo os valores de exemplo. Essas chaves não são secretas (não são como uma senha) — só identificam o projeto.

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
    match /usuarios/{userId}/personagens/{personagemId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

3. Clique em **"Publish"**.

## 6. Testar

1. Salve o `javascript/firebase-config.js` com suas chaves.
2. Rode o projeto por um servidor local (veja abaixo — é obrigatório, `file://` direto não funciona com módulos JS).
3. Abra a página: deve aparecer a tela de login. Clique em "Criar conta", cadastre um e-mail/senha de teste, e você deve cair na tela "Meus Personagens".

### Como rodar o projeto (lembrete)

- **VS Code + Live Server**: clique com o botão direito no `index.html` → "Open with Live Server".
- **ou Python**: `python -m http.server 8000` na pasta do projeto, depois abra `http://localhost:8000`.

Abrir o `index.html` com duplo clique (`file://`) não funciona — nem a
animação dos dados nem o login carregam nesse modo, porque o navegador
bloqueia esse tipo de módulo JavaScript fora de um servidor.

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

- **Tela de login não sai do lugar / erro no console mencionando "firebase-config"**: as chaves em `javascript/firebase-config.js` ainda estão com os valores de exemplo — volte no passo 2.
- **"Missing or insufficient permissions"**: as regras de segurança (passo 5) não foram publicadas, ou você editou a estrutura de pastas do Firestore.
- **E-mail/senha não funciona**: confira se o método "Email/Password" está mesmo ativado (passo 3).
