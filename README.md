# 三国风云 · 轻量 SLG

> 一款纯前端实现的三国题材回合制策略游戏（SLG）：治理内政、招募名将、编组军团、纵横外交，从公元 190 年的乱世中一统天下。

![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript_ES_Modules-F7DF1E?logo=javascript&logoColor=black)
![No Build](https://img.shields.io/badge/构建-无需工具链-brightgreen)
![License](https://img.shields.io/badge/License-暂未指定-lightgrey)

## 🎮 游戏简介

公元 190 年，汉室倾颓，群雄并起。你将扮演**刘备**势力，在曹操、孙权、袁绍、吕布四大 AI 势力的环伺下求生存、谋发展。游戏以「月」为回合推进，四季轮转影响粮草产出；你需要平衡粮食、金钱、兵力与士气，通过内政建设、武将招募、军团征战与外交纵横，最终消灭所有敌对势力，成就一统天下的霸业。

## ✨ 功能特性

- **九大功能页签**：内政 / 军事 / 人才 / 外交 / 地图 / 事件 / 成就 / 任务 / 日志，完整覆盖 SLG 玩法闭环。
- **回合制季节经济**：春夏秋冬四季影响城池粮食产出，夏季可免费征兵；政策（屯田、重商、仁政等）改变经济走向。
- **兵种克制与阵型**：步兵 / 骑兵 / 弓兵循环克制（骑兵克步兵、步兵克弓兵、弓兵克骑兵），搭配鱼鳞、锋矢、方圆、雁行、长蛇五种阵型与兵种特性（盾墙、冲锋、齐射）。
- **武将系统**：寻访在野人才、招降敌将、购买并穿戴装备、武将技能与羁绊组合加成，受伤武将需时间痊愈。
- **军团作战与科技**：编组军团出征攻城，农、商、军、城防四系科技提升国力，兵种经验升级（最高 5 级）。
- **动态事件系统**：随机事件与历史事件交织，玩家可做出分支选择影响势力发展。
- **AI 对手**：四大 AI 势力拥有不同性格（扩张型 / 外交型），自主发展经济、招兵买马、攻城略地；支持简单 / 普通 / 困难三档难度。
- **存档系统**：自动存档 + 手动存档（localStorage），支持加密导出 / 导入存档代码，跨设备转移进度。
- **新手引导与成就**：内置分步教程、页签新手提示、任务与成就系统，以及游戏结局评价。

## 🕹️ 操作说明

本游戏为**纯鼠标点击操作**，无键盘快捷键：

| 操作 | 说明 |
| --- | --- |
| 左侧边栏点击 | 切换内政 / 军事 / 人才 / 外交 / 地图 / 事件 / 成就 / 任务 / 日志页签 |
| 「下一回合」按钮 | 结束当前回合，推进月份并结算经济、事件与 AI 行动 |
| 内政页 | 选择政策、执行内政指令、建设城池建筑 |
| 军事页 | 编组 / 解散军团、选择兵种阵型、增援城池、发起进攻 |
| 人才页 | 寻访人才（300 金）、招降敌将（500 金）、装备商店、穿戴装备 |
| 外交页 | 与其他势力结盟（500 金）、贸易（200 粮）等 |
| 地图页 | 在 SVG 中国地图上点击城池，快速跳转军事页发起攻略 |
| 事件页 | 查看并选择处理待决事件 |

首次进入会自动弹出**新手教程**，可逐步学习或点击「跳过」。

## 🛠️ 技术栈

- **原生 HTML5 / CSS3 / JavaScript（ES Modules）**，零框架、零构建工具
- **SVG 地图**渲染中国城池布局
- **Web Audio API** 生成音效（`js/systems/audio.js`）
- **localStorage** 本地存档（`sanguo_slg_save` / `sanguo_slg_autosave`），加密存档导入导出基于 `TextEncoder`/`TextDecoder`
- 模块化架构：`core`（状态 / 战斗 / 日志 / 工具）、`systems`（经济 / AI / 事件 / 存档等）、`ui`（渲染与各页签）、`config` / `data`（数值与静态数据）

## 🚀 快速开始

本项目**无需安装依赖、无需构建打包**。

### 方式一：本地静态服务器（推荐）

由于入口采用 ES Modules，建议通过本地服务器访问（Windows 可用 `py` 或 `python`）：

```bash
cd games/sanguo-slg
python -m http.server 8000
# 或使用 Node.js
npx serve .
```

然后在浏览器访问 `http://localhost:8000`。

### 方式二：直接打开文件

现代浏览器下可直接双击打开 `index.html`；若浏览器对 ES Modules 的 `file://` 限制导致无法加载，可使用旧版单文件入口 `sanguo_slg.html`（可离线直接打开）。

> 构建打包：本项目为纯静态站点，将目录整体部署到任意静态托管（GitHub Pages / Nginx 等）即可，无构建步骤。

## 📁 项目结构

```
sanguo-slg/
├── index.html              # 主入口（模块化版本）
├── sanguo_slg.html         # 旧版单文件兼容入口
├── china.svg               # 中国地图 SVG
├── assets/china.svg        # 地图资源副本
├── css/                    # 样式：base / layout / components / map / animations
├── js/
│   ├── app.js              # 应用入口，聚合全部交互动作
│   ├── core/               # state 状态、battle 战斗结算、log、utils
│   ├── systems/            # economy 回合结算、ai、eventSystem、save、audio、
│   │                       # achievements、tutorial、gameEnd
│   ├── ui/                 # renderer、common 及 tabs/ 下九个页签视图
│   ├── config/             # constants、policies、buildings、skills、bonds、
│   │                       # equipment、eliteTroops、tactics、events、quests
│   └── data/               # factions、cities、generals 静态数据
└── docs/
    └── audit-and-fixes.md  # 玩法/剧情审查与修复记录
```

## 📜 License

暂未指定。
