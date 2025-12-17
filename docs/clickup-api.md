# Documentação API ClickUp - RedPeak Dashboard

Documentação das rotas da API do ClickUp necessárias para o Dashboard de Produtividade.

---

## 🔐 Autenticação

### Token Pessoal (Personal API Token)

O ClickUp utiliza tokens pessoais para autenticação. Os tokens começam com `pk_`.

**Como obter seu token:**

1. Faça login no ClickUp
2. Clique no seu avatar (canto superior direito)
3. Selecione **Settings**
4. Na sidebar, clique em **Apps**
5. Em **API Token**, clique em **Generate** ou **Regenerate**
6. Copie o token (ele nunca expira)

**Uso no Header:**

```
Authorization: {seu_token_pk_xxx}
```

> ⚠️ **Importante:** Nunca exponha o token no frontend. Use variáveis de ambiente no servidor.

---

## 🔑 Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
CLICKUP_API_KEY=pk_xxxxxxxxxxxxxxxxxxxxx
CLICKUP_LIST_ID=123456789
CLICKUP_SPACE_ID=987654321
```

### Como encontrar os IDs:

**LIST_ID:**

1. Abra a lista no ClickUp
2. Veja a URL: `https://app.clickup.com/123456/v/li/987654321`
3. O último número é o `LIST_ID`

**SPACE_ID:**

1. Vá em Settings > Spaces
2. Clique no Space desejado
3. Veja a URL ou nas configurações do Space

---

## 📊 Rate Limits

| Plano            | Limite                 |
| ---------------- | ---------------------- |
| **Free Forever** | 100 requests/minuto    |
| Business Plus    | 1.000 requests/minuto  |
| Enterprise       | 10.000 requests/minuto |

**Tratamento de erro (HTTP 429):**

Headers de resposta:

- `X-RateLimit-Limit` — Limite atual
- `X-RateLimit-Remaining` — Requests restantes
- `X-RateLimit-Reset` — Unix timestamp do reset

---

## 📋 Endpoints Utilizados

### 1. Get Tasks (Buscar Tarefas)

```
GET https://api.clickup.com/api/v2/list/{list_id}/task
```

**Descrição:** Retorna todas as tarefas de uma lista. Limitado a 100 tarefas por página.

**Parâmetros Query:**

| Parâmetro         | Tipo    | Descrição                                |
| ----------------- | ------- | ---------------------------------------- |
| `archived`        | boolean | Incluir tarefas arquivadas               |
| `page`            | integer | Número da página (começa em 0)           |
| `subtasks`        | boolean | Incluir subtarefas                       |
| `statuses[]`      | string  | Filtrar por status específico            |
| `assignees[]`     | integer | Filtrar por responsável (user_id)        |
| `tags[]`          | string  | Filtrar por tag                          |
| `due_date_gt`     | integer | Tarefas com due date maior que (Unix ms) |
| `due_date_lt`     | integer | Tarefas com due date menor que (Unix ms) |
| `date_created_gt` | integer | Criadas após (Unix ms)                   |
| `date_created_lt` | integer | Criadas antes (Unix ms)                  |
| `date_updated_gt` | integer | Atualizadas após (Unix ms)               |
| `date_updated_lt` | integer | Atualizadas antes (Unix ms)              |
| `include_closed`  | boolean | Incluir tarefas fechadas                 |

**Exemplo Request:**

```bash
curl -X GET \
  'https://api.clickup.com/api/v2/list/123456789/task?include_closed=true&subtasks=true' \
  -H 'Authorization: pk_xxxxxxxxxxxxx'
```

**Exemplo Response:**

```json
{
  "tasks": [
    {
      "id": "abc123",
      "name": "Implementar feature X",
      "status": {
        "status": "em desenvolvimento",
        "type": "custom",
        "orderindex": 2
      },
      "assignees": [
        {
          "id": 12345,
          "username": "joao.silva",
          "email": "joao@redpeak.com",
          "profilePicture": "https://..."
        }
      ],
      "tags": [
        {
          "name": "desenvolvimento",
          "tag_fg": "#ffffff",
          "tag_bg": "#3498db"
        }
      ],
      "date_created": "1702800000000",
      "date_updated": "1702886400000",
      "date_closed": null,
      "due_date": "1703404800000",
      "time_estimate": 14400000,
      "time_spent": 7200000,
      "priority": {
        "id": "2",
        "priority": "high",
        "color": "#ffcc00"
      }
    }
  ]
}
```

---

### 2. Get List Members (Membros da Lista)

```
GET https://api.clickup.com/api/v2/list/{list_id}/member
```

**Descrição:** Retorna todos os membros do Workspace que têm acesso à lista.

**Exemplo Request:**

```bash
curl -X GET \
  'https://api.clickup.com/api/v2/list/123456789/member' \
  -H 'Authorization: pk_xxxxxxxxxxxxx'
```

**Exemplo Response:**

```json
{
  "members": [
    {
      "id": 12345,
      "username": "joao.silva",
      "email": "joao@redpeak.com",
      "color": "#7b68ee",
      "profilePicture": "https://...",
      "initials": "JS",
      "role": 1
    },
    {
      "id": 12346,
      "username": "maria.santos",
      "email": "maria@redpeak.com",
      "color": "#2ecc71",
      "profilePicture": null,
      "initials": "MS",
      "role": 2
    }
  ]
}
```

