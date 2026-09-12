# Wiki Log — {{PROJECT_NAME}}

Registro cronológico append-only de operações sobre a wiki. Formato: `## [YYYY-MM-DD] operation | titulo`.

Operações canônicas (Karpathy LLM Wiki pattern):
- `ingest` — compilou raw source em uma ou mais wiki pages
- `query` — respondeu pergunta usando a wiki (opcionalmente promoveu resposta a nova page)
- `lint` — auditou integridade (contradições, páginas órfãs, claims desatualizadas)

---

## [{{DATE}}] init | Wiki criada via CPS bootstrap
