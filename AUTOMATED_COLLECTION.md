# 🤖 Automated Data Collection - Setup Guide

Este guia explica como configurar a coleta automática diária de dados B3 usando GitHub Actions.

## 📋 Visão Geral

**Sistema:** Coleta automática de dados DI1 via **API REST da B3** (tempo real)  
**Frequência:** Dias úteis (Seg-Sex) às 21:00 UTC (18:00 BRT) - fim do pregão  
**Fonte:** `https://cotacao.b3.com.br/mds/api/v1/DerivativeQuotation/DI1`  
**Endpoint:** `POST /api/collect-real`  
**Contratos:** Rolling window de 9 contratos (ano+2 até ano+10)  
**Convenção:** Apenas contratos DI1**F** (Janeiro) - ignora DI1J  

### ⚠️ Limitação Importante da API B3

A API REST da B3 retorna **APENAS dados em tempo real** durante o pregão. Ela **NÃO fornece dados históricos**. Por isso:

- **Coleta deve ser feita durante o pregão** (10:00-18:00 BRT) ou logo após
- **Dados históricos:** Use `scripts/import-real-data.cjs` com arquivos CSV do rb3
- **Forward-fill automático:** Contratos não negociados no dia repetem a cotação do dia anterior

### Exemplo de Rolling Window:
- **2025:** DI1F27 → DI1F35 (Jan/2027 até Jan/2035)
- **2026:** DI1F28 → DI1F36 (Jan/2028 até Jan/2036)
- **2027:** DI1F29 → DI1F37 (Jan/2029 até Jan/2037)

---

## 🚀 Setup do GitHub Actions (Manual)

**⚠️ IMPORTANTE:** O arquivo `.github/workflows/daily-collect.yml` está no `.gitignore` e **NÃO deve ser commitado** no repositório por causar erros de autorização. Você deve criar o workflow manualmente via interface web do GitHub.

### Passo 1: Acessar GitHub Actions

1. Acesse seu repositório no GitHub
2. Clique na aba **"Actions"** no topo
3. Clique em **"New workflow"**
4. Clique em **"set up a workflow yourself"**

### Passo 2: Criar Workflow File

Nome do arquivo: `.github/workflows/daily-collect.yml`

Cole o seguinte conteúdo:

```yaml
name: Daily B3 Data Collection

on:
  schedule:
    # Runs at 21:00 UTC (18:00 BRT) - final do pregão
    - cron: '0 21 * * 1-5'
  
  workflow_dispatch: # Permite execução manual

jobs:
  collect:
    runs-on: ubuntu-latest
    
    steps:
      - name: 📊 Collect B3 Data
        run: |
          echo "Starting B3 data collection..."
          
          RESPONSE=$(curl -s -w "\n%{http_code}" \
            -X POST \
            "https://multicurvas.vercel.app/api/collect-real")
          
          HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
          BODY=$(echo "$RESPONSE" | sed '$d')
          
          echo "HTTP Status: $HTTP_CODE"
          echo "Response: $BODY"
          
          if [ "$HTTP_CODE" -eq 200 ]; then
            echo "✅ Collection successful!"
          else
            echo "⚠️ Collection returned non-200, but continuing..."
          fi

      - name: 🔄 Recalculate Opportunities
        run: |
          echo "Triggering opportunity recalculation..."
          curl -s -X POST "https://multicurvas.vercel.app/api/refresh"
          echo "✅ Recalculation triggered!"
```

### Passo 3: Commit via Interface Web

1. Adicione uma mensagem de commit: `Add automated daily collection workflow`
2. Clique em **"Commit new file"**
3. GitHub Actions agora está configurado! ✅

---

## ✅ Verificação

### Verificar se está ativo:

1. Vá para **Actions** → **Daily B3 Data Collection**
2. Você deve ver o workflow listado
3. Status: ✅ (verde) se configurado corretamente

### Testar manualmente:

1. Vá para **Actions** → **Daily B3 Data Collection**
2. Clique em **"Run workflow"** → **"Run workflow"**
3. Aguarde ~30-60 segundos
4. Verifique os logs do job

---

## 🔍 Monitoramento

### Ver Logs de Execução:

1. **GitHub Actions:**
   - Vá para **Actions** → **Daily B3 Data Collection**
   - Clique na execução mais recente
   - Veja os logs completos

2. **Supabase (Import Metadata):**
   ```sql
   SELECT * FROM import_metadata 
   WHERE source_type = 'b3_api' 
   ORDER BY import_timestamp DESC 
   LIMIT 10;
   ```

3. **Supabase (Data Imported):**
   ```sql
   SELECT date, COUNT(*) as contracts 
   FROM di1_prices 
   GROUP BY date 
   ORDER BY date DESC 
   LIMIT 10;
   ```

### Verificar Última Coleta:

```bash
curl https://multicurvas.vercel.app/api/opportunities | jq '.count'
```

---

## 🛠️ Troubleshooting

### Problema: Workflow não executa automaticamente

**Solução:**
- Verifique se o cron está correto: `0 21 * * 1-5` (dias úteis às 21:00 UTC)
- GitHub Actions requer pelo menos 1 commit no branch principal nos últimos 60 dias
- Faça um commit dummy se necessário

### Problema: HTTP 400 (Parâmetro date não suportado)