---

### 3. Get Space Tags (Tags do Space)

```
GET https://api.clickup.com/api/v2/space/{space_id}/tag
```

**Descrição:** Retorna todas as tags disponíveis no Space (usadas como departamentos).

**Exemplo Request:**

```bash
curl -X GET \
  'https://api.clickup.com/api/v2/space/987654321/tag' \
  -H 'Authorization: pk_xxxxxxxxxxxxx'
```

**Exemplo Response:**

```json
{
  "tags": [
    {
      "name": "desenvolvimento",
      "tag_fg": "#ffffff",
      "tag_bg": "#3498db"
    },
    {
      "name": "design",
      "tag_fg": "#ffffff",
      "tag_bg": "#9b59b6"
    },
    {
      "name": "marketing",
      "tag_fg": "#000000",
      "tag_bg": "#f1c40f"
    }
  ]
}
```

---

### 4. Get List (Informações da Lista)

```
GET https://api.clickup.com/api/v2/list/{list_id}
```

**Descrição:** Retorna informações da lista, incluindo todos os status configurados.

**Exemplo Request:**

```bash
curl -X GET \
  'https://api.clickup.com/api/v2/list/123456789' \
  -H 'Authorization: pk_xxxxxxxxxxxxx'
```

**Exemplo Response:**

```json
{
  "id": "123456789",
  "name": "Demandas RedPeak",
  "statuses": [
    {
      "status": "backlog",
      "type": "open",
      "orderindex": 0,
      "color": "#87909e"
    },
    {
      "status": "diagnóstico",
      "type": "custom",
      "orderindex": 1,
      "color": "#f9d900"
    },
    {
      "status": "em desenvolvimento",
      "type": "custom",
      "orderindex": 2,
      "color": "#02bcd4"
    },
    {
      "status": "homologação",
      "type": "custom",
      "orderindex": 3,
      "color": "#9c27b0"
    },
    {
      "status": "concluído",
      "type": "closed",
      "orderindex": 4,
      "color": "#6bc950"
    }
  ]
}
```

---

## 🏷️ Mapeamento de Status para Categorias

Para o dashboard, os status do ClickUp serão agrupados em categorias:

| Categoria    | Status ClickUp                                        | Descrição                       |
| ------------ | ----------------------------------------------------- | ------------------------------- |
| **Inativas** | Backlog, Diagnóstico, Falta de Requisitos, Para Fazer | Tarefas que ainda não começaram |
| **Ativas**   | Em Desenvolvimento, Bloqueio                          | Tarefas em andamento            |
| **Feitas**   | Homologação                                           | Tarefas aguardando validação    |
| **Fechadas** | Concluído                                             | Tarefas finalizadas             |

**Implementação no código:**

```typescript
const STATUS_CATEGORIES = {
  inactive: ["backlog", "diagnóstico", "falta de requisitos", "para fazer"],
  active: ["em desenvolvimento", "bloqueio"],
  done: ["homologação"],
  closed: ["concluído"],
} as const;

function getStatusCategory(status: string): string {
  const normalizedStatus = status.toLowerCase();

  for (const [category, statuses] of Object.entries(STATUS_CATEGORIES)) {
    if (statuses.some(s => normalizedStatus.includes(s))) {
      return category;
    }
  }
  return "inactive"; // default
}
```

---

## 📈 Cálculo de KPIs

### Taxa de Conclusão

```typescript
const completionRate = (closedTasks / totalTasks) * 100;
```

### Taxa de Conclusão por Período

```typescript
// Tarefas concluídas no período / Total de tarefas que existiam no período
const periodCompletionRate =
  (tasksClosedInPeriod / (tasksClosedInPeriod + tasksStillOpenFromPeriod)) *
  100;
```

### Produtividade por Responsável

```typescript
const productivityByAssignee = tasks.reduce((acc, task) => {
  task.assignees.forEach(assignee => {
    if (!acc[assignee.id]) {
      acc[assignee.id] = { total: 0, closed: 0, name: assignee.username };
    }
    acc[assignee.id].total++;
    if (getStatusCategory(task.status.status) === "closed") {
      acc[assignee.id].closed++;
    }
  });
  return acc;
}, {});
```

---

## ⚠️ Limitações Conhecidas

1. **Paginação:** Máximo 100 tasks por request. Implementar loop de paginação.

2. **Histórico:** A API não retorna histórico de mudanças de status. Para gráficos de evolução temporal, considerar:

   - Usar `date_closed` para tarefas finalizadas
   - Usar `date_created` para novas tarefas
   - Snapshot diário em banco de dados (futuro)

3. **Subtasks:** Subtasks são retornadas separadamente. Usar `subtasks=true` se necessário.

4. **Rate Limit:** Com 100 req/min no plano Free, implementar cache de 5 minutos.

---

## 🔗 Referências

- [Documentação Oficial ClickUp API](https://developer.clickup.com/reference)
- [Autenticação](https://developer.clickup.com/docs/authentication)
- [Rate Limits](https://developer.clickup.com/docs/rate-limits)
- [Tasks Overview](https://developer.clickup.com/docs/tasks)
