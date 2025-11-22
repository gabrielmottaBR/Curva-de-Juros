# 🤖 Automated Data Collection - Setup Guide

Este guia explica como configurar a coleta automática diária de dados B3 usando GitHub Actions.

## 📋 Visão Geral

**Sistema:** Coleta automática de dados DI1 via PDF BDI_05 da B3  
**Frequência:** Diária às 0:00 UTC (21:00 BRT, dia anterior)  
**Fonte:** https://arquivos.b3.com.br/bdi/download/bdi/YYYY-MM-DD/BDI_05_YYYYMMDD.pdf  
**Endpoint:** `POST /api/collect-real`  
**Contratos:** Rolling window de 9 contratos (ano+2 até ano+10)  

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
    # Runs at 0:00 UTC (21:00 BRT previous day) every day
    - cron: '0 0 * * *'
  
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
            "https://curvadejuros.vercel.app/api/collect-real")
          
          HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
          BODY=$(echo "$RESPONSE" | sed '$d')
          
          echo "HTTP Status: $HTTP_CODE"
          echo "Response: $BODY"
          
          if [ "$HTTP_CODE" -eq 200 ]; then
            echo "✅ Collection successful!"
            exit 0
          else
            echo "❌ Collection failed!"
            exit 1
          fi
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
   WHERE source_type = 'bdi_pdf' 
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
curl https://curvadejuros.vercel.app/api/opportunities | jq '.opportunities[0].date'
```

---

## 🛠️ Troubleshooting

### Problema: Workflow não executa automaticamente

**Solução:**
- Verifique se o cron está correto: `0 0 * * *` (diário 0:00 UTC)
- GitHub Actions requer pelo menos 1 commit no branch principal nos últimos 60 dias
- Faça um commit dummy se necessário

### Problema: HTTP 404 (PDF não encontrado)

**Causa:** B3 não publicou PDF para o dia (feriado, final de semana, problema técnico)

**Solução Automática:**
- O endpoint tenta automaticamente o dia útil anterior
- Se ambos falharem, retorna erro 404

**Ação Manual:**
```bash
# Tentar dia específico
curl -X POST "https://curvadejuros.vercel.app/api/collect-real?date=2025-11-19"
```

### Problema: HTTP 400 (Validação falhou)

**Causa:** Menos de 7 contratos encontrados no PDF

**Solução:**
- Verificar PDF manualmente: https://arquivos.b3.com.br/bdi/download/bdi/2025-11-19/BDI_05_20251119.pdf
- Se PDF está correto, o parser pode precisar de ajuste
- Reportar issue com o PDF problemático

### Problema: HTTP 500 (Erro interno)

**Causa:** Erro no servidor (Supabase, parsing, etc.)

**Solução:**
1. Verificar logs do Vercel: https://vercel.com/dashboard
2. Verificar Supabase está online
3. Testar endpoint manualmente

---

## 📊 Validação de Dados

Após cada coleta automática, valide os dados:

```bash
# Executar script de validação
node scripts/validate-real-data.cjs
```

**Output esperado:**
```
✅ Validation passed: All data is from bdi_pdf source
```

**Exit code:** 0 = sucesso, 1 = falha

---

## 🔄 Recalcular Oportunidades

Após coleta automática, as oportunidades devem ser recalculadas:

```bash
# Trigger recalculation
curl -X POST https://curvadejuros.vercel.app/api/refresh
```

**Opcional:** Adicionar step ao workflow YAML:

```yaml
- name: 🔄 Recalculate Opportunities
  run: |
    curl -s -X POST "https://curvadejuros.vercel.app/api/refresh"
```

---

## 📅 Horários

| Timezone | Horário | Descrição |
|----------|---------|-----------|
| UTC      | 0:00    | GitHub Actions executa |
| BRT      | 21:00 (dia anterior) | Horário no Brasil |
| B3       | Após 18:00 | PDF BDI_05 disponível |

**Exemplo:**
- **GitHub Actions:** 22/11/2025 às 0:00 UTC
- **Brasil:** 21/11/2025 às 21:00 BRT
- **Coleta:** Dados do pregão de 21/11/2025

---

## 🎯 Benefícios da Automação

✅ **Sem intervenção manual:** Coleta diária automática  
✅ **Dados reais:** 100% B3 BDI PDF oficial  
✅ **Rolling window:** Contratos sempre atualizados por ano  
✅ **Auditável:** Metadata completa de cada import  
✅ **Resiliente:** Retry automático + fallback para dia anterior  
✅ **Validação:** Mínimo 7/9 contratos obrigatório  

---

## 📚 Arquivos Relacionados

- **Endpoint:** `api/collect-real.js`
- **Parser:** `api/parsers/bdi-parser.js`
- **Contract Manager:** `api/utils/contract-manager.js`
- **Calendar:** `api/utils/b3-calendar.js`
- **Downloader:** `api/utils/pdf-downloader.js`
- **Test Script:** `scripts/test-collect-real.js`
- **Validation:** `scripts/validate-real-data.cjs`

---

## 💡 Comandos Úteis

```bash
# Testar localmente
node scripts/test-collect-real.js 2025-11-19

# Validar dados
node scripts/validate-real-data.cjs

# Trigger manual (produção)
curl -X POST "https://curvadejuros.vercel.app/api/collect-real"

# Verificar último import
curl "https://curvadejuros.vercel.app/api/opportunities" | jq '.opportunities[0]'
```

---

## 🚨 Importante

1. **Não commitar `.github/workflows/`** - Sempre no `.gitignore`
2. **Configurar via GitHub web interface** - Única forma segura
3. **Validar após deploy** - Executar manualmente 1x para testar
4. **Monitorar primeiros dias** - Verificar logs no GitHub Actions

---

**✅ Setup completo!** O sistema agora coleta dados B3 automaticamente todos os dias.
