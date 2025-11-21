# Deploy Completo na Vercel (Frontend + Backend)

## 🎯 Arquitetura

```
┌──────────────────────────────────┐         ┌──────────┐
│         Vercel                   │ ─────→  │ Supabase │
│  ┌────────────┬────────────────┐ │   SQL   │  (Dados) │
│  │  Frontend  │    Backend     │ │ queries │          │
│  │  (Static)  │  (Serverless)  │ │         │          │
│  └────────────┴────────────────┘ │         │          │
└──────────────────────────────────┘         └──────────┘
    HTTPS CDN + Functions              Dados persistentes
```

**Benefícios:**
- ✅ Tudo em um único projeto
- ✅ Deploy automático via GitHub
- ✅ CDN global para frontend
- ✅ Backend serverless escalável
- ✅ HTTPS grátis

**Funcionalidades:**
- ✅ Coleta de dados via `/api/collect`
- ✅ Análise automática de oportunidades
- ⚠️ **Cron jobs automáticos (21:00 diário) requerem Vercel Pro ($20/mês)**
- ✅ No plano gratuito, coleta manual via endpoint `/api/collect`

---

## 📋 Passo a Passo

### 1️⃣ Configurar Secrets no Supabase

Você precisa das credenciais do Supabase:

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings → API**
4. Copie:
   - `Project URL` (SUPABASE_URL)
   - `service_role secret` (SUPABASE_SERVICE_KEY) ⚠️ **Não use anon key!**

### 2️⃣ Fazer Commit e Push para GitHub

```bash
# Adicionar todas as alterações
git add .

# Commit
git commit -m "feat: Deploy completo na Vercel (frontend + backend)"

# Push para GitHub
git push origin main
```

### 3️⃣ Conectar com Vercel

1. Acesse: https://vercel.com
2. Clique em **Add New → Project**
3. Selecione o repositório do GitHub
4. **Configure Environment Variables:**
   - `SUPABASE_URL` = sua URL do Supabase
   - `SUPABASE_SERVICE_KEY` = service role key do Supabase
5. Clique em **Deploy**

### 4️⃣ Aguardar Build

Vercel vai:
1. ✅ Instalar dependências (npm install)
2. ✅ Buildar frontend (npm run build → dist/)
3. ✅ Criar serverless function do backend (api/index.js)
4. ✅ Publicar tudo com HTTPS

---

## ✅ Teste e Verificação

### 1. Teste do Backend

Após o deploy, teste os endpoints:

```bash
# Health check
curl https://SEU-DOMINIO.vercel.app/api/health

# Oportunidades
curl https://SEU-DOMINIO.vercel.app/api/opportunities

# Deve retornar JSON com "count": 43 (ou número atual)
```

### 2. Teste do Frontend

Acesse: https://SEU-DOMINIO.vercel.app

**Esperado:**
- ✅ Dashboard carrega
- ✅ Mostra "43 combinations analyzed" (ou número atual)
- ✅ Lista de oportunidades visível
- ✅ Gráficos funcionando

### 3. DevTools Check

1. Abra DevTools (F12)
2. Vá na aba **Network**
3. Recarregue a página
4. Procure a chamada `opportunities`
5. **Verifique a URL:**
   - ✅ Deve ser: `https://SEU-DOMINIO.vercel.app/api/opportunities`

---

## 🔧 Manutenção

### Atualizar Dados Manualmente (Plano Gratuito)

Como o plano gratuito não suporta cron jobs, você pode executar coleta manual:

**Opção 1: Via Endpoint (Recomendado)**
```bash
# Chamar o endpoint de coleta
curl -X POST https://SEU-DOMINIO.vercel.app/api/collect

# Ou através do navegador
# https://SEU-DOMINIO.vercel.app/api/collect
```

