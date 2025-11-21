# 📊 Guia de Atualização de Dados (Manual)

## ✅ Sistema de Produção - Dados Reais B3

O sistema agora opera com **100% dados reais** da B3, importados manualmente quando necessário.

## 🔄 Como Atualizar os Dados

### **Opção 1: Importar CSV do rb3 (Recomendado)**

**Pré-requisito:** Ter CSV exportado pelo pacote R `rb3` (veja instruções abaixo)

```bash
# 1. Colocar CSV em attached_assets/
# Formato esperado: date,contract_code,rate
# Exemplo: 2025-06-24,DI1F27,13.4123

# 2. Atualizar caminho no script (se necessário)
# Editar scripts/import-real-data.cjs linha ~350

# 3. Executar import
node scripts/import-real-data.cjs

# 4. Validar dados
node scripts/validate-real-data.cjs
```

### **Opção 2: Exportar do R usando rb3**

Se você tem R instalado, pode coletar dados diretamente da B3:

```r
# Instalar pacote rb3
install.packages("rb3")

# Coletar dados DI1
library(rb3)
library(bizdays)

# Definir calendário B3
cal <- create.calendar("Brazil/ANBIMA", holidaysANBIMA, weekdays=c("saturday", "sunday"))
bizdays.options$set(default.calendar=cal)

# Coletar últimos 120 dias úteis
end_date <- Sys.Date()
start_date <- offset(end_date, -120, cal)

# Download de dados DI1
di1_data <- futures_get(
  first_date = start_date,
  last_date = end_date,
  by = 1
) %>%
  filter(commodity == "DI1") %>%
  select(refdate, symbol, price_adjusted) %>%
  rename(
    date = refdate,
    contract_code = symbol,
    rate = price_adjusted
  )

# Exportar CSV
write.csv(di1_data, "b3_di1_data.csv", row.names = FALSE)
```

### **Opção 3: Parser BDI CSV (Futuro)**

**Status:** Não implementado (estimativa: 2-3 horas)

O B3 publica dados diários em formato BDI no endereço:
`https://www2.bmf.com.br/pages/portal/bmfbovespa/lumis/lum-sistema-pregao-enUs.asp`

Implementação futura permitirá download e parsing automático.

## 🔍 Validação de Dados

Sempre execute após importar dados:

```bash
node scripts/validate-real-data.cjs
```

**Verifica:**
- ✅ Última importação usa fonte real (não simulada)
- ✅ Taxas dentro da faixa esperada (12-15%)
- ✅ 9 contratos DI1 presentes
- ✅ Sem endpoints simulados no código

**Exit codes:**
- `0`: Todos os testes passaram (production-safe)
- `1`: Falha detectada (ação necessária)

## 📊 Recalcular Oportunidades

Após importar novos dados, recalcule as oportunidades:

```bash
# Via API local (se servidor estiver rodando)
curl -X POST http://localhost:3000/api/refresh

# Via produção (Vercel)
curl -X POST https://curvadejuros.vercel.app/api/refresh
```

**Ou via navegador:**
https://curvadejuros.vercel.app/api/refresh

## 📅 Frequência de Atualização

**Recomendado:** Semanal ou quando houver mudanças significativas no mercado

**Por quê manual?**
- Dados históricos mudam lentamente
- Oportunidades de arbitragem são detectadas em janelas de 100 dias
- Atualizações diárias trazem pouco valor adicional
- Evita complexidade de automação

## 🚀 Futuro: Automação (Opcional)

Se quiser implementar coleta automática futura:

**Tecnologia:** GitHub Actions + Parser BDI CSV
**Esforço:** ~2-3 horas de desenvolvimento
**Benefício:** Dados sempre atualizados automaticamente

**Arquitetura proposta:**
```
GitHub Actions (cron diário)
   ↓
   1. Download BDI CSV do B3
   ↓
   2. Parse CSV → JSON
   ↓
   3. UPSERT to Supabase
   ↓
   4. POST /api/refresh
```

## 📝 Notas Importantes

- **Idempotência:** O script de import usa UPSERT - seguro executar múltiplas vezes
- **Auditoria:** Todas as importações são registradas na tabela `import_metadata`
- **Deduplicação:** Registros duplicados são tratados via média das taxas
- **Atomicidade:** Import é atômico - não há risco de banco vazio em falha

## ❓ Troubleshooting

### Erro: "relation 'import_metadata' does not exist"

Execute o SQL no Supabase:
```sql
-- Ver database/schema.sql para schema completo
CREATE TABLE import_metadata (...);
```

### Import não funciona

1. Verificar formato do CSV (date,contract_code,rate)
2. Verificar variáveis de ambiente (SUPABASE_URL, SUPABASE_SERVICE_KEY)
3. Ver logs de erro do script

### Validação falha

1. Verificar última importação: `SELECT * FROM import_metadata ORDER BY import_timestamp DESC LIMIT 1`
2. Verificar dados: `SELECT * FROM di1_prices ORDER BY date DESC LIMIT 10`
3. Se `source_type='simulated'`, reimportar dados reais

## 🔗 Links Úteis

- **rb3 Package:** https://cran.r-project.org/package=rb3
- **B3 Portal:** https://www2.bmf.com.br
- **Supabase Dashboard:** https://supabase.com/dashboard
- **Vercel Dashboard:** https://vercel.com/dashboard
