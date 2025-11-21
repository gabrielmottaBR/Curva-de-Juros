# 🚀 Deploy Completo no Vercel - Frontend + Backend

## ✅ Configuração Pronta

Todos os arquivos necessários foram criados:
- ✅ **`api/index.ts`** - Backend Express como Vercel Serverless Function
- ✅ **`vercel.json`** - Configuração de rotas e builds
- ✅ **`package.json`** - Node.js 20.x configurado

---

## 📋 Passo a Passo para Deploy

### 1️⃣ Fazer Commit e Push para o GitHub

```bash
git add .
git commit -m "feat: Configurar Vercel deploy com frontend e backend"
git push origin main
```

### 2️⃣ Configurar Variáveis de Ambiente no Vercel

**CRÍTICO:** O backend precisa dessas variáveis para funcionar.

1. Acesse: https://vercel.com/seu-usuario/curvadejuros
2. Vá em **Settings** → **Environment Variables**
3. Adicione as seguintes variáveis para **todos os ambientes** (Production, Preview, Development):

| Nome da Variável | Valor | Obtenção |
|------------------|-------|----------|
| `SUPABASE_URL` | URL do seu projeto Supabase | https://supabase.com/dashboard/project/SEU_PROJETO/settings/api |
| `SUPABASE_SERVICE_KEY` | Service Role Key do Supabase | https://supabase.com/dashboard/project/SEU_PROJETO/settings/api (⚠️ NUNCA compartilhe) |
| `NODE_ENV` | `production` | Digite manualmente |

**⚠️ IMPORTANTE:**
- Marque as 3 caixas: Production, Preview, Development
- A Service Role Key deve começar com `eyJ...` (é um JWT token longo)

### 3️⃣ Configurar Projeto no Vercel (se for novo deploy)

Se você ainda não conectou o projeto:

1. Acesse: https://vercel.com/new
2. Importe o repositório do GitHub: `seu-usuario/curvadejuros`
3. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `.` (deixe em branco ou ponto)
   - **Build Command:** `npm run build` (Vercel detecta automaticamente)
   - **Output Directory:** `dist` (Vercel detecta automaticamente)
4. Adicione as variáveis de ambiente (passo 2️⃣)
5. Clique em **Deploy**

### 4️⃣ Redeploy (se já existe projeto)

Se o projeto já está no Vercel:

1. Vá em **Deployments**
2. Clique nos **3 pontinhos** do último deployment
3. Clique em **Redeploy**
4. Aguarde o build (~2-3 minutos)

---

## 🏗️ Como Funciona a Arquitetura

### Desenvolvimento Local (Replit)
```
┌─────────────────┐      Proxy      ┌──────────────────┐      ┌──────────┐
│  Frontend :5000 │ ──────/api────→ │  Backend  :3000  │ ────→│ Supabase │
│  (Vite)         │                 │  (Express)       │      │  (DB)    │
└─────────────────┘                 └──────────────────┘      └──────────┘
```

### Produção (Vercel)
```
┌─────────────────┐                 ┌──────────────────┐      ┌──────────┐
│  Frontend       │   /api/(.*) →   │  Serverless Fn   │ ────→│ Supabase │
│  (Static CDN)   │   rewrites      │  api/index.ts    │      │  (DB)    │
│                 │   /(.*) →       │                  │      └──────────┘
│                 │   index.html    │                  │
└─────────────────┘                 └──────────────────┘
```

**Explicação:**
1. **Frontend** buildado com `npm run build` → gera `/dist` → hospedado na Vercel CDN
2. **Backend** em `api/index.ts` → vira Serverless Function → roda on-demand
3. **Rewrites** no `vercel.json`:
   - `/api/*` → redireciona para `api/index.ts` (backend)
   - `/*` → serve `index.html` (frontend SPA)

---

## ⚠️ Limitações do Vercel (IMPORTANTE)

### ❌ O que NÃO funciona no Vercel

1. **Cron Jobs Automáticos**
   - O agendamento diário (21:00 BRT) **NÃO roda** no plano gratuito
   - Vercel Cron Jobs requer plano **Pro ($20/mês)**

2. **Coleta Automática de Dados**
   - O backend no Vercel **lê dados do Supabase**
   - Ele **NÃO coleta novos dados** da B3 automaticamente
   - Dados param de ser atualizados após o deploy

3. **Serverless Timeout**
   - Funções têm limite de **10 segundos** (plano gratuito)
   - Se precisar processar muito, pode dar timeout

### ✅ O que FUNCIONA no Vercel

1. **Dashboard Funcional** - Exibe as oportunidades perfeitamente
2. **API Rápida** - Lê do cache do Supabase
3. **CDN Global** - Site super rápido em qualquer lugar do mundo
4. **HTTPS Grátis** - SSL automático

