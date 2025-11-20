# 🚀 Início Rápido - 3 Minutos

## ⚠️ AÇÃO NECESSÁRIA: Criar Tabelas no Supabase

O sistema está **pronto**, mas precisa que você crie as tabelas no banco de dados primeiro.

### 📋 Passo a Passo (2 minutos)

#### 1. Abra o Supabase
Vá para: https://supabase.com/dashboard

#### 2. Selecione seu projeto
Clique no projeto que você criou

#### 3. Abra o SQL Editor
No menu lateral esquerdo, clique em **"SQL Editor"**

#### 4. Crie uma nova query
Clique no botão verde **"New query"**

#### 5. Copie o SQL
Abra o arquivo `server/database/schema.sql` aqui no Replit e copie **TODO** o conteúdo

#### 6. Cole e Execute
- Cole o SQL no editor do Supabase
- Clique em **"Run"** (ou aperte F5)
- Você verá: ✅ **"Success. No rows returned"**

### ✅ Pronto!

Agora clique em **"Run"** aqui no Replit.

O sistema vai automaticamente:
1. ✅ Conectar ao Supabase
2. ✅ Popular banco com 100 dias de dados simulados
3. ✅ Calcular oportunidades de arbitragem
4. ✅ Abrir o dashboard

**Tempo estimado**: ~2 segundos

---

## 📝 O que acontece depois?

### Dados Simulados (Imediato)
- 100 dias de histórico
- Oportunidades de arbitragem calculadas
- Dashboard totalmente funcional

### Coleta Automática (Diária)
- **Horário**: 21:00 horário de Brasília
- **Frequência**: Apenas dias úteis
- **Fonte**: B3 Exchange (dados reais)

---

## 🔍 Como verificar se funcionou?

### No Supabase:
1. Vá em **"Table Editor"**
2. Você deve ver as tabelas:
   - `di1_prices` (vazia antes do seed)
   - `opportunities_cache` (vazia antes do seed)

### No Replit:
1. Após clicar "Run", veja os logs do **"Backend Server"**
2. Você verá mensagens como:
   ```
   ✓ Seeding database with simulated data...
   ✓ Inserting 500 simulated records...
   ✓ Successfully seeded 500 records
   ✓ Calculating initial opportunities...
   ✓ Database ready with simulated data
   ```

### No Dashboard (Frontend):
1. Acesse a URL do webview
2. Você verá oportunidades de arbitragem
3. Gráficos e métricas carregadas

---

## ❓ Problemas?

### Erro: "Could not find table"
→ Você não executou o SQL no Supabase ainda (volte ao passo 3)

### Erro: "Database connection failed"
→ Verifique se os Secrets estão configurados:
   - Clique no ícone 🔒
   - Confirme `SUPABASE_URL` e `SUPABASE_SERVICE_KEY`

### Frontend vazio
→ Aguarde 2-3 segundos para o seed completar
→ Recarregue a página

---

## 📊 Próximos Passos

Após ver o dashboard funcionando:

1. **Explore as oportunidades**
   - Clique em um par para ver detalhes
   - Analise Z-scores e spreads
   - Veja gráficos históricos

2. **Entenda as métricas**
   - **Z-score**: Desvio do spread (>2 ou <-2 = oportunidade)
   - **DV01**: Sensibilidade a 1bp de mudança
   - **Hedge Ratio**: Proporção ideal de contratos

3. **Aguarde a coleta real**
   - Primeira coleta: Hoje às 21:00 BRT
   - Dados reais da B3 substituem simulados

---

**Dúvidas?** Ver documentação completa em `SETUP_INSTRUCTIONS.md`
