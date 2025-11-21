# 🌐 B3 Data Sources - Real Data Alternatives

## 📋 Problema Identificado

O HTML scraping da página interativa da B3 **não funciona** porque:
- A página `SistemaPregao1.asp` é apenas um formulário de seleção (não serve dados estáticos)
- Os dados DI1 são carregados via JavaScript após a página carregar
- Não há tabelas HTML com contratos DI1 no source da página

**Conclusão:** HTML scraping não é uma solução viável para B3.

---

## ✅ Alternativas Viáveis (Dados Reais)

### **1. B3 BDI - Boletim Diário (Recomendado)**

**Descrição:** Arquivos CSV/PDF oficiais publicados diariamente pela B3

**URL Base:**
```
https://arquivos.b3.com.br/bdi/download/bdi/YYYY-MM-DD/BDI_02_YYYYMMDD.pdf
```

**Portal CSV (últimos 10 dias):**
- https://arquivos.b3.com.br/bdi/tabelas?lang=pt-BR

**Conteúdo:**
- ✅ Preços de ajuste DI1
- ✅ Taxas implícitas por vencimento
- ✅ Volume negociado
- ✅ Posições em aberto

**Vantagens:**
- Gratuito e público
- Oficial da B3
- Disponível após fechamento (18:00 BRT)
- Formato CSV estruturado (via portal novo)

**Desvantagens:**
- Precisa parsear PDF (BDI_02) ou acessar portal CSV
- Dados só disponíveis dia seguinte

---

### **2. rb3 R Package (Mais Completo)**

**Descrição:** Pacote R open-source que automatiza download de dados B3

**GitHub:** https://github.com/ropensci/rb3  
**Documentação:** https://docs.ropensci.org/rb3/

**Código Exemplo:**
```r
library(rb3)
library(dplyr)

# Baixar dados DI1 do último dia útil
fetch_marketdata("b3-futures-settlement-prices", 
                 refdate = Sys.Date())

# Filtrar contratos DI1
di1_data <- futures_get() |>
  filter(commodity == "DI1") |>
  select(refdate, maturity_code, price) |>
  collect()

# Exportar para CSV
write.csv(di1_data, "di1_settlements.csv", row.names = FALSE)
```

**Vantagens:**
- ✅ Automatizado (acessa arquivos públicos B3)
- ✅ Dados históricos desde 2000
- ✅ Calcula taxas implícitas automaticamente
- ✅ Open-source e bem mantido
- ✅ Formato tidy (CSV/dataframe)

**Desvantagens:**
- Requer ambiente R (não Node.js nativo)
- Precisa integrar R com Node.js (child_process ou API)

---

### **3. B3 UP2DATA Service**

**Descrição:** Serviço oficial B3 para download de dados de mercado

**URL:** https://www.b3.com.br/en_us/market-data-and-indices/data-services/up2data/

**Conteúdo:**
- Curvas de juros (inclui DI1)
- CSV padronizado
- Atualização diária

**Vantagens:**
- Oficial e confiável
- CSV estruturado
- Gratuito para dados regulatórios

**Desvantagens:**
- Requer cadastro/contato: [email protected]
- Possível aprovação manual
- Documentação limitada

---

### **4. Third-Party APIs (Pagos)**

| Provider | Pricing | Coverage | Format |
|----------|---------|----------|--------|
| **Alpha Vantage** | Free tier disponível | Limitado | JSON |
| **Refinitiv (LSEG)** | Pago (enterprise) | Completo + real-time | API |
| **EODHD** | $19.99/mês | Histórico + EOD | JSON/CSV |

---

## 🎯 Recomendação para Este Projeto

### **Curto Prazo (Agora):**
**Manter dados simulados** porque:
- ✅ Sistema 100% operacional
- ✅ 36 oportunidades sendo rastreadas
- ✅ Dados realistas e calibrados
- ✅ Zero dependências externas
- ✅ Zero custo

**Benefícios:**
- Desenvolvimento/testes não dependem de dados reais
- Sistema resiliente (sem pontos de falha externos)
- Usuário pode validar lógica antes de integrar B3

---

### **Médio Prazo (Próxima Sprint):**

**Implementar integração com BDI CSV da B3:**

**Arquitetura Proposta:**
```
GitHub Actions (0:00 UTC daily)
   ↓
1. Download BDI CSV: https://arquivos.b3.com.br/bdi/tabelas
   ↓
2. Parse CSV → Extrair DI1F27-DI1F35
   ↓
3. Validação: >= 7/9 contratos?
   ├─ SIM → Insert B3 data
   └─ NÃO → Fallback simulated
   ↓
4. POST /api/refresh → Recalculate opportunities
```

**Vantagens:**
- Dados reais oficiais da B3
- CSV fácil de parsear (vs PDF)
- Fallback automático se indisponível
- Sem necessidade de R ou APIs pagas

**Implementação Estimada:** 2-3 horas

---

### **Longo Prazo (Produção Avançada):**

**Opção A: rb3 Integration (se R aceitável)**
```bash
# Node.js chama R script
const { spawn } = require('child_process');

const rScript = spawn('Rscript', ['fetch_di1.R']);
rScript.stdout.on('data', data => {
  const di1Data = JSON.parse(data);
  // Insert to database
});
```

**Opção B: UP2DATA API (se B3 aprovar acesso)**
- Cadastro no UP2DATA
- API keys ou SFTP access
- Download automatizado diário

**Opção C: Third-Party Vendor (se orçamento permitir)**
- Alpha Vantage (free tier limitado)
- EODHD ($20/mês)

---

## 📊 Comparação de Alternativas

| Alternativa | Custo | Complexidade | Confiabilidade | Latência |
|-------------|-------|--------------|----------------|----------|
| **Simulado (atual)** | $0 | ⭐ Baixa | ⭐⭐⭐ Alta | Instant |
| **BDI CSV** | $0 | ⭐⭐ Média | ⭐⭐⭐ Alta | ~1 dia |
| **rb3 Package** | $0 | ⭐⭐⭐ Alta | ⭐⭐ Média | ~1 dia |
| **UP2DATA** | $0* | ⭐⭐ Média | ⭐⭐⭐ Alta | ~1 dia |
| **APIs Pagas** | $$$  | ⭐ Baixa | ⭐⭐⭐ Alta | Real-time |

\* Gratuito para dados regulatórios, possível aprovação manual

---

## 🚀 Próximos Passos Recomendados

**Para usuário validar sistema:**
1. ✅ Manter simulado por enquanto
2. ✅ Testar lógica de arbitragem
3. ✅ Validar cálculos de risco

**Quando pronto para dados reais:**
1. **Fase 1:** Implementar BDI CSV parser (2-3 horas)
2. **Fase 2:** Testar por 1 semana (validar qualidade)
3. **Fase 3:** Comparar simulado vs real (ajustar se necessário)

---

## 💡 Conclusão

**HTML scraping não é viável para B3**, mas existem **4 alternativas sólidas** para dados reais:

| Melhor para... | Usar... |
|----------------|---------|
| **Desenvolvimento/testes** | Dados simulados (atual) |
| **Produção simples** | BDI CSV download |
| **Análise histórica** | rb3 R package |
| **Enterprise/real-time** | APIs pagas |

**Recomendação Final:** Manter simulado agora, implementar BDI CSV depois.

---

**Autor:** Replit Agent  
**Data:** 21/11/2025  
**Status:** Pesquisa concluída, alternativas documentadas