---

## 🔄 Soluções para Manter Dados Atualizados

### Opção 1: Replit Backend Rodando 24/7 (Recomendado)

**Arquitetura Híbrida:**
```
Vercel (Frontend) + Replit (Backend + Cron) + Supabase (Dados Compartilhados)
```

**Como funciona:**
- ✅ Vercel hospeda o site público (rápido, CDN)
- ✅ Replit roda o backend Express 24/7
- ✅ Replit coleta dados diariamente às 21:00 e atualiza Supabase
- ✅ Vercel lê os dados atualizados do Supabase
- 💰 Grátis (ou Replit Always On ~$2/mês)

**Setup:**
1. Mantenha o backend Replit rodando
2. Vercel usa apenas os dados do Supabase
3. Não precisa mudar nada - já está funcionando assim!

### Opção 2: Vercel Cron Jobs (Plano Pro)

**Custo:** $20/mês
**Como:** Adicionar função de coleta agendada no Vercel

### Opção 3: Atualização Manual

**Grátis mas trabalhoso:**
- Rode manualmente quando precisar de dados novos
- Execute no Replit: `tsx server/scripts/enhancedBackfill.ts`

---

## ✅ Teste do Deploy

Após o deploy, teste:

### 1. Frontend
Acesse: https://curvadejuros.vercel.app

**Esperado:**
- ✅ Dashboard carrega
- ✅ Mostra "X combinations analyzed"
- ✅ Lista de oportunidades visível

### 2. Backend API
Teste os endpoints:

```bash
# Health check
curl https://curvadejuros.vercel.app/api/health

# Oportunidades
curl https://curvadejuros.vercel.app/api/opportunities

# Detalhes de um par (use um ID real)
curl https://curvadejuros.vercel.app/api/pair/DI1F28-DI1F33
```

**Esperado:**
- ✅ `/api/health` retorna `{"status":"healthy",...}`
- ✅ `/api/opportunities` retorna lista com count > 0
- ✅ `/api/pair/:id` retorna detalhes do par

---

## 🐛 Troubleshooting

### Erro: "0 combinations analyzed"

**Causa:** Variáveis de ambiente não configuradas OU banco de dados vazio.

**Soluções:**
1. Verifique variáveis no Vercel: Settings → Environment Variables
2. Verifique se Supabase tem dados: SELECT COUNT(*) FROM opportunities_cache;
3. Se vazio, rode backfill no Replit: `tsx server/scripts/enhancedBackfill.ts`
4. Após adicionar variáveis, faça **Redeploy** no Vercel

### Erro: "Internal server error" ou 500

**Causa:** Erro nas serverless functions.

**Como debugar:**
1. Vá em **Deployments** → Clique no deployment atual
2. Vá na aba **Functions**
3. Clique em `/api` → **View Function Logs**
4. Veja o erro detalhado (pode ser Supabase credential, query, etc.)

### Erro: "404 Not Found" na API

**Causa:** Rotas não configuradas corretamente.

**Solução:**
1. Verifique se `vercel.json` está no root do projeto
2. Verifique se `api/index.ts` existe
3. Faça redeploy

### Frontend carrega mas API não responde

**Causa:** CORS ou rotas.

**Solução:**
1. Verifique no DevTools → Network → veja a URL chamada
2. Deve ser `/api/opportunities` (relativa)
3. Vercel deve reescrever para `/api` serverless function

---

## 📊 Monitoramento

### Vercel Dashboard

Veja em tempo real:
- **Analytics:** Visitas, performance
- **Function Logs:** Erros nas API calls
- **Usage:** Quanto você está usando do plano gratuito

### Limites do Plano Gratuito

| Recurso | Limite |
|---------|--------|
| Bandwidth | 100 GB/mês |
| Serverless Invocations | 100,000/mês |
| Build Time | 6,000 minutos/mês |
| Function Duration | 10 segundos |

---

## 🎯 Resumo

1. ✅ **Fazer commit e push** para GitHub
2. ✅ **Configurar variáveis** SUPABASE_URL e SUPABASE_SERVICE_KEY no Vercel
3. ✅ **Fazer deploy** (ou redeploy)
4. ✅ **Testar** site e API
5. ⚙️ **Manter Replit rodando** para coleta automática diária

**Arquitetura final:**
- 🌐 **Vercel:** Hospeda frontend + API serverless
- 💾 **Supabase:** Armazena dados
- 🤖 **Replit:** Coleta dados diariamente (opcional, mas recomendado)

---

**Dúvidas?** Verifique os Function Logs no Vercel para erros detalhados.