**Causa:** Tentou passar `?date=YYYY-MM-DD` no endpoint

**Solução:**
- A API B3 só retorna dados em tempo real, não aceita parâmetro de data
- Para dados históricos, use: `node scripts/import-real-data.cjs`

### Problema: HTTP 400 (Validação falhou - menos de 7 contratos)

**Causa:** Poucos contratos encontrados na API B3

**Possíveis razões:**
1. Mercado fechado (feriado, fim de semana, fora do pregão)
2. Problema temporário na API B3
3. Nenhum contrato sendo negociado no momento

**Solução:**
- Execute durante o pregão (10:00-18:00 BRT)
- O sistema faz forward-fill automático para contratos faltantes
- Verifique se há dados anteriores no banco para forward-fill funcionar

### Problema: HTTP 500 (Erro interno)

**Causa:** Erro no servidor (Supabase offline, problema de rede, etc.)

**Solução:**
1. Verificar logs do Vercel: https://vercel.com/dashboard
2. Verificar Supabase está online
3. Testar endpoint manualmente

### Problema: Dados zerados ou incorretos

**Causa:** API B3 pode retornar dados parciais fora do horário de pregão

**Solução:**
- Agende coleta para horário de pregão (10:00-18:00 BRT)
- Workflow configurado para 21:00 UTC = 18:00 BRT (fim do pregão)

---

## 📊 Forward-Fill Automático

Quando um contrato não é negociado no dia, o sistema automaticamente:

1. Detecta contratos faltantes vs. esperados (rolling window)
2. Busca a cotação mais recente de cada contrato faltante no banco
3. Insere com a data atual e taxa anterior
4. Registra no log: `✓ DI1F33: 12.5400% (forward-fill de 2025-11-20)`

**Exemplo de log:**
```
🔄 Step 2.5: Forward-fill para contratos faltantes...
   Contratos não negociados hoje: DI1F33, DI1F34
   ✓ DI1F33: 12.5400% (forward-fill de 2025-11-20)
   ✓ DI1F34: 12.6100% (forward-fill de 2025-11-20)
   Forward-fill: 2 aplicados, 0 sem histórico
```

---

## 📊 Validação de Dados

Após cada coleta automática, valide os dados:

```bash
# Executar script de validação
node scripts/validate-real-data.cjs
```

**Output esperado:**
```
✅ Validation passed: All data is from valid sources (b3_api, bdi_pdf, rb3_csv)
```

**Exit code:** 0 = sucesso, 1 = falha

---

## 🔄 Recalcular Oportunidades

O workflow já inclui recálculo automático após coleta. Para trigger manual:

```bash
curl -X POST https://multicurvas.vercel.app/api/refresh
```

**Parâmetros de cálculo:**
- **Lookback:** 30 dias (otimizado para melhor Sharpe ratio)
- **Entry threshold:** |z| > 1.5
- **Exit threshold:** |z| < 0.5

---

## 📅 Horários

| Timezone | Horário | Descrição |
|----------|---------|-----------|
| UTC      | 21:00   | GitHub Actions executa |
| BRT      | 18:00   | Fim do pregão B3 |
| B3       | 10:00-18:00 | Horário de pregão |

**Exemplo:**
- **GitHub Actions:** 21/11/2025 às 21:00 UTC
- **Brasil:** 21/11/2025 às 18:00 BRT
- **Coleta:** Dados do pregão de 21/11/2025

---

## 🎯 Benefícios da Automação

✅ **Sem intervenção manual:** Coleta diária automática  
✅ **Dados reais:** 100% B3 API REST oficial  
✅ **Rolling window:** Contratos sempre atualizados por ano  
✅ **Forward-fill:** Contratos faltantes preenchidos automaticamente  
✅ **Resiliente:** Tratamento de erros + logging detalhado  
✅ **Validação:** Mínimo 7/9 contratos obrigatório  

---

## 📚 Arquivos Relacionados

- **Endpoint:** `api/collect-real.js`
- **API Client:** `api/utils/b3-api-client.js`
- **Contract Manager:** `api/utils/contract-manager.js`
- **Calendar:** `api/utils/b3-calendar.js`
- **Refresh:** `api/refresh.js`
- **Validation:** `scripts/validate-real-data.cjs`
- **Import Manual:** `scripts/import-real-data.cjs`

---

## 💡 Comandos Úteis

```bash
# Trigger coleta manual (produção)
curl -X POST "https://multicurvas.vercel.app/api/collect-real"

# Recalcular oportunidades
curl -X POST "https://multicurvas.vercel.app/api/refresh"

# Verificar oportunidades
curl "https://multicurvas.vercel.app/api/opportunities" | jq '.count'

# Validar dados
node scripts/validate-real-data.cjs

# Import histórico (via rb3 CSV)
node scripts/import-real-data.cjs
```

---

## 🚨 Importante

1. **Não commitar `.github/workflows/`** - Sempre no `.gitignore`
2. **Configurar via GitHub web interface** - Única forma segura
3. **Executar durante pregão** - API B3 só retorna dados em tempo real
4. **Monitorar primeiros dias** - Verificar logs no GitHub Actions
5. **Forward-fill requer histórico** - Primeiro import manual necessário

---

**✅ Setup completo!** O sistema agora coleta dados B3 automaticamente todos os dias úteis.
