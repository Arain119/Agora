# NVIDIA API Router Platform

一个类似 New API 的自动轮询路由平台，支持多NVIDIA API Key负载均衡，完全兼容OpenAI API格式。

## 功能特性

- ✅ **OpenAI API 完全兼容** - 支持 `/v1/chat/completions`、`/v1/completions`、`/v1/models`
- ✅ **多Key智能轮询** - 5个NVIDIA API Key自动负载均衡，基于使用率分配请求
- ✅ **速率限制管理** - 每Key 40 RPM限制，自动选择未超限的Key
- ✅ **流式响应** - 支持 `stream: true` 实时流式输出
- ✅ **访问令牌管理** - 创建多个访问令牌，独立速率限制
- ✅ **管理后台** - 可视化的Web管理界面
- ✅ **请求日志** - 实时记录最近500条请求日志
- ✅ **64个可用模型** - 包括 LLaMA、DeepSeek、Gemma、Mistral、Qwen等

## 快速接入

### Base URL
```
https://3000-i3278fd5io2xk8wog1shy-18e660f9.sandbox.novita.ai
```

### 默认访问令牌
```
sk-nvidia-router-default-2024
```

### Python 示例
```python
from openai import OpenAI

client = OpenAI(
    base_url="https://3000-i3278fd5io2xk8wog1shy-18e660f9.sandbox.novita.ai/v1",
    api_key="sk-nvidia-router-default-2024"
)

response = client.chat.completions.create(
    model="meta/llama-3.3-70b-instruct",
    messages=[{"role": "user", "content": "Hello!"}],
    stream=True
)
```

### cURL 示例
```bash
curl https://BASE_URL/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-nvidia-router-default-2024" \
  -d '{
    "model": "meta/llama-3.3-70b-instruct",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

## 管理后台

- **地址**: `/dashboard` 或 `/login`
- **默认密码**: `admin123456`

### 管理功能
- 查看实时统计（请求数、成功率、延迟）
- 管理NVIDIA API密钥（添加/删除/启用/禁用）
- 创建/管理访问令牌
- 查看请求日志
- 浏览64个可用模型列表
- 查看接入文档

## API端点

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | /v1/models | 获取模型列表（无需认证）|
| POST | /v1/chat/completions | 聊天对话（支持流式）|
| POST | /v1/completions | 文本补全 |
| GET | /dashboard | 管理后台 |
| GET | /login | 登录页面 |

## 已配置密钥

| 标签 | RPM限制 | 状态 |
|------|---------|------|
| Key-1 | 40/min | ✅ 启用 |
| Key-2 | 40/min | ✅ 启用 |
| Key-3 | 40/min | ✅ 启用 |
| Key-4 | 40/min | ✅ 启用 |
| Key-5 | 40/min | ✅ 启用 |

**总容量**: 200 RPM (5 × 40)

## 技术栈

- **框架**: Hono (TypeScript)
- **运行时**: Cloudflare Workers
- **上游**: NVIDIA NIM API (`https://integrate.api.nvidia.com/v1`)
- **构建**: Vite + @hono/vite-build
- **状态**: 内存状态（Worker生命周期内持久化）

## 部署状态

- **平台**: Cloudflare Pages / Wrangler Pages Dev
- **状态**: ✅ 运行中
- **最后更新**: 2026-04-05

## 模型逐一转发测试

可以使用下面脚本逐一拉取 `/v1/models` 返回的所有模型，并对每个模型执行：

- 非流式请求（`stream: false`）
- 流式请求（`stream: true`）

脚本会携带常用参数（如 `temperature`、`top_p`、`max_tokens`、`frequency_penalty`、`presence_penalty`、`stop`、`seed`、`user`）并验证请求可被平台正常处理。
对于带“思考模式”的模型，脚本也会按模型差异注入参数（例如 DeepSeek/Kimi 2.5 使用 `thinking`，Qwen3.5/GLM/Gemma 4 使用 `enable_thinking`，GLM 额外带 `clear_thinking: false`）。

```bash
cd webapp
npm run test:forwarding
```

可选环境变量：

- `BASE_URL`：目标网关地址（默认 README 中示例地址）
- `API_KEY`：测试用访问令牌（默认 `sk-nvidia-router-default-2024`）

示例：

```bash
BASE_URL="https://your-domain.example" API_KEY="sk-xxx" npm run test:forwarding
```
