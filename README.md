# refain-draw

部门内部 AI 画图 Web 工具。

## 项目说明

通过 AI 生成和修改 draw.io 图表。用户通过自然语言描述需求，AI 自动生成或编辑 draw.io XML 格式的图表，并在 Web 页面上实时预览和交互。

**仅供内部使用。**

## 本地启动

### 安装依赖

```bash
npm install
```

### 启动开发服务

```bash
npm run dev
```

启动后访问：http://127.0.0.1:6002

## 模型配置

在页面中打开模型配置入口（设置图标）：

1. 填写 API Key
2. 填写 Base URL（可选，用于自定义端点）
3. 填写 Model ID
4. 点击保存

刷新页面后配置仍可使用。

**注意：不要在配置中填写真实 API Key 后截图分享。**

## 基本使用

1. 在输入框输入画图需求（如"画一个登录流程图"）
2. AI 自动生成 draw.io 图表并显示在左侧画布
3. 可以继续输入修改要求，让 AI 基于当前图表调整
4. 支持模板功能（保存常用 prompt）
5. 支持历史记录（查看和恢复之前的图表版本）
6. 支持导入已有图表文件
7. 支持导出图表（PNG、SVG、Draw.io XML 格式）

## 导入导出

- **导入**：点击导入按钮，选择 `.drawio`、`.xml` 或 `.svg` 文件
- **导出**：点击导出按钮，选择格式：
  - PNG 图片
  - SVG 图片
  - Draw.io XML（`.drawio` 或 `.xml`）

## 常见问题

### 页面打不开

- 检查 `npm run dev` 是否成功启动
- 础认端口是 6002
- 检查终端是否有报错

### 模型不可用

- 检查 API Key 是否正确
- 检查 Base URL 是否正确（如有自定义端点）
- 检查 Model ID 是否正确
- 查看浏览器 Console 是否有错误

### 图表未生成

- 检查模型响应是否正常
- 查看浏览器 Console 是否有错误
- 础认模型支持 tool calling 功能

### 配置丢失

- 检查浏览器 localStorage 是否被清理
- 检查是否切换了浏览器或设备

### lint 报 .venv 错误

- 础认 `.venv/` 已加入 `.gitignore`
- 不修改 `.venv` 内部文件

## 开发验证

```bash
# 代码检查
npm run lint

# 构建
npm run build

# 测试
npm test
```

