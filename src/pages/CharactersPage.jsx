// ============================================================
// CharactersPage.jsx
//
// Tela "Meus Personagens" (equivalente a characters.html +
// javascript/characters-list.js na versão vanilla): lista, abrir,
// editar e excluir personagens. O usuário logado vem do RequireAuth
// (ver App.jsx), que só deixa chegar aqui quem já tem sessão.
// ============================================================

import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Auth, Characters } from '@/services/firebase';

export default function CharactersPage() {
    const { user } = useOutletContext();
    const navigate = useNavigate();

    const [personagens, setPersonagens] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState(null);

    const carregarPersonagens = useCallback(async () => {
        setCarregando(true);
        setErro(null);
        try {
            const lista = await Characters.list(user.uid);
            setPersonagens(lista);
        } catch (err) {
            console.error('[characters-list] Erro ao listar personagens:', err);
            setErro('Não foi possível carregar seus personagens: ' + (err.message || err));
        } finally {
            setCarregando(false);
        }
    }, [user.uid]);

    useEffect(() => {
        carregarPersonagens();
    }, [carregarPersonagens]);

    async function excluirPersonagem(personagem) {
        const ok = window.confirm(`Excluir "${personagem.nome}"? Essa ação não pode ser desfeita.`);
        if (!ok) return;
        try {
            await Characters.remove(user.uid, personagem.id);
            await carregarPersonagens();
        } catch (err) {
            console.error('[characters-list] Erro ao excluir personagem:', err);
            window.alert('Não foi possível excluir: ' + (err.message || err));
        }
    }

    async function handleLogout() {
        await Auth.signOut();
        navigate('/');
    }

    return (
        <div className="screen screen-characters">
            <div className="characters-panel">
                <div className="characters-header">
                    <h2>Meus Personagens</h2>
                    <div className="characters-header-actions">
                        <button className="btn-action" onClick={() => navigate('/form')}>
                            + Novo Personagem
                        </button>
                        <button className="btn-secondary" onClick={handleLogout}>Sair</button>
                    </div>
                </div>

                {erro && <div className="characters-empty">{erro}</div>}

                {!erro && !carregando && personagens.length === 0 && (
                    <div className="characters-empty">
                        Você ainda não criou nenhum personagem.
                    </div>
                )}

                <div className="characters-list">
                    {personagens.map(personagem => {
                        const nex = Number(personagem.nex) || 5;
                        return (
                            <div className="character-card" key={personagem.id}>
                                <div className="character-card-info">
                                    <strong>{personagem.nome || '(sem nome)'}</strong>
                                    <span className="character-card-trilha">
                                        {personagem.trilha || ''} • NEX {nex}%
                                    </span>
                                </div>
                                <div className="character-card-actions">
                                    <button
                                        className="btn-action"
                                        onClick={() => navigate(`/sheet/${encodeURIComponent(personagem.id)}`)}
                                    >
                                        Abrir
                                    </button>
                                    <button
                                        className="btn-secondary"
                                        onClick={() => navigate(`/form/${encodeURIComponent(personagem.id)}`)}
                                    >
                                        Editar
                                    </button>
                                    <button className="btn-danger" onClick={() => excluirPersonagem(personagem)}>
                                        Excluir
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
