# 三国风云 · 轻量 SLG

一款纯前端实现的三国题材轻量级策略模拟游戏（SLG）。无需后端、无需构建工具，打开 HTML 即可游玩。

## 在线体验

直接打开 `index.html`，或在本地启动任意静态服务器后访问根目录。

```bash
# 方式一：直接双击 index.html（模块化入口，推荐现代浏览器）
# 方式二：本地静态服务器
python3 -m http.server 8000
```

然后在浏览器访问 `http://localhost:8000`。

> 提示：`sanguo_slg.html` 为旧版单文件兼容入口，仍可离线直接打开。

## 游戏特色

- **纯前端**：原生 HTML/CSS/JavaScript + SVG 地图，无框架、无构建依赖。
- **完整 SLG 体验**：内政、军事、武将、外交、地图、战役、事件系统一应俱全。
- **势力选择**：可选择多个三国势力开局，体验不同难度与地缘环境。
- **武将系统**：招募、招降、升级、装备、羁绊组合技。
- **军团作战**：步兵、骑兵、弓兵搭配阵型与战术，自动结算战场。
- **动态事件**：随机事件与历史事件影响势力发展。
- **AI 对手**：电脑势力会自主发展、招兵、攻城。

## 核心玩法

1. **内政**：调整政策、发展经济、征兵、医治武将。
2. **军事**：组建军团，选择兵种与阵型，出征攻占城池。
3. **武将**：寻访在野武将、招降敌将、升级装备、触发羁绊加成。
4. **外交**：与其他势力结盟、停战或敌对。
5. **目标**：消灭所有敌对势力，一统天下。

## 项目结构

```
sanguo-slg/
├── index.html              # 新入口：模块化版本（默认）
├── sanguo_slg.html         # 旧版单文件兼容入口
├── china.svg               # 中国地图 SVG
├── assets/
│   └── china.svg           # 地图资源副本
├── css/                    # 样式文件
│   ├── base.css
│   ├── layout.css
│   ├── components.css
│   ├── map.css
│   └── animations.css
└── js/                     # JavaScript 模块
    ├── app.js              # 应用启动与全局事件绑定
    ├── config/             # 游戏配置（兵种、阵型、技能、事件等）
    ├── data/               # 世界数据生成（武将、城池、势力）
    ├── core/               # 核心逻辑（状态、工具函数、战斗）
    ├── systems/            # 系统逻辑（AI、经济、事件、存档等）
    └── ui/                 # UI 渲染
        ├── renderer.js
        ├── modal.js
        └── tabs/
```

## 文件说明

| 文件/目录 | 说明 |
|-----------|------|
| `index.html` | 新入口页面，使用 ES Modules 加载 `js/app.js` |
| `sanguo_slg.html` | 旧版单文件入口，保留用于离线兼容 |
| `china.svg` / `assets/china.svg` | 中国地图 SVG |
| `css/` | 按职责拆分的样式文件 |
| `js/app.js` | 应用入口：初始化、模块导入、`window` 全局绑定 |
| `js/config/` | 纯数据配置（兵种、阵型、技能、装备、政策、战术、羁绊、事件） |
| `js/data/` | 武将、城池、势力数据生成器 |
| `js/core/` | 全局状态管理、通用工具函数、战斗计算 |
| `js/systems/` | AI、经济、事件、成就、教程、存档、音效 |
| `js/ui/` | 渲染总控、弹窗、各功能面板 |

## 技术栈

- HTML5
- CSS3（原生样式 + 响应式布局）
- JavaScript（ES6+，原生 ES Modules，无框架依赖）

## 本地开发

项目无任何构建步骤，直接用浏览器打开 `index.html` 即可运行。推荐使用 VS Code 的 **Live Server** 插件或任意静态服务器。

```bash
python3 -m http.server 8000
```

## 浏览器兼容性

推荐现代浏览器（Chrome、Edge、Firefox、Safari）。

`index.html` 使用 ES Modules，需要支持 `type="module"` 的浏览器；如需兼容旧浏览器，请使用 `sanguo_slg.html`。
