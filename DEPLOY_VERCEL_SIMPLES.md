# 🚀 Deploy Simples no Vercel - Apenas Frontend

## 💡 Arquitetura Híbrida (Melhor Solução)

```
┌──────────────┐         ┌───────────────┐         ┌──────────┐
│   Vercel     │ ─────→  │  Replit       │ ─────→  │ Supabase │
│  (Frontend)  │  API    │  (Backend +   │   SQL   │  (Dados) │
│   Estático   │  calls  │   Cron Job)   │  queries│          │
└──────────────┘         └───────────────┘         └──────────┘
```

**Vantagens:**
- ✅ **Frontend super rápido** na Vercel CDN global
- ✅ **Backend completo** rodando 24/7 no Replit
- ✅ **Cron job funciona** normalmente às 21:00
- ✅ **Dados atualizados** automaticamente
- ✅ **Grátis** (ou ~$2/mês com Replit Always On)

---

## 📋 Passo a Passo

### 1️⃣ Obter URL Pública do Backend Replit

1. No Replit, vá no workflow **"Backend Server"**
2. Verifique se o backend está rodando e copie a URL pública do console:
   ```
   ✓ Public URL: https://786b2f0f-61c2-4319-a08d-97ec680ff3a0-00-3000zp3507194dsz.riker.replit.dev
   ```
3. **Teste a URL** antes de configurar no Vercel:
   ```bash
   curl https://SUA-URL.replit.dev/api/health
   ```
   Deve retornar: `{"status":"healthy",...}`

⚠️ **IMPORTANTE sobre a URL do Replit:**
- A URL pode mudar se você reiniciar o Replit ou recriar o projeto
- **Recomendação:** Use **Replit Always On** (~$2/mês) para manter URL estável
- Se a URL mudar, você precisará atualizar `VITE_API_URL` no Vercel (passo 3)

### 2️⃣ Fazer Commit e Push para GitHub

```bash
git add .
git commit -m "feat: Configurar frontend para apontar para backend Replit"
git push origin main
```

### 3️⃣ Configurar Variável de Ambiente no Vercel

1. Acesse: https://vercel.com/seu-usuario/curvadejuros
2. Vá em **Settings** → **Environment Variables**
3. Adicione:

| Nome | Valor | Ambientes |
|------|-------|-----------|
| `VITE_API_URL` | URL do backend Replit (passo 1️⃣) | Production, Preview, Development |

**Exemplo:**
```
VITE_API_URL=https://786b2f0f-61c2-4319-a08d-97ec680ff3a0-00-3000zp3507194dsz.riker.replit.dev
```

⚠️ **IMPORTANTE:** Não adicione barra `/` no final da URL!

### 4️⃣ Atualizar Código do Frontend

Edite `services/api.ts`:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'; // fallback para dev local
```

### 5️⃣ Fazer Novo Commit

```bash
git add services/api.ts
git commit -m "feat: Usar variável de ambiente para URL da API"
git push origin main
```

### 6️⃣ Fazer Redeploy no Vercel

O Vercel vai fazer redeploy automaticamente ao detectar o novo commit.

Ou manualmente:
1. Vá em **Deployments**
2. Clique em **Redeploy** no último deployment

---

## ✅ Teste e Verificação do Deploy

### 1. Teste o Backend Replit (PRIMEIRO)

Antes de testar o Vercel, verifique se o backend está funcionando:

```bash
# Health check
curl https://SUA-URL.replit.dev/api/health

# Oportunidades
curl https://SUA-URL.replit.dev/api/opportunities

# Deve retornar JSON com "count": 43 (ou número atual)
```

**Se não funcionar:**
- Verifique se o backend Replit está rodando
- Verifique se as credenciais Supabase estão configuradas no Replit
- Reinicie o workflow "Backend Server"

### 2. Teste o Frontend Vercel

Acesse: https://curvadejuros.vercel.app

**Esperado:**
- ✅ Dashboard carrega
- ✅ Mostra "43 combinations analyzed" (ou número atual)
- ✅ Lista de oportunidades visível
- ✅ Gráficos funcionando

### 3. DevTools Check (Verificação Crítica)

1. Abra DevTools (F12)
2. Vá na aba **Network**
3. Recarregue a página
4. Procure a chamada `opportunities`
5. **Verifique a URL chamada:**
   - ✅ **Deve ser:** `https://786b2f0f...replit.dev/api/opportunities`
   - ❌ **NÃO deve ser:** `https://curvadejuros.vercel.app/api/opportunities`
   
