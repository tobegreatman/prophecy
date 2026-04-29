# CLAUDE.md

> 本文件为 Claude Code / AI 编码助手在 **Acme Shop**（Node 全栈电商）仓库中的工作手册。
> 目标：输出风格一致、可直接合入主干的代码与文档。

---

## 1. 项目概览

- **项目名称**：Acme Shop
- **简介**：面向中小商家的轻量电商平台，支持商品管理、下单、支付、订单履约。
- **核心场景**：商家后台运营 + C 端用户购物。
- **当前阶段**：迭代中（v1.3）
- **关键链接**：
  - 需求文档：`docs/prd/`
  - 架构文档：[system_architecture.md](system_architecture.md)
  - API 文档：`http://localhost:4000/api/docs`（Swagger）
  - Runbook：`docs/runbook.md`

---

## 2. 技术栈

| 维度 | 选型 |
| ---- | ---- |
| 运行时 | Node.js 20 LTS |
| 语言 | TypeScript 5.4（`strict: true`） |
| 前端 | Next.js 14（App Router）+ React 18 + TailwindCSS + shadcn/ui |
| 状态/数据 | TanStack Query 5、Zustand |
| 后端 | NestJS 10 + Fastify 适配器 |
| ORM | Prisma 5 |
| 数据库 | PostgreSQL 15、Redis 7 |
| 消息 | BullMQ（基于 Redis） |
| 鉴权 | NextAuth.js（前台）+ JWT（服务间） |
| 测试 | Vitest（单测）、Playwright（E2E）、Supertest（API） |
| 包管理 | pnpm 9 + Turborepo（monorepo） |
| Lint/Format | ESLint + Prettier + TypeScript |
| CI/CD | GitHub Actions |
| 部署 | Docker + Kubernetes（EKS） |
| 观测 | OpenTelemetry + Grafana + Loki + Prometheus |

---

## 3. 仓库结构

```
.
├── apps/
│   ├── web/                # Next.js 前端
│   └── api/                # NestJS 后端
├── packages/
│   ├── ui/                 # 共享组件库
│   ├── config/             # 共享 eslint / tsconfig / tailwind
│   ├── db/                 # Prisma schema 与 client
│   └── shared/             # 共享类型、zod schema、工具函数
├── infra/                  # Dockerfile / K8s manifests / Helm
├── scripts/                # 一次性脚本
├── .github/workflows/      # CI
├── CLAUDE.md
└── README.md
```

> 新增包/应用需同步更新 `pnpm-workspace.yaml`、`turbo.json` 与本节。

---

## 4. 常用命令

```bash
# 安装依赖
pnpm install

# 启动全栈开发（web + api + 数据库）
pnpm dev                       # 通过 turbo 并行启动
docker compose -f infra/docker-compose.dev.yml up -d   # postgres + redis

# 数据库
pnpm --filter @acme/db prisma migrate dev
pnpm --filter @acme/db prisma studio
pnpm --filter @acme/db seed

# 测试
pnpm test                      # 全量单测
pnpm --filter @acme/api test:e2e
pnpm --filter @acme/web test:e2e   # Playwright
pnpm test -- --coverage

# 质量门禁
pnpm lint
pnpm typecheck
pnpm format

# 构建
pnpm build
pnpm --filter @acme/api start:prod
```

> 提交前必须通过：`pnpm lint && pnpm typecheck && pnpm test`。

---

## 5. 编码规范

### 5.1 通用
- 严格 TypeScript，禁用 `any`；外部数据用 `zod` 校验后再进入业务层。
- 函数 ≤ 50 行、文件 ≤ 300 行；超出请拆分。
- 错误处理只在边界（HTTP handler / queue consumer）；内部抛 `DomainError`。
- 禁用默认导出（除 Next.js 页面/路由约定要求外）。

### 5.2 命名
- 文件/目录：`kebab-case`（React 组件文件 `PascalCase.tsx`）。
- 类型/类/组件：`PascalCase`；函数/变量：`camelCase`；常量：`UPPER_SNAKE_CASE`。
- React Hook：`useXxx`；NestJS provider：`XxxService` / `XxxRepository`。
- 数据库表：`snake_case` 复数（`order_items`），主键 `id`（cuid2），时间戳 `created_at`/`updated_at`。

### 5.3 前端约定
- 默认 **Server Components**；仅在需要交互处加 `"use client"`。
- 数据获取：服务端用 `fetch` + `revalidate`，客户端用 TanStack Query。
- 表单：`react-hook-form` + `zod` resolver；统一通过 `packages/shared` 的 schema。
- 样式：Tailwind 优先；复用组件归入 `packages/ui`。

