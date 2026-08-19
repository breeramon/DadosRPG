// ============================================================
// firebase.stub.js
//
// Versão "de mentira" do serviço de Firebase (mesma API pública de
// firebase.js: exporta Auth e Characters), usada SÓ pelos testes
// automatizados (npm run dev -- --mode e2e / npm run test:e2e). Guarda
// tudo no localStorage do navegador em vez de falar com o Firebase de
// verdade — assim os testes rodam sem internet e sem tocar em dados
// reais de usuário. Trocada automaticamente no lugar de firebase.js
// pelo alias condicional em vite.config.js (só quando mode === 'e2e').
//
// Não precisa ser "realista" por dentro — só precisa se comportar da
// mesma forma que o serviço real do ponto de vista de quem chama
// (mesmas assinaturas, mesmos formatos de retorno, mesmos erros).
// ============================================================

const LS_USERS = 'e2e_stub_users';       // [{ uid, email, senha }]
const LS_SESSION = 'e2e_stub_session';   // { uid, email } | null
const LS_CHARS_PREFIX = 'e2e_stub_chars_'; // e2e_stub_chars_<uid> -> [personagem]

function lerJSON(chave, padrao) {
    try {
        const bruto = localStorage.getItem(chave);
        return bruto ? JSON.parse(bruto) : padrao;
    } catch {
        return padrao;
    }
}

function salvarJSON(chave, valor) {
    localStorage.setItem(chave, JSON.stringify(valor));
}

function gerarId(prefixo) {
    return `${prefixo}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const listeners = new Set();

function usuarioAtual() {
    return lerJSON(LS_SESSION, null);
}

function notificarListeners() {
    const user = usuarioAtual();
    listeners.forEach(cb => cb(user));
}

// ---------------------------------------------------------------
// AUTENTICAÇÃO (fake)
// ---------------------------------------------------------------
export const Auth = {
    async signUp(email, senha) {
        const usuarios = lerJSON(LS_USERS, []);
        if (usuarios.some(u => u.email === email)) {
            const err = new Error('E-mail já cadastrado.');
            err.code = 'auth/email-already-in-use';
            throw err;
        }
        const novo = { uid: gerarId('uid'), email, senha };
        usuarios.push(novo);
        salvarJSON(LS_USERS, usuarios);
        salvarJSON(LS_SESSION, { uid: novo.uid, email: novo.email });
        notificarListeners();
        return { uid: novo.uid, email: novo.email };
    },

    async signIn(email, senha) {
        const usuarios = lerJSON(LS_USERS, []);
        const encontrado = usuarios.find(u => u.email === email && u.senha === senha);
        if (!encontrado) {
            const err = new Error('E-mail ou senha incorretos.');
            err.code = 'auth/invalid-credential';
            throw err;
        }
        salvarJSON(LS_SESSION, { uid: encontrado.uid, email: encontrado.email });
        notificarListeners();
        return { uid: encontrado.uid, email: encontrado.email };
    },

    async signOut() {
        localStorage.removeItem(LS_SESSION);
        notificarListeners();
    },

    onChange(callback) {
        listeners.add(callback);
        // Mesmo comportamento do real: chama já de cara com o estado atual.
        callback(usuarioAtual());
        return () => listeners.delete(callback);
    },

    friendlyError(err) {
        return (err && err.message) || 'Não foi possível completar a operação.';
    },
};

// ---------------------------------------------------------------
// PERSONAGENS (fake, em localStorage)
// ---------------------------------------------------------------
export const Characters = {
    async list(uid) {
        return lerJSON(LS_CHARS_PREFIX + uid, []);
    },

    async get(uid, id) {
        const lista = lerJSON(LS_CHARS_PREFIX + uid, []);
        return lista.find(p => p.id === id) || null;
    },

    async create(uid, dados) {
        const lista = lerJSON(LS_CHARS_PREFIX + uid, []);
        const id = gerarId('char');
        lista.push({ id, ...dados, criadoEm: new Date().toISOString() });
        salvarJSON(LS_CHARS_PREFIX + uid, lista);
        return id;
    },

    async update(uid, id, dados) {
        const lista = lerJSON(LS_CHARS_PREFIX + uid, []);
        const idx = lista.findIndex(p => p.id === id);
        if (idx !== -1) {
            lista[idx] = { ...lista[idx], ...dados };
            salvarJSON(LS_CHARS_PREFIX + uid, lista);
        }
    },

    async remove(uid, id) {
        const lista = lerJSON(LS_CHARS_PREFIX + uid, []);
        salvarJSON(LS_CHARS_PREFIX + uid, lista.filter(p => p.id !== id));
    },
};
