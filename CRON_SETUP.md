# ⏰ Configuração do Cron Automático (GitHub Actions)

## 📋 Resumo

O sistema usa **GitHub Actions** (100% gratuito) para executar a coleta automática de dados diariamente às **0:00 UTC** (21:00 BRT no horário de verão, 20:00 BRT fora do horário de verão).

**Fluxo em 2 Etapas:**
1. **Coleta de Dados** (`/api/collect-data`) - Faz scraping do B3 e insere novos dados no Supabase (~15s)
2. **Recálculo de Oportunidades** (`/api/refresh`) - Analisa dados e identifica oportunidades (~5s)

## ✅ Já Está Configurado!

O arquivo `.github/workflows/daily-collect.yml` já está criado e pronto para funcionar automaticamente quando você fizer push para o GitHub.

## 🚀 Como Ativar

### **Passo 1: Fazer Push para o GitHub**

No Shell do Replit, rode:

```bash
git add .github/workflows/daily-collect.yml
git commit -m "feat: Add GitHub Actions cron for daily data collection"
git push
```

### **Passo 2: Verificar no GitHub**

1. Acesse seu repositório no GitHub
2. Vá em **Actions** (aba no topo)
3. Você verá o workflow **"Daily Data Collection"**

### **Passo 3: Testar Manualmente (Opcional)**

Para testar se está funcionando **antes** de esperar o cron diário:

1. No GitHub, vá em **Actions**
2. Selecione **"Daily Data Collection"** na lista da esquerda
3. Clique em **"Run workflow"** (botão azul à direita)
4. Clique em **"Run workflow"** novamente para confirmar
5. Aguarde ~30 segundos
6. Veja os logs clicando no job que aparecer

**✅ Resultado esperado:**
```
📊 Step 1: Collecting data from B3...
HTTP Status: 200
Response: {"success":true,"date":"2025-11-21","contractsCollected":9,"source":"b3"}
✅ Data collection successful!

🔄 Step 2: Recalculating opportunities...
HTTP Status: 200
Response: {"success":true,"count":43,"timestamp":"..."}
✅ Opportunities recalculated successfully!
```

## 📅 Horário de Execução

**Configurado:** 0:00 UTC todos os dias

**Equivalente no Brasil:**
- **Horário de verão (outubro a fevereiro):** 21:00 BRT (UTC-3)
- **Fora do horário de verão:** 20:00 BRT (UTC-4)

**Nota:** O B3 fecha às 18:00, então qualquer horário após 19:00 já terá os dados do dia disponíveis.

## 🔧 Como Funciona

**Pipeline Diário (2 Steps):**

1. **GitHub Actions** acorda às 0:00 UTC
2. **Step 1:** Chama `POST /api/collect-data`
   - Faz scraping dos 9 contratos DI1 do B3
   - Se B3 estiver offline, usa dados simulados realistas
   - Insere novos registros no Supabase (tabela `di1_prices`)
   - Completa em ~15 segundos
3. **Step 2:** Chama `POST /api/refresh`
   - Lê dados históricos do banco (últimos 100 dias)
   - Calcula spreads, z-scores e cointegração
   - Identifica 43 oportunidades de arbitragem
   - Atualiza tabela `opportunities_cache`
   - Completa em ~5 segundos
4. **Frontend** automaticamente mostra os novos dados

## 🆓 Custo

**100% GRATUITO!** 

GitHub Actions oferece **2.000 minutos grátis por mês** para repositórios públicos (ilimitado para públicos).

Este workflow usa ~30 segundos por execução = **15 minutos por mês** (muito abaixo do limite).

## 🛠️ Configurações Avançadas

### **Alterar o Horário**

Edite `.github/workflows/daily-collect.yml`:

```yaml
schedule:
  - cron: '0 0 * * *'  # 0:00 UTC
  # - cron: '0 21 * * *'  # 21:00 UTC (exemplo)
```

**Formato cron:** `minuto hora dia mês dia_da_semana`

Exemplos:
- `0 0 * * *` - Todo dia às 0:00 UTC
- `0 12 * * *` - Todo dia às 12:00 UTC (9:00 BRT)
- `0 0 * * 1-5` - Segunda a Sexta às 0:00 UTC (apenas dias úteis)

### **Desativar o Cron**

Se quiser desativar temporariamente:

1. No GitHub, vá em **Actions**
2. Selecione **"Daily Data Collection"**
3. Clique nos **3 pontinhos** (⋮) no canto superior direito
4. Clique em **"Disable workflow"**

Para reativar, clique em **"Enable workflow"**.

## 📊 Monitoramento

### **Ver Histórico de Execuções**

1. GitHub → **Actions**
2. Selecione **"Daily Data Collection"**
3. Veja lista de execuções passadas com status ✅ ou ❌

### **Receber Notificações de Falhas**

GitHub envia email automaticamente se o workflow falhar. Configure em:

1. GitHub → **Settings** (do repositório)
2. **Notifications** → **Actions**
3. Marque **"Send notifications for failed workflows"**

## ❓ Troubleshooting

### **Workflow não aparece no GitHub Actions**

- Certifique-se de ter feito `git push` do arquivo `.github/workflows/daily-collect.yml`
- Aguarde 1-2 minutos após o push

### **Workflow falha com erro 500**

- Verifique se a Vercel está online: `curl https://curvadejuros.vercel.app/api/health`
- Verifique logs da Vercel em https://vercel.com/dashboard

### **Workflow não executa no horário agendado**

- GitHub Actions pode ter delay de até 15 minutos no horário agendado (normal)
- Workflows em repositórios inativos podem ser desabilitados (fazer commit para reativar)

## 🔗 Links Úteis

- **GitHub Actions Docs:** https://docs.github.com/en/actions
- **Cron Syntax:** https://crontab.guru
- **Vercel API:** https://curvadejuros.vercel.app/api/health

## 📝 Notas

- **Free tier:** Ilimitado para repositórios públicos
- **Private repos:** 2.000 minutos/mês grátis
- **Logs:** Mantidos por 90 dias
- **Execução manual:** Sempre disponível via botão "Run workflow"