### 5.4 后端约定
- 控制器只做参数校验与编排；业务在 Service；持久化在 Repository。
- DTO 使用 `zod`（`nestjs-zod`）；OpenAPI 自动生成。
- 所有外部调用必须有超时（默认 3s）和重试（指数退避，幂等才重试）。
- 长任务走 BullMQ，不在 HTTP 请求中执行。

---

## 6. 测试策略

- **覆盖率**：行覆盖 ≥ 80%，`packages/shared` 与 `apps/api/src/domain` ≥ 90%。
- **单测**：Vitest + `@testing-library/react`；纯函数与 Service 必测。
- **API**：Supertest + 测试容器（Postgres/Redis）；每个用例独立事务回滚。
- **E2E**：Playwright 覆盖登录、下单、支付、退款核心链路。
- **修 Bug 流程**：先复现成失败用例 → 修复 → 用例通过 → 加入回归集。
- 禁止在测试中访问真实第三方（Stripe、短信网关等），用 mock/fake server。

---

## 7. Git 工作流

- 主干：`main`（始终可发布，受保护）。
- 分支：`feat/<scope>-<desc>`、`fix/<scope>-<desc>`、`chore/...`。
- Commit：Conventional Commits，例 `feat(api): add order refund endpoint`。
- PR 模板需包含：动机、改动摘要、自测清单、影响面、回滚方案。
- 合并策略：Squash merge；要求 1 人以上 review + CI 全绿。
- AI 不得执行：`git push --force`、`reset --hard`、删除分支/Tag、修改已发布历史。

---

## 8. 安全与合规

- 密钥仅存于 Doppler / K8s Secret；本地用 `.env.local`（已 gitignore）。
- 所有写接口必须经 Auth 中间件；权限校验集中在 `CaslAbility`。
- 输入侧：`zod` 校验 + 参数化查询（Prisma），防 SQLi/XSS。
- 输出侧：默认 `Content-Security-Policy`、`helmet`；Cookie `HttpOnly + Secure + SameSite=Lax`。
- 依赖：每周 `pnpm audit` + Dependabot；引入新依赖需在 PR 说明理由与许可证。
- 个人数据：用户邮箱/手机号字段加密存储（pgcrypto），日志脱敏。

---

## 9. AI 协作准则

### 9.1 必做
- 改动前阅读涉及到的 `apps/*` / `packages/*` 现有实现与类型。
- 跨包改动同时更新调用方与对应测试。
- 修改 Prisma schema 必须生成 migration（`prisma migrate dev --name <desc>`）。
- 提交前运行 `pnpm lint && pnpm typecheck && pnpm test --filter <相关包>`。
- 引用文件用相对路径，例如 [apps/api/src/orders/orders.service.ts](apps/api/src/orders/orders.service.ts)。

### 9.2 不做
- 不创建无关 Markdown（"改动说明"类）除非用户要求。
- 不引入新的运行时依赖（如新 ORM、新 UI 库）未经确认。
- 不绕过 ESLint/TS 检查（禁止 `// @ts-ignore`、`eslint-disable` 不附理由）。
- 不直接编辑 `pnpm-lock.yaml`；通过 `pnpm add/remove` 维护。
- 不臆造 API、表字段、环境变量名。

### 9.3 交付清单
- [ ] `pnpm lint && pnpm typecheck && pnpm test` 通过
- [ ] 新增逻辑有单测/集成测试
- [ ] Prisma schema 改动附 migration 与回滚说明
- [ ] OpenAPI / 前端类型已同步
- [ ] 无敏感信息、无 `console.log` 残留
- [ ] PR 描述含验证步骤与影响面

---

## 10. 常见问题

- **Q：`pnpm dev` 报端口占用？** A：`lsof -i :3000,:4000` 杀进程，或改 `.env.local` 的 `PORT`。
- **Q：Prisma 报 schema drift？** A：`pnpm --filter @acme/db prisma migrate reset`（仅 dev）。
- **Q：Playwright 在 CI 失败本地通过？** A：检查 `webServer` 启动超时，必要时 `PWDEBUG=1` 本地复现。
- **Q：如何新增一个领域模块？** A：参考 `apps/api/src/orders` 结构 + `packages/shared/src/orders` schema。

---

## 11. 维护

- 任何与现状不符请立即更新本文件，PR 标注 `docs(claude): ...`。
- 最后更新：2026-04-29
