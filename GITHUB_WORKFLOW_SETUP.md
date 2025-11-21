# 🚀 Deployment Final - Sistema de Coleta Automática B3

## ✅ **Sistema Pronto! Operacional por 5 Anos (2025-2030)**

Calendário completo de feriados B3 implementado. Nenhuma manutenção necessária até dezembro de 2030.

---

## 📋 **MÉTODO 1: Upload via GitHub Web (MAIS FÁCIL - 2 minutos)**

### **Passo 1: Criar a Pasta `.github/workflows`**

1. Acesse seu repositório no GitHub
2. Clique em **"Add file"** → **"Create new file"**
3. No campo de nome do arquivo, digite: `.github/workflows/daily-collect.yml`
   - ⚠️ **Importante:** Digite o caminho completo com as barras `/`
   - O GitHub vai criar as pastas automaticamente

### **Passo 2: Copiar o Conteúdo do Workflow**

Cole este conteúdo no editor do GitHub:

```yaml
name: Daily Data Collection

# Runs every day at 0:00 UTC (21:00 BRT during DST, 20:00 BRT otherwise)
on:
  schedule:
    - cron: '0 0 * * *'
  
  # Allow manual trigger from GitHub UI
  workflow_dispatch:

jobs:
  collect-data:
    runs-on: ubuntu-latest
    
    steps:
      - name: Trigger Vercel API data collection
        run: |
          echo "🚀 Triggering daily data collection..."
          
          response=$(curl -s -w "\n%{http_code}" -X POST \
            https://curvadejuros.vercel.app/api/recalculate)
          
          http_code=$(echo "$response" | tail -n1)
          body=$(echo "$response" | head -n-1)
          
          echo "📊 HTTP Status: $http_code"
          echo "📝 Response: $body"
          
          if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
            echo "✅ Data collection completed successfully!"
          else
            echo "❌ Data collection failed with status $http_code"
            exit 1
          fi
      
      - name: Log completion
        if: success()
        run: |
          echo "✅ Cron job completed at $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
      
      - name: Log failure
        if: failure()
        run: |
          echo "❌ Cron job failed at $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
```

### **Passo 3: Fazer Commit**

1. Role até o final da página
2. No campo "Commit message", digite: `feat: Add GitHub Actions cron for daily data collection`
3. Clique em **"Commit new file"**

### **Passo 4: Verificar**

1. Vá para a aba **"Actions"** no seu repositório
2. Você deve ver **"Daily Data Collection"** na lista de workflows

---

## 📋 **MÉTODO 2: Via Git com Token Pessoal (Avançado)**

Se preferir usar linha de comando com todas as permissões:

### **Passo 1: Criar Token Pessoal no GitHub**

1. GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. Clique em **"Generate new token (classic)"**
3. Marque os scopes:
   - ✅ `repo` (acesso completo aos repositórios)
   - ✅ `workflow` (criar/atualizar workflows)
4. Clique em **"Generate token"**
5. **Copie o token** (você só verá uma vez!)

### **Passo 2: Fazer Push com o Token**

No Shell do Replit:

```bash
# Remover origin atual
git remote remove origin

# Adicionar origin com token (substitua SEU_TOKEN e SEU_USUARIO/SEU_REPO)
git remote add origin https://SEU_TOKEN@github.com/SEU_USUARIO/SEU_REPO.git

# Fazer push
git push -u origin main
```

**⚠️ IMPORTANTE:** Não compartilhe seu token! Ele dá acesso total ao seu GitHub.

---

## ✅ **Após Adicionar o Workflow:**

### **Testar Imediatamente (Recomendado)**

1. GitHub → **Actions** → **"Daily Data Collection"**
2. Clique em **"Run workflow"** (botão azul)
3. Clique em **"Run workflow"** novamente para confirmar
4. Aguarde ~30 segundos
5. Veja os logs clicando no job

**✅ Resultado esperado:**
```
🚀 Triggering daily data collection...
📊 HTTP Status: 200
✅ Data collection completed successfully!
```

### **A Partir de Agora:**

- ✅ O workflow rodará **automaticamente** todo dia às 0:00 UTC (21:00 BRT)
- ✅ Você receberá **email** se houver falhas
- ✅ Pode executar **manualmente** a qualquer momento via botão "Run workflow"

---

## 📊 **Monitoramento:**

### **Ver Execuções Passadas:**
- GitHub → **Actions** → **"Daily Data Collection"**
- Lista com ✅ (sucesso) ou ❌ (falha)

### **Ver Logs Detalhados:**
- Clique em qualquer execução
- Veja os logs completos de cada step

---

## ❓ **Troubleshooting:**

### **"Workflow não aparece na aba Actions"**
- Aguarde 1-2 minutos após o commit
- Recarregue a página (F5)

### **"Não consigo criar o arquivo .github/workflows/..."**
- Certifique-se de digitar o caminho completo: `.github/workflows/daily-collect.yml`
- O GitHub cria as pastas automaticamente quando você usa `/`

### **"Workflow falha ao executar"**
- Verifique se a Vercel está online: `curl https://curvadejuros.vercel.app/api/health`
- Veja os logs detalhados clicando na execução falhada

---

## 🎯 **Resumo:**

1. ✅ Acesse GitHub → seu repositório
2. ✅ **Add file** → **Create new file**
3. ✅ Nome: `.github/workflows/daily-collect.yml`
4. ✅ Cole o conteúdo YAML acima
5. ✅ **Commit new file**
6. ✅ Vá em **Actions** → **Run workflow** para testar

**Pronto! Cron automático configurado!** 🎉
