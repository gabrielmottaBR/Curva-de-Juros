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
2. Copie a URL pública, algo como:
   ```
   https://786b2f0f-61c2-4319-a08d-97ec680ff3a0-00-3000...replit.dev
   ```
3. Guarde essa URL - vamos usar no passo 3

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

## ✅ Teste do Deploy

Após o deploy:

### Frontend
Acesse: https://curvadejuros.vercel.app

**Esperado:**
- ✅ Dashboard carrega
- ✅ Mostra "43 combinations analyzed" (ou número atual)
- ✅ Lista de oportunidades visível
- ✅ Gráficos funcionando

### DevTools Check
1. Abra DevTools (F12)
2. Vá na aba **Network**
3. Veja as chamadas para `/api/opportunities`
4. A URL deve apontar para `https://...replit.dev/api/opportunities`

---

## 🔧 Manutenção

### Manter Backend Rodando

**Opção 1: Replit Always On** (~$2/mês)
- Garante backend 24/7
- Cron job roda automaticamente

**Opção 2: Abrir Replit 1x por dia**
- Abra o Replit pelo menos 1x por dia
- Verifique se o backend está rodando

### Atualizar Dados Manualmente

Se precisar forçar atualização:

```bash
# No Replit
tsx server/scripts/enhancedBackfill.ts
```

---

## 🐛 Troubleshooting

### Erro: "Failed to fetch"

**Causa:** Frontend não consegue chamar backend.

**Solução:**
1. Verifique se `VITE_API_URL` está configurada no Vercel
2. Verifique se o backend Replit está rodando
3. Teste a URL manualmente: `https://sua-url.replit.dev/api/health`

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
