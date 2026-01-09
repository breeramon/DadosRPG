// Aguarda o HTML carregar completamente antes de rodar o script
document.addEventListener('DOMContentLoaded', () => {
    
    // Pega o botão pelo ID e adiciona o evento de clique
    const button = document.getElementById('btnRoll');
    button.addEventListener('click', rollDice);

});

function rollDice() {
    // Seleciona os elementos
    const amountInput = document.getElementById('amount');
    const typeInput = document.getElementById('type');
    const resultsDiv = document.getElementById('results');
    const totalDisplay = document.getElementById('totalDisplay');
    const totalValue = document.getElementById('totalValue');

    // Converte os valores para números inteiros
    const amount = parseInt(amountInput.value);
    const type = parseInt(typeInput.value);

    // Limpa resultados anteriores
    resultsDiv.innerHTML = '';
    let total = 0;

    // Validação
    if (amount < 1 || isNaN(amount)) {
        alert("Por favor, escolha pelo menos 1 dado.");
        return;
    }

    // Loop de rolagem
    for (let i = 0; i < amount; i++) {
        const result = Math.floor(Math.random() * type) + 1;
        total += result;

        // Criação visual do dado
        const dieDiv = document.createElement('div');
        dieDiv.classList.add('die');
        dieDiv.innerText = result;
        
        // Cores para Crítico (Máximo) e Falha (1)
        if (result === type) {
            dieDiv.style.backgroundColor = '#2ecc71'; // Verde
            dieDiv.style.color = 'white';
        } else if (result === 1) {
            dieDiv.style.backgroundColor = '#e74c3c'; // Vermelho
            dieDiv.style.color = 'white';
        }

        resultsDiv.appendChild(dieDiv);
    }

    // Exibe o total
    totalValue.innerText = total;
    totalDisplay.style.display = 'block';
}