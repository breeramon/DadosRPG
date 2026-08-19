// ============================================================
// firebase-config.example.js
//
// MODELO — copie este arquivo para "firebase-config.js" (mesma pasta) e
// preencha com as chaves do SEU projeto Firebase. O arquivo real
// (firebase-config.js) está no .gitignore e não sobe pro GitHub.
//
// Onde pegar suas chaves: console.firebase.google.com → seu projeto →
// ⚙️ Configurações do projeto → aba "Geral" → seção "Seus apps" → app Web.
// Veja o passo a passo completo em GUIA_FIREBASE.md.
//
// Essas chaves NÃO são secretas como uma senha — elas só identificam o
// projeto, e mesmo assim ficam visíveis no navegador de quem usar o site
// (é assim que qualquer app 100% front-end funciona). Quem protege os
// dados de verdade são as Regras de Segurança do Firestore.
//
// IMPORTANTE: este arquivo só pode ter esse "export const firebaseConfig
// = {...}". Não cole aqui o bloco de código completo que o console do
// Firebase mostra (com "import ... from firebase/app" e
// "initializeApp(...)") — isso já é feito uma vez só dentro de
// javascript/firebase.js; colar de novo aqui inicializa o app duas vezes
// e quebra o carregamento.
// ============================================================

export const firebaseConfig = {
    apiKey: "COLE_AQUI_SUA_API_KEY",
    authDomain: "SEU-PROJETO.firebaseapp.com",
    projectId: "SEU-PROJETO",
    storageBucket: "SEU-PROJETO.appspot.com",
    messagingSenderId: "000000000000",
    appId: "1:000000000000:web:xxxxxxxxxxxxxxxxxxxxxx",
};
