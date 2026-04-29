# CLAUDE.md

> 本文件为 **Claude Code / AI 编码助手** 在本仓库中工作的指导手册。  
> 目标：让 AI 在本项目内输出 **风格一致、可直接合入** 的代码与文档。  
> 维护原则：**精炼、可执行、随项目演进**。

---

## 1. 项目概览

- **项目名称**：<Project Name>
- **一句话简介**：<做什么 / 解决什么问题>
- **核心用户 / 场景**：<面向谁 / 典型用例>
- **当前阶段**：MVP / 迭代中 / 稳定维护
- **关键链接**：
  - 需求文档：<link>
  - 架构文档：[system_architecture.md](system_architecture.md)
  - API 文档：<link>
  - 部署 / Runbook：<link>

---

## 2. 技术栈

| 维度 | 选型 |
| ---- | ---- |
| 语言 | <例如 TypeScript 5.x / Python 3.12 / Go 1.22> |
| 框架 | <Next.js / FastAPI / Spring Boot …> |
| 数据存储 | <PostgreSQL / Redis / S3 …> |
| 包管理 | <pnpm / uv / poetry / go mod> |
| 测试 | <Vitest / Pytest / Go test> |
| Lint / Format | <ESLint + Prettier / Ruff + Black / golangci-lint> |
| CI/CD | <GitHub Actions / GitLab CI> |
| 部署 | <Docker / K8s / Serverless> |

---

## 3. 仓库结构

```
.
├── src/            # 源代码
├── tests/          # 测试代码
├── docs/           # 文档
├── scripts/        # 工程脚本
├── .github/        # CI / Issue 模板
├── CLAUDE.md       # 本文件
└── README.md
```

> 添加 / 移动模块时，请同步更新本节与架构文档。

---

## 4. 常用命令

```bash
# 安装依赖
<install cmd>

# 本地开发
<dev cmd>

# 运行测试（单测 / 覆盖率）
<test cmd>
<coverage cmd>

# Lint / Format / 类型检查
<lint cmd>
<format cmd>
<typecheck cmd>

# 构建 / 发布
<build cmd>
<release cmd>
```

> AI 在提交前应至少跑通：**lint + typecheck + test**。

---

## 5. 编码规范

### 5.1 通用原则
- **小步提交**：单次改动聚焦单一目的。
- **不过度工程**：仅做被要求或必需的改动；不顺手重构无关代码。
- **可读性优先**：命名清晰、函数短小、避免深层嵌套。
- **错误处理在边界**：不为不可能的分支添加防御性代码。
- **不引入新依赖**：除非确有必要并说明理由。

### 5.2 命名与风格
- 文件 / 目录：<kebab-case / snake_case / lower_camel>
- 类型 / 类：PascalCase；函数 / 变量：<camelCase / snake_case>
- 常量：UPPER_SNAKE_CASE
- 严格遵循项目 Linter / Formatter，不手动覆盖规则。

### 5.3 注释与文档
- 公共 API、复杂算法必须有注释，说明 **为什么**，而非 **是什么**。
- 不要为未修改的代码补注释 / 类型。
- 用户面文案与日志使用 <语言：中文 / 英文>，保持一致。

---

## 6. 测试策略

- **必写**：核心业务逻辑、纯函数、边界条件、回归用例。
- **金字塔**：单元测试为主，集成测试覆盖关键链路，E2E 守护核心流程。
- **覆盖率目标**：行覆盖 ≥ <80%>，关键模块 ≥ <90%>。
- **修 Bug 流程**：先写失败用例 → 修复 → 用例通过。
- 测试不得依赖真实外部服务，使用 Mock / Fixture / 容器。

---

## 7. Git 工作流

- 主分支：`main`（始终可发布）
- 特性分支：`feat/<scope>-<short-desc>`
- 修复分支：`fix/<scope>-<short-desc>`
- 提交信息遵循 **Conventional Commits**：

```
<type>(<scope>): <subject>

[optional body]
[optional footer]
```

  - type：`feat | fix | docs | refactor | test | chore | perf | build | ci`
  - subject：祈使句、≤ 72 字符、句尾不加句号。

- PR 要求：
  - 关联 Issue / 需求
  - 通过所有 CI 检查
  - 至少 1 名 reviewer 审核
  - 自测清单 + 影响范围说明

> AI 不得执行不可逆操作（`git push --force`、`reset --hard`、删除分支等），需先与用户确认。

---

## 8. 安全与合规

- 不在代码 / 日志中硬编码密钥、令牌、个人信息。
- 敏感配置走环境变量或密钥管理（KMS / Vault）。
- 防御 OWASP Top 10：SQL 注入、XSS、SSRF、反序列化、越权等。
- 第三方依赖：引入前评估许可证与维护活跃度，定期跑 SCA。
- 处理用户数据需遵循 <GDPR / 等保 / 内部数据分级> 要求。

---

## 9. AI 协作准则

> 适用于 Claude / Copilot 等 AI 助手在本仓库的行为。

### 9.1 必做
- 修改前先阅读相关文件与上下文，理解既有约定。
- 修改后运行 lint / typecheck / 相关测试，确认无回归。
- 输出简洁、有结构；改动较大时分步骤说明。
- 引用文件用相对路径与行号链接。
- 不确定时先提出澄清问题，再动手。

### 9.2 不做
- 不创建无关文件（包括"变更说明"类 Markdown，除非被要求）。
- 不顺手重命名 / 重排无关代码。
- 不删除看似"无用"的文件 —— 可能是在途工作。
- 不绕过安全检查（如 `--no-verify`、关闭类型检查）。
- 不臆造 API、库函数、链接或文件路径。

### 9.3 任务交付清单
- [ ] 改动范围与原始诉求一致
- [ ] 通过本地 lint / 类型检查 / 测试
- [ ] 新增 / 修改逻辑有对应测试
- [ ] 文档（README / 架构图 / 注释）已同步
- [ ] 无敏感信息泄露
- [ ] PR 描述清晰，含验证方式

---

## 10. 常见问题（项目特定）

- **Q：本地起不来？** A：<排查步骤 / 链接>
- **Q：测试卡住？** A：<排查步骤 / 链接>
- **Q：如何新增一个模块？** A：<步骤 / 模板路径>

---

## 11. 维护说明

- 本文件由团队共同维护，发现与现状不符请立即更新。
- 重大约定变更需在 PR 中显式标注 `docs(claude): ...`。
- 最后更新：YYYY-MM-DD
