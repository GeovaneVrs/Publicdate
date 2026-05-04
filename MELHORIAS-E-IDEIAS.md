# Melhorias, adições e ideias

Documento vivo com sugestões de evolução do projeto: mais dados, melhor pipeline, API e exemplos. Marque o que for fazendo ou descarte o que não fizer sentido.

---

## 1. Mais fontes de dados (exemplos)

Cada item pode virar: `fetchers/<nome>.py` → saída em `data/cache/` → rota `GET /...` na API.

### Economia e mercado (BCB / outros)

| Ideia | Onde buscar | Notas |
|-------|-------------|--------|
| Selic meta | [SGS — séries](https://www.bcb.gov.br/estatisticas/reporttx?slug=taxas-juros-e-indices) | Ex.: série 432 (muitas séries têm ID fixo). |
| Câmbio (USD) | SGS | Série de taxa de câmbio livre. |
| PIB trimestral | SIDRA / IBGE | Tabelas por agregados; validar período e variável. |
| Índices de confiança | BCB / FGV | Depende da série disponível em API aberta. |

### IBGE e território

| Ideia | Onde buscar | Notas |
|-------|-------------|--------|
| Municípios por UF | API de localidades v1 | `.../estados/{UF}/municipios`. |
| População por município | SIDRA / agregados | Volume maior; paginar ou filtrar por UF. |
| PIB municipal (último ano) | SIDRA | Tabela específica; checar metadados. |
| Mapas / malhas | IBGE geociências | Arquivos GeoJSON; pipeline pode baixar e resumir estatísticas. |

### Clima e meio ambiente

| Ideia | Onde buscar | Notas |
|-------|-------------|--------|
| Mais cidades | Open-Meteo + coordenadas | Expandir `CIDADES` ou usar geocoding (ex. Nominatim, respeitando uso). |
| Previsão 7 dias | Open-Meteo forecast | Mesma API, outros parâmetros. |
| Histórico diário | Open-Meteo archive | Limite de uso e período; bom para séries. |

### Sociedade e outras APIs públicas

| Ideia | Fonte | Notas |
|-------|--------|--------|
| Dados abertos gov.br | [dados.gov.br](https://dados.gov.br/) | CSV/JSON; escolher 1–2 conjuntos estáveis (saúde, educação, transporte). |
| PNAD / pesquisas | IBGE SIDRA | Tabelas grandes; começar por um indicador e um recorte (UF). |
| Legislação / transparência | APIs de órgãos | Depende do órgão; ler termos de uso. |

---

## 2. Melhorias no pipeline (Python)

- [x] **Schemas / validação:** `fetchers/schemas.py` com `dataclass` e funções (evita `pydantic-core` em Python 3.14 no Windows, onde não há wheel e falta `link.exe`).
- [ ] **Retries** com backoff para falhas temporárias de rede.
- [ ] **Logs estruturados** (JSON ou nível INFO/WARN) com timestamp e fonte.
- [ ] **CLI com argumentos:** `python pipeline.py --only ibge` ou `--skip clima`.
- [ ] **Metadados ricos:** em cada arquivo, `versao_pipeline`, `hash` ou `tamanho_resposta` da fonte.
- [ ] **Testes** com `httpx` mockado ou arquivos `fixtures/*.json`.

---

## 3. Melhorias na API (Node / TypeScript)

- [ ] **OpenAPI (Swagger)** para documentar rotas e exemplos de resposta.
- [ ] **Rota `GET /fontes` ou `/catalogo`:** lista endpoints disponíveis e arquivos de cache existentes.
- [ ] **`Cache-Control` / ETag** para respostas derivadas de arquivos estáticos.
- [ ] **Variável `DATA_CACHE_DIR`** para apontar o diretório do cache (Docker, testes).
- [ ] **Paginação** se algum dataset virar lista grande (ex.: municípios).

---

## 4. Operação e deploy

- [ ] **Docker Compose:** `api` + volume `data/cache`; job opcional que roda o pipeline.
- [ ] **GitHub Actions:** `npm run build`, testes Python, pipeline em cron (com rate limit consciente).
- [ ] **`.env.example`:** `PORT`, `HOST`, `DATA_CACHE_DIR`.

---

## 5. Exemplos úteis (para README ou post)

Trechos que você pode copiar depois de implementar rotas novas.

```bash
# Saúde
curl -s http://127.0.0.1:3000/health

# JSON puro no navegador ou terminal
curl -s "http://127.0.0.1:3000/populacao/estados?format=json"

# PowerShell
Invoke-RestMethod "http://127.0.0.1:3000/inflacao?format=json"
```

---

## 6. Priorização sugerida (ordem opcional)

1. **Validação + testes** nos fetchers — base sólida; Pydantic opcional se usar Python ≤3.13 com wheels disponíveis.
2. **Uma série econômica a mais** (ex.: Selic ou câmbio) — reutiliza padrão do BCB.
3. **OpenAPI + `GET /catalogo`** — quem clona o repo entende rápido o que existe.
4. **Docker Compose** — “clone e suba” em um comando.

---

## 7. O que evitar até ter necessidade

- Autenticação complexa, vários microsserviços ou banco relacional **só** por arquitetura; introduza quando um requisito real aparecer (multiusuário, histórico consultável em SQL, etc.).

---

*Última dica:* mantenha cada nova fonte **isolada** em um fetcher + um JSON + uma rota; fica fácil apagar ou refatorar sem quebrar o restante.
