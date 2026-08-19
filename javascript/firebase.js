// ============================================================
// firebase.js
//
// Única responsabilidade: falar com o Firebase (Auth + Firestore) e
// expor uma API simples pro resto do app usar, sem cada arquivo ter
// que saber os detalhes do SDK. Carrega o SDK via CDN (mesmo esquema
// do dice-animation.js) — não precisa de npm/bundler.
//
// Expõe:
//   window.Auth.signUp(email, senha)   -> Promise<User>
//   window.Auth.signIn(email, senha)   -> Promise<User>
//   window.Auth.signOut()              -> Promise<void>
//   window.Auth.onChange(cb)           -> chama cb(user | null) sempre
//                                          que o estado de login mudar
//   window.Auth.friendlyError(err)     -> mensagem de erro em PT-BR
//
//   window.Characters.list(uid)              -> Promise<Array<Personagem>>
//   window.Characters.create(uid, dados)     -> Promise<string id>
//   window.Characters.update(uid, id, dados) -> Promise<void>
//   window.Characters.remove(uid, id)        -> Promise<void>
//
// Se as chaves em firebase-config.js ainda não foram preenchidas, ou o
// Firebase não conseguir carregar (sem internet, chaves erradas etc.),
// todas as chamadas acima rejeitam com um erro — quem chama decide o
// que mostrar na tela (veja app-ui.js).
// ============================================================

import { firebaseConfig } from './firebase-config.js';

const FIREBASE_SDK_VERSION = '12.17.1';
const CDN_BASE = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/`;

let auth = null;
let db = null;
let authApi = null;
let firestoreApi = null;

async function initFirebase() {
    if (!firebaseConfig || firebaseConfig.apiKey === 'COLE_AQUI_SUA_API_KEY') {
        throw new Error(
            'Firebase ainda não configurado: preencha javascript/firebase-config.js ' +
            'com as chaves do seu projeto (veja o guia de configuração).'
        );
    }

    const [{ initializeApp }, authModule, firestoreModule] = await Promise.all([
        import(/* webpackIgnore: true */ `${CDN_BASE}firebase-app.js`),
        import(/* webpackIgnore: true */ `${CDN_BASE}firebase-auth.js`),
        import(/* webpackIgnore: true */ `${CDN_BASE}firebase-firestore.js`),
    ]);

    const app = initializeApp(firebaseConfig);
    authApi = authModule;
    firestoreApi = firestoreModule;
    auth = authApi.getAuth(app);
    db = firestoreApi.getFirestore(app);
}

const readyPromise = initFirebase().catch(err => {
    console.warn('[firebase] Não foi possível inicializar o Firebase.', err);
    // Deixa o erro "guardado" pra quem chamar qualquer função depois saber o motivo.
    throw err;
});

function personagensRef(uid) {
    return firestoreApi.collection(db, 'usuarios', uid, 'personagens');
}

// ---------------------------------------------------------------
// AUTENTICAÇÃO
// ---------------------------------------------------------------
window.Auth = {
    async signUp(email, senha) {
        await readyPromise;
        const cred = await authApi.createUserWithEmailAndPassword(auth, email, senha);
        return cred.user;
    },

    async signIn(email, senha) {
        await readyPromise;
        const cred = await authApi.signInWithEmailAndPassword(auth, email, senha);
        return cred.user;
    },

    async signOut() {
        await readyPromise;
        return authApi.signOut(auth);
    },

    // Registra um listener que é chamado com o usuário logado (ou null)
    // sempre que o estado de autenticação muda, incluindo ao carregar a
    // página. Se o Firebase não inicializar, chama cb(null) uma vez.
    onChange(callback) {
        readyPromise
            .then(() => authApi.onAuthStateChanged(auth, callback))
            .catch(() => callback(null));
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
window.Characters = {
    async list(uid) {
        await readyPromise;
        const snap = await firestoreApi.getDocs(personagensRef(uid));
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    async create(uid, dados) {
        await readyPromise;
        const payload = {
            ...dados,
            criadoEm: firestoreApi.serverTimestamp ? firestoreApi.serverTimestamp() : new Date().toISOString(),
        };
        const docRef = await firestoreApi.addDoc(personagensRef(uid), payload);
        return docRef.id;
    },

    async update(uid, id, dados) {
        await readyPromise;
        const ref = firestoreApi.doc(db, 'usuarios', uid, 'personagens', id);
        return firestoreApi.updateDoc(ref, dados);
    },

    async remove(uid, id) {
        await readyPromise;
        const ref = firestoreApi.doc(db, 'usuarios', uid, 'personagens', id);
        return firestoreApi.deleteDoc(ref);
    },
};
