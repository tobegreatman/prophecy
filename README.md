# Prophecy

Prophecy 是一个基于中国福利彩票双色球官方开奖数据的概率分析系统，提供两类核心能力：

- 概率预测：根据最近若干期历史数据，生成热号延续、均衡回归、冷号反弹三类预测方案。
- 历史数据：查看最近开奖期号、号码、销量、奖池与官方详情链接。

## 技术实现

- 后端：Node.js + Koa2 + Axios + Zod
- 前端：Vue 3 运行时 + Axios + ECharts
- 数据源：`https://www.cwl.gov.cn/cwl_admin/front/cwlkj/search/kjxx/findDrawNotice`

当前仓库中的前端采用静态 Vue 运行时页面，由 Koa 直接托管，不依赖本地前端构建链即可运行。

## 启动

1. 安装依赖

```bash
npm install
```

2. 启动服务

```bash
npm run dev
```

Windows 也可以直接使用：

```powershell
.\start.ps1
```

或：

```bat
start.cmd
```

检查服务状态：

```powershell
npm run status
```

停止服务：

```powershell
npm run stop
```

3. 访问页面

```text
http://localhost:3000
```

## 可用脚本

- `npm run dev`：通过 `start.ps1` 启动后端并托管前端页面
- `npm run build`：检查后端运行入口
- `npm run start`：通过 `start.ps1` 启动后端
- `npm run status`：检查 `3000` 端口上的 Prophecy 进程和健康状态
- `npm run stop`：停止 `3000` 端口上的 Prophecy 进程

## API

- `GET /api/health`
- `GET /api/ssq/dashboard?issueCount=80`
- `GET /api/ssq/history?issueCount=30`

## 说明

- 预测结果为基于历史频率、近期开奖活跃度和遗漏跨度的启发式分析，不构成任何结果保证。
- 页面在 `file://` 协议下只能渲染静态界面，实际数据请求需要通过 Koa 服务访问。
- 当前环境下 `npm workspace` 脚本可能异常退出，因此根脚本与 `start.ps1` / `start.cmd` 已改为直连 Node 入口。
- `start.ps1`、`status.ps1`、`stop.ps1` 会统一读取进程环境变量中的 `PORT`，如果存在 `.env`，也会从其中读取 `PORT`。

