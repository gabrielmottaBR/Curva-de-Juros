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

## ⚠️ Limitações Importantes

### 1. Dados Estáticos no Vercel

O site no Vercel mostra **apenas os dados que já estão no Supabase**. Ele NÃO coleta novos dados automaticamente.

**O que acontece:**
- ✅ Frontend deployado no Vercel funciona perfeitamente
- ✅ API lê dados do Supabase e exibe no dashboard
- ❌ Coleta automática diária (21:00 BRT) **NÃO roda** no Vercel
- ❌ Dados param de ser atualizados após o deploy

### 2. Opções para Manter Dados Atualizados

**Opção A: Manter Replit Rodando (Recomendado)**
- Deixe o backend Replit rodando 24/7 (use Replit Always On)
- Ele continuará coletando dados diariamente às 21:00
- O Vercel lerá os dados atualizados do Supabase

**Opção B: Vercel Cron Jobs (Plano Pro)**
- Requer plano Vercel Pro ($20/mês)
- Adicionar função serverless para coletar dados
- Configurar cron job no Vercel para rodar diariamente

**Opção C: Atualização Manual**
- Rode o backfill manualmente quando precisar de dados novos
- Execute: `tsx server/scripts/enhancedBackfill.ts` no Replit

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
