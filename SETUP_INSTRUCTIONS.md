# Instruções de Configuração - Curva de Juros

## 1. Configurar o Schema do Banco de Dados Supabase

**IMPORTANTE:** Antes de executar a aplicação, você precisa criar as tabelas no banco de dados Supabase.

### Passos:

1. Acesse o painel do Supabase: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor** (no menu lateral)
4. Copie todo o conteúdo do arquivo `server/database/schema.sql`
5. Cole no editor SQL e clique em **Run**

Isso criará as tabelas:
- `di1_prices` - Armazena os dados históricos das cotações dos contratos DI1
- `opportunities_cache` - Armazena as oportunidades de arbitragem calculadas

## 2. Verificar as Variáveis de Ambiente

As seguintes variáveis já foram configuradas nos Replit Secrets:
- `SUPABASE_URL` - URL do projeto Supabase
- `SUPABASE_SERVICE_KEY` - Chave de serviço do Supabase
- `GEMINI_API_KEY` - Chave da API do Gemini (usada anteriormente)

## 3. Como Funciona a População Inicial

Quando o backend é iniciado pela primeira vez:

1. Verifica se existem dados no banco (`di1_prices`)
2. Se não houver dados:
   - **Popula automaticamente com dados simulados** (100 dias úteis)
   - Calcula oportunidades de arbitragem
   - **Aplicação fica funcional imediatamente** (1-2 segundos)

**NOVO:** Agora o sistema usa dados simulados para que você possa testar imediatamente!

**Coleta Real de Dados:**
- Cron job configurado para rodar às **21:00 horário de Brasília**
- Tenta buscar dados reais da B3
- Se B3 estiver indisponível, mantém dados simulados
- Atualiza apenas em **dias úteis**

Você pode acompanhar o progresso nos logs do workflow "Backend Server".

## 4. Endpoints da API Backend

O backend expõe os seguintes endpoints na porta 3000:

- `GET /health` - Verifica se o servidor está funcionando
- `GET /api/opportunities` - Lista todas as oportunidades calculadas
- `GET /api/pair/:pairId` - Detalhes de um par específico (ex: DI1F25-DI1F26)
- `POST /api/recalculate` - Força o recálculo das oportunidades

## 5. Rotina Automática de Coleta

O sistema está configurado para coletar dados automaticamente:

- **Horário:** Todos os dias às 21:00 (horário de Brasília)
- **Condição:** Apenas em dias úteis
- **Processo:**
  1. Coleta dados do dia da B3
  2. Salva no banco de dados
  3. Recalcula as oportunidades
  4. Atualiza o cache

## 6. Testando o Sistema

### Testar Backend:
```bash
curl http://localhost:3000/health
curl http://localhost:3000/api/opportunities
```

### Testar Frontend:
- Acesse a URL do Replit (o frontend rodando na porta 5000)
- O site deve carregar as oportunidades do backend

## 7. Troubleshooting

### "Erro na conexão" no Frontend:
- Verifique se o workflow "Backend Server" está rodando
- Verifique se as tabelas foram criadas no Supabase (passo 1)

### "No data found" no Backend:
- A população inicial ainda está em andamento
- Verifique os logs do "Backend Server" para acompanhar o progresso

### "Failed to fetch opportunities":
- As tabelas ainda não foram criadas no Supabase
- Execute o script SQL do passo 1

## 8. Arquitetura

```
Frontend (porta 5000)
  ↓ fetch API
Backend (porta 3000)
  ↓ Supabase Client
Banco de Dados Supabase (PostgreSQL)
  ↓ Dados históricos
B3 API (scraping)
```

## 9. Otimizações Realizadas

**Antes:**
- Frontend fazia scraping da B3 (300+ linhas de código)
- Cálculos pesados no navegador (loops, estatísticas)
- Tempo de loading: ~5 segundos

**Depois:**
- Backend faz scraping e salva no banco
- Cálculos pré-processados e em cache
- Frontend apenas exibe dados (4 linhas de código)
- Tempo de loading: <1 segundo
