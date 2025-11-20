# 🚀 Deploy no Vercel - Guia Completo

## O Problema que Foi Resolvido

Antes, o Vercel deployava **apenas o frontend** (arquivos estáticos). O backend Express que roda localmente na porta 3000 não era deployado, então as chamadas `/api/opportunities` retornavam 404.

**Solução implementada:** Convertemos o backend para **Vercel Serverless Functions** - agora frontend e backend rodam juntos no Vercel!

---

## ✅ Arquivos Criados

1. **`vercel.json`** - Configuração do Vercel
2. **`api/opportunities.ts`** - Serverless function para listar oportunidades
3. **`api/pair/[pairId].ts`** - Serverless function para detalhes de um par
4. **`api/recalculate.ts`** - Endpoint de recálculo

---

## 📋 Passo a Passo para Deploy

### 1️⃣ Fazer Commit e Push para o GitHub

```bash
git add .
git commit -m "feat: Adicionar Vercel serverless functions"
git push origin main
```

### 2️⃣ Configurar Variáveis de Ambiente no Vercel

**IMPORTANTE:** O backend precisa das credenciais do Supabase para funcionar.

1. Acesse: https://vercel.com/seu-usuario/curvadejuros
2. Vá em **Settings** → **Environment Variables**
3. Adicione as seguintes variáveis:

| Nome | Valor |
|------|-------|
| `SUPABASE_URL` | Cole a URL do seu projeto Supabase |
| `SUPABASE_SERVICE_KEY` | Cole a Service Role Key do Supabase |

**Como encontrar essas credenciais:**
- Acesse: https://supabase.com/dashboard/project/SEU_PROJETO/settings/api
- **SUPABASE_URL**: Copie de "Project URL"
- **SUPABASE_SERVICE_KEY**: Copie de "service_role" (⚠️ NUNCA compartilhe esta chave)

### 3️⃣ Fazer Redeploy no Vercel

Após configurar as variáveis de ambiente:

1. Vá em **Deployments**
2. Clique em **Redeploy** no último deployment
3. Aguarde o build finalizar (~2 minutos)

### 4️⃣ Testar o Site

Acesse: https://curvadejuros.vercel.app

Você deve ver:
- ✅ "43 combinations analyzed" (ou o número atual de oportunidades)
- ✅ Lista de pares com spreads e z-scores
- ✅ Recomendações (BUY SPREAD / SELL SPREAD)

---

## 🔍 Como Funciona

### Desenvolvimento Local (Replit)
```
Frontend (port 5000) → Vite Proxy → Backend Express (port 3000) → Supabase
```

### Produção (Vercel)
```
Frontend (Vercel CDN) → /api/* → Serverless Functions → Supabase
```

As serverless functions substituem o backend Express em produção!

---

## ⚠️ Limitações do Vercel Serverless

1. **Cron Jobs não funcionam** - O agendamento diário (21:00 BRT) NÃO rodará no Vercel
2. **Dados não são atualizados automaticamente** - Você precisará manter o backend Replit rodando OU usar Vercel Cron Jobs

### Solução Recomendada: Vercel Cron Jobs

Adicione ao `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/cron/daily-collection",
    "schedule": "0 21 * * *"
  }]
}
```

E crie `api/cron/daily-collection.ts` para coletar dados diariamente.

---

## 🐛 Troubleshooting

### Erro: "0 combinations analyzed"

**Causa:** Variáveis de ambiente não configuradas ou banco de dados vazio.

**Solução:**
1. Verifique se `SUPABASE_URL` e `SUPABASE_SERVICE_KEY` estão configuradas no Vercel
2. Verifique se o banco Supabase tem dados na tabela `opportunities_cache`
3. Rode o backfill no Replit: `npm run tsx server/scripts/enhancedBackfill.ts`

### Erro: "Internal server error"

**Causa:** Erro nas serverless functions.

**Solução:**
1. Vá em **Deployments** → Clique no deployment → **Function Logs**
2. Veja o erro detalhado
3. Corrija o código e faça novo deploy

### Erro: "Method not allowed"

**Causa:** Tentando chamar a API com método HTTP errado.

**Solução:**
- `/api/opportunities` → GET
- `/api/pair/[pairId]` → GET
- `/api/recalculate` → POST

---

## 📊 Próximos Passos

1. ✅ **Configurar variáveis de ambiente no Vercel**
2. ✅ **Fazer redeploy**
3. ⚙️ **Opcional:** Adicionar Vercel Cron Job para coleta automática
4. ⚙️ **Opcional:** Migrar banco de dados para Vercel Postgres (se preferir tudo no Vercel)

---

## 💡 Alternativas

Se preferir manter o backend rodando separadamente:

1. **Replit Always On** - Mantém o backend Replit rodando 24/7
2. **Railway/Render** - Deploy do backend Express separado
3. **Vercel + Supabase Edge Functions** - Usar Supabase Edge Functions ao invés de Vercel Serverless

---

**Dúvidas?** Verifique os logs do Vercel em **Function Logs** para ver erros detalhados.