6. Se estiver chamando Vercel.app/api, significa que `VITE_API_URL` não está configurada!

### 4. Verificação de Saúde Completa

Execute esses checks após cada deploy:

```bash
# 1. Backend Health
curl https://SUA-URL-REPLIT.replit.dev/api/health
# Esperado: {"status":"healthy"}

# 2. Supabase Connection (via backend)
curl https://SUA-URL-REPLIT.replit.dev/api/opportunities | head -c 200
# Esperado: {"opportunities":[...], "count":43...}

# 3. Frontend Loading
curl -I https://curvadejuros.vercel.app
# Esperado: HTTP/2 200
```

---

## 🔧 Manutenção

### Manter Backend Rodando

**Opção 1: Replit Always On (~$2/mês) - RECOMENDADO**
- ✅ Garante backend 24/7
- ✅ Cron job roda automaticamente
- ✅ **URL do Replit permanece estável**
- ✅ Não precisa atualizar VITE_API_URL constantemente

**Opção 2: Abrir Replit 1x por dia (Grátis)**
- ⚠️ Backend pode dormir se inativo
- ⚠️ **URL pode mudar** ao reiniciar
- ⚠️ Se URL mudar, precisa atualizar Vercel
- Abra o Replit pelo menos 1x por dia
- Verifique se o backend está rodando

**Como saber se a URL mudou:**
1. Abra o Replit
2. Veja a URL nos logs do Backend Server
3. Compare com a URL configurada no Vercel (`VITE_API_URL`)
4. Se diferente, atualize no Vercel e faça Redeploy

### Atualizar Dados Manualmente

Se precisar forçar atualização:

```bash
# No Replit
tsx server/scripts/enhancedBackfill.ts
```

---

## 🐛 Troubleshooting

### Erro: "Failed to fetch" ou "0 combinations analyzed"

**Causa:** Frontend não consegue chamar backend.

**Solução passo a passo:**

1. **Verificar Backend Replit:**
   ```bash
   curl https://SUA-URL.replit.dev/api/health
   ```
   - Se retornar erro 404/timeout: Backend offline, reinicie o Replit
   - Se funcionar: Backend OK, problema é no Vercel

2. **Verificar VITE_API_URL no Vercel:**
   - Settings → Environment Variables
   - Verifique se `VITE_API_URL` está configurada
   - Verifique se o valor corresponde à URL atual do Replit
   - **Se mudou:** Atualize e faça Redeploy

3. **Verificar DevTools:**
   - F12 → Network → Recarregue a página
   - Veja qual URL o frontend está chamando
   - Se chamar `/api` (sem domínio Replit) = VITE_API_URL não está funcionando

4. **URL do Replit mudou?**
   - Abra o Replit → Backend Server logs
   - Copie a nova URL pública
   - Atualize `VITE_API_URL` no Vercel
   - Faça Redeploy

### Erro: "CORS"

**Causa:** Backend não permite chamadas do Vercel.

**Solução:**
O backend já está configurado com `cors({ origin: '*' })`, deve funcionar.

### Erro: "0 combinations analyzed"

**Causa:** Banco de dados vazio ou backend offline.

**Solução:**
1. Verifique se backend está rodando
2. Verifique se Supabase tem dados
3. Rode backfill no Replit se necessário

---

## 📊 Custos

| Serviço | Custo |
|---------|-------|
| **Vercel** (Frontend) | Grátis |
| **Supabase** (Dados) | Grátis (até 500 MB) |
| **Replit** (Backend) | Grátis (com abertura manual) OU $2/mês (Always On) |

**Total:** $0/mês (manual) ou $2/mês (automático)

---

## 🎯 Resumo

1. ✅ **Backend fica no Replit** - Roda 24/7, faz cron job diário
2. ✅ **Frontend vai para Vercel** - Rápido, CDN global, HTTPS grátis
3. ✅ **Frontend chama backend Replit** via VITE_API_URL
4. ✅ **Todos usam mesmo Supabase** - Dados compartilhados

**Essa é a arquitetura mais simples e eficaz!** 🚀
