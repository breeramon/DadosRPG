// ============================================================
// firebase.js
//
// Única responsabilidade: falar com o Firebase (Auth + Firestore) e
// expor uma API simples pro resto do app usar (hooks/páginas), sem que
// cada componente precise saber os detalhes do SDK.
//
// Diferente da versão vanilla (que carregava o SDK via CDN dentro do
// próprio arquivo, com <script type="importmap">), aqui o Firebase vem
// do pacote npm "firebase" e é o Vite quem empacota tudo — não depende
// de internet pra baixar o SDK em tempo de execução, só pra falar com
// o servidor do Firebase mesmo (login, banco de dados).
//
// As chaves do projeto (antes em javascript/firebase-config.js) agora
// vêm de variáveis de ambiente do Vite (import.meta.env.VITE_*),
// definidas no arquivo ".env.local" (não vai pro git — veja
// .env.example pro modelo). Isso é o jeito padrão do Vite de lidar com
// esse tipo de configuração.
//
// Expõe:
//   Auth.signUp(email, senha)   -> Promise<User>
//   Auth.signIn(email, senha)   -> Promise<User>
//   Auth.signOut()              -> Promise<void>
//   Auth.onChange(cb)           -> retorna a função de "unsubscribe";
//                                   chama cb(user | null) sempre que o
//                                   estado de login mudar (inclusive ao
//                                   carregar a página)
//   Auth.friendlyError(err)     -> mensagem de erro em PT-BR
//
//   Characters.list(uid)              -> Promise<Array<Personagem>>
//   Characters.get(uid, id)           -> Promise<Personagem|null>
//   Characters.create(uid, dados)     -> Promise<string id>
//   Characters.update(uid, id, dados) -> Promise<void>
//   Characters.remove(uid, id)        -> Promise<void>
//
//   Preferences.get(uid)         -> Promise<Object|null> (preferências
//                                    da CONTA, não do personagem — ex:
//                                    tema/cor dos dados 3D)
//   Preferences.save(uid, dados) -> Promise<void>
//
// Se as variáveis de ambiente ainda não foram preenchidas, ou o
// Firebase não conseguir inicializar (sem internet, chaves erradas
// etc.), todas as chamadas acima rejeitam com um erro — quem chama
// decide o que mostrar na tela.
// ============================================================

import { initializeApp } from 'firebase/app';
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged,
} from 'firebase/auth';
import {
    getFirestore,
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    setDoc,
    deleteDoc,
    serverTimestamp,
} from 'firebase/firestore';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let auth = null;
let db = null;
let initError = null;

if (!firebaseConfig.apiKey) {
    initError = new Error(
        'Firebase ainda não configurado: preencha o arquivo .env.local com as ' +
        'chaves do seu projeto (veja .env.example e GUIA_FIREBASE.md).'
    );
    console.warn('[firebase]', initError.message);
} else {
    try {
        const app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
    } catch (err) {
        initError = err;
        console.warn('[firebase] Não foi possível inicializar o Firebase.', err);
    }
}

function checarPronto() {
    if (initError) throw initError;
}

function personagensRef(uid) {
    return collection(db, 'usuarios', uid, 'personagens');
}

