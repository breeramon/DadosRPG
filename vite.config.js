import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const srcDir = path.resolve(import.meta.dirname, 'src')

  return {
    plugins: [react()],
    resolve: {
      // Usando array (em vez de objeto) porque a ordem importa: o Vite
      // testa cada entrada na ordem e usa a primeira que bater com o
      // início do caminho importado. Se "@" viesse antes, ele já
      // "ganharia" pra qualquer import que começa com "@/..." (inclusive
      // "@/services/firebase") e o alias mais específico do modo e2e,
      // logo abaixo, nunca seria testado — foi exatamente o bug que
      // aconteceu na primeira versão disso (objeto, com "@" primeiro).
      alias: [
        // Modo especial "e2e" (usado pelos testes automatizados, ver
        // npm run dev:e2e): troca o serviço real do Firebase por uma
        // versão "de mentira" que guarda tudo no localStorage do
        // navegador, sem precisar de internet nem mexer no banco de
        // dados real. Isso é o mesmo truque de "stub" que a versão
        // vanilla usava (arquivos separados servidos por um servidor de
        // teste) — aqui vira só uma troca de alias no bundler. Precisa
        // vir ANTES do alias genérico "@" (ver comentário acima).
        ...(mode === 'e2e'
          ? [{ find: '@/services/firebase', replacement: path.resolve(srcDir, 'services/firebase.stub.js') }]
          : []),

        // Alias "@" -> src/, pra não ficar escrevendo "../../../services/x"
        // conforme os componentes vão ficando mais aninhados.
        { find: '@', replacement: srcDir },
      ],
    },
  }
})
