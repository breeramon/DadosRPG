// ============================================================
// characters-list.js
//
// Lógica da tela "Meus Personagens" (characters.html): lista, abrir,
// editar e excluir. Requer login (ver javascript/auth-guard.js).
// ============================================================

let currentUser = null;

async function renderCharacterList() {
    const listEl = document.getElementById('characters-list');
    const emptyEl = document.getElementById('characters-empty');
    listEl.innerHTML = '';

    let personagens = [];
    try {
        personagens = await window.Characters.list(currentUser.uid);
    } catch (err) {
        console.error('[characters-list] Erro ao listar personagens:', err);
        const errEl = document.createElement('div');
        errEl.className = 'characters-empty';
        errEl.textContent = 'Não foi possível carregar seus personagens: ' + (err.message || err);
        listEl.appendChild(errEl);
        return;
    }

    emptyEl.classList.toggle('hidden', personagens.length > 0);

    personagens.forEach(personagem => {
        const card = document.createElement('div');
        card.className = 'character-card';

        const info = document.createElement('div');
        info.className = 'character-card-info';
        const nameEl = document.createElement('strong');
        nameEl.textContent = personagem.nome || '(sem nome)';
        const trilhaEl = document.createElement('span');
        trilhaEl.className = 'character-card-trilha';
        const nex = Number(personagem.nex) || 5;
        trilhaEl.textContent = `${personagem.trilha || ''} • NEX ${nex}%`;
        info.append(nameEl, trilhaEl);

        const actions = document.createElement('div');
        actions.className = 'character-card-actions';

        const btnAbrir = document.createElement('button');
        btnAbrir.className = 'btn-action';
        btnAbrir.textContent = 'Abrir';
        btnAbrir.onclick = () => { window.location.href = `sheet.html?id=${encodeURIComponent(personagem.id)}`; };

        const btnEditar = document.createElement('button');
        btnEditar.className = 'btn-secondary';
        btnEditar.textContent = 'Editar';
        btnEditar.onclick = () => { window.location.href = `form.html?id=${encodeURIComponent(personagem.id)}`; };

        const btnExcluir = document.createElement('button');
        btnExcluir.className = 'btn-danger';
        btnExcluir.textContent = 'Excluir';
        btnExcluir.onclick = () => excluirPersonagem(personagem);

        actions.append(btnAbrir, btnEditar, btnExcluir);
        card.append(info, actions);
        listEl.appendChild(card);
    });
}

async function excluirPersonagem(personagem) {
    const ok = confirm(`Excluir "${personagem.nome}"? Essa ação não pode ser desfeita.`);
    if (!ok) return;
    try {
        await window.Characters.remove(currentUser.uid, personagem.id);
        await renderCharacterList();
    } catch (err) {
        console.error('[characters-list] Erro ao excluir personagem:', err);
        alert('Não foi possível excluir: ' + (err.message || err));
    }
}

function wireStaticButtons() {
    document.getElementById('btn-novo-personagem').addEventListener('click', () => {
        window.location.href = 'form.html';
    });
    document.getElementById('btn-logout').addEventListener('click', async () => {
        if (window.Auth) await window.Auth.signOut();
        window.location.href = 'index.html';
    });
}

wireStaticButtons();
window.requireAuth(async (user) => {
    currentUser = user;
    await renderCharacterList();
});