// ---------------------------------------------------------------
// AUTENTICAÇÃO
// ---------------------------------------------------------------
export const Auth = {
    async signUp(email, senha) {
        checarPronto();
        const cred = await createUserWithEmailAndPassword(auth, email, senha);
        return cred.user;
    },

    async signIn(email, senha) {
        checarPronto();
        const cred = await signInWithEmailAndPassword(auth, email, senha);
        return cred.user;
    },

    async signOut() {
        checarPronto();
        return firebaseSignOut(auth);
    },

    // Registra um listener chamado com o usuário logado (ou null) sempre
    // que o estado de autenticação muda, incluindo ao carregar a página.
    // Diferente da versão vanilla, devolve a função de "unsubscribe" do
    // próprio Firebase — útil no useEffect de um hook React, que precisa
    // limpar o listener quando o componente desmonta. Se o Firebase não
    // inicializar, chama cb(null) uma vez e devolve um no-op.
    onChange(callback) {
        if (initError) {
            callback(null);
            return () => {};
        }
        return onAuthStateChanged(auth, callback);
    },

    // Traduz os códigos de erro mais comuns do Firebase Auth pra
    // mensagens legíveis em português.
    friendlyError(err) {
        const code = err && err.code;
        const mensagens = {
            'auth/invalid-email': 'E-mail inválido.',
            'auth/user-disabled': 'Essa conta foi desativada.',
            'auth/user-not-found': 'Não existe conta com esse e-mail.',
            'auth/wrong-password': 'Senha incorreta.',
            'auth/invalid-credential': 'E-mail ou senha incorretos.',
            'auth/invalid-login-credentials': 'E-mail ou senha incorretos.',
            'auth/email-already-in-use': 'Já existe uma conta com esse e-mail.',
            'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
            'auth/too-many-requests': 'Muitas tentativas seguidas. Tente novamente em instantes.',
            'auth/network-request-failed': 'Falha de conexão. Verifique sua internet.',
        };
        return mensagens[code] || (err && err.message) || 'Não foi possível completar a operação.';
    },
};

// ---------------------------------------------------------------
// PERSONAGENS (Firestore: usuarios/{uid}/personagens/{id})
// ---------------------------------------------------------------
export const Characters = {
    async list(uid) {
        checarPronto();
        const snap = await getDocs(personagensRef(uid));
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    // Busca um personagem específico direto pelo id — usado pela tela
    // de editar e pela ficha, que recebem o id pela URL (rota
    // /form/:id, /sheet/:id) em vez de já terem o personagem em memória.
    async get(uid, id) {
        checarPronto();
        const ref = doc(db, 'usuarios', uid, 'personagens', id);
        const snap = await getDoc(ref);
        return snap.exists() ? { id: snap.id, ...snap.data() } : null;
    },

    async create(uid, dados) {
        checarPronto();
        const payload = { ...dados, criadoEm: serverTimestamp() };
        const docRef = await addDoc(personagensRef(uid), payload);
        return docRef.id;
    },

    async update(uid, id, dados) {
        checarPronto();
        const ref = doc(db, 'usuarios', uid, 'personagens', id);
        return updateDoc(ref, dados);
    },

    async remove(uid, id) {
        checarPronto();
        const ref = doc(db, 'usuarios', uid, 'personagens', id);
        return deleteDoc(ref);
    },
};

// ---------------------------------------------------------------
// PREFERÊNCIAS DA CONTA (Firestore: usuarios/{uid} — o documento "pai"
// da subcoleção de personagens acima, não um personagem)
//
// Hoje só guarda o tema/cor escolhido pros dados 3D (ver
// DiceThemeModal.jsx) — vale pra TODOS os personagens da conta, por
// isso mora aqui e não dentro de cada personagem. Usa "setDoc(...,
// {merge:true})" em vez de "updateDoc" de propósito: esse documento
// nunca foi criado antes de existir esta funcionalidade (só a
// subcoleção "personagens" era escrita), então "updateDoc" falharia
// com "No document to update" na primeira vez pra quem já tinha conta
// antes dessa mudança — "setDoc" com merge cria o documento se não
// existir, e só mescla os campos novos se já existir.
//
// IMPORTANTE: as regras do Firestore (ver GUIA_FIREBASE.md, passo 5)
// precisam de um match extra pra "usuarios/{userId}" (o documento em
// si, não só a subcoleção "personagens") pra isso funcionar — sem
// isso, get/save aqui falham com "Missing or insufficient
// permissions", mesmo com as regras antigas publicadas certinho.
// ---------------------------------------------------------------
export const Preferences = {
    async get(uid) {
        checarPronto();
        const ref = doc(db, 'usuarios', uid);
        const snap = await getDoc(ref);
        return snap.exists() ? snap.data() : null;
    },

    async save(uid, dados) {
        checarPronto();
        const ref = doc(db, 'usuarios', uid);
        return setDoc(ref, dados, { merge: true });
    },
};