**Opção 2: Automatizar com Serviço Externo Grátis**
- **EasyCron** (https://www.easycron.com) - Plano gratuito permite 1 cron job
- **cron-job.org** - Grátis, configure para chamar `/api/collect` diariamente
- **IFTTT** ou **Zapier** - Automatize chamada diária

**Opção 3: Via Replit (se mantiver projeto)**
```bash
# No terminal do Replit, execute:
tsx server/scripts/enhancedBackfill.ts
```

### Cron Jobs Automáticos (Vercel Pro - $20/mês)

**Já está configurado!** Se você atualizar para Vercel Pro:

1. ✅ O arquivo `vercel.json` já tem a configuração de cron:
   ```json
   "crons": [{ "path": "/api/collect", "schedule": "0 0 * * *" }]
   ```

2. ✅ O endpoint `/api/collect` já está implementado

3. **Ajustar horário para 21:00 BRT:**
   ```json
   "schedule": "0 0 * * *"  // UTC (00:00 = 21:00 BRT)
   ```

Ao fazer upgrade para Pro, o cron job começará automaticamente!

---

## 🐛 Troubleshooting

### Erro: "Failed to fetch" ou "0 combinations analyzed"

**Causa:** Backend não consegue acessar Supabase.

**Solução:**

1. **Verificar Environment Variables no Vercel:**
   - Settings → Environment Variables
   - Verifique se `SUPABASE_URL` e `SUPABASE_SERVICE_KEY` estão configuradas
   - **Atenção:** Use `service_role` key, NÃO a `anon` key

2. **Verificar Logs da Function:**
   - Vercel Dashboard → seu projeto → Functions
   - Clique em `/api/index.js`
   - Veja os logs de erro

3. **Testar manualmente:**
   ```bash
   curl https://SEU-DOMINIO.vercel.app/api/health
   ```
   - Se retornar `{"status":"healthy"}` = backend OK
   - Se erro 500 = problema com Supabase

### Erro: "Module not found"

**Causa:** Dependências faltando.

**Solução:**
```bash
# Reinstalar e fazer commit
npm install
git add package.json package-lock.json
git commit -m "fix: Update dependencies"
git push origin main
```

Vercel vai fazer redeploy automaticamente.

### Erro: "Build failed"

**Causa:** Erro no build do frontend ou transpilação do backend.

**Solução:**
1. Verifique os logs do build no Vercel
2. Teste localmente:
   ```bash
   npm run build
   ```
3. Corrija erros e faça push

---

## 📊 Comparação de Planos

| Recurso | Vercel Hobby (Grátis) | Vercel Pro ($20/mês) |
|---------|------------------------|----------------------|
| Deploy frontend + backend | ✅ | ✅ |
| HTTPS + CDN | ✅ | ✅ |
| Supabase integration | ✅ | ✅ |
| **Cron jobs automáticos** | ❌ | ✅ |
| Coleta manual de dados | ✅ | ✅ |

**Recomendação:**
- Para testes e desenvolvimento: **Hobby** (grátis) + coleta manual
- Para produção com automação: **Pro** ($20/mês)

---

## 🔄 Atualizações Futuras

Sempre que fizer alterações no código:

```bash
git add .
git commit -m "Sua mensagem"
git push origin main
```

Vercel detecta automaticamente e faz redeploy!

---

## ✅ Checklist Final

Antes de considerar o deploy concluído:

- [ ] Backend responde em `/api/health`
- [ ] Frontend carrega em `https://SEU-DOMINIO.vercel.app`
- [ ] DevTools mostra chamadas para `/api/opportunities`
- [ ] Dashboard mostra "X combinations analyzed" (não zero)
- [ ] Gráficos carregam corretamente
- [ ] Environment variables configuradas no Vercel
- [ ] Decidiu estratégia de coleta de dados (manual ou Pro plan)

---

## 🆘 Precisa de Ajuda?

Se encontrar problemas:
1. Verifique os logs no Vercel Dashboard
2. Teste os endpoints manualmente com `curl`
3. Verifique se as credenciais Supabase estão corretas
4. Confirme que o banco de dados tem dados (não está vazio)
