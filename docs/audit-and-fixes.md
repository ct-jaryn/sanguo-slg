# 玩法与剧情审查报告 · 修复记录

- 审查日期：2026-07-19（基于 master `82d6cb8`）
- 审查方式：5 路并行代码审查（剧情事件 / 战斗军事 / 经济内政 / 数据一致性 / 流程AI存档）
- 修复状态：⬜ 待修 ｜ ✅ 已修 ｜ ⏭️ 跳过（设计取舍）

## 一、严重问题

| ID | 位置 | 问题 | 状态 |
|----|------|------|------|
| S1 | `js/systems/economy.js:150-158` + `js/systems/eventSystem.js:343-347` | 玩家事件在生成的同一回合内被 `autoResolveAllPending()` 自动结算，玩家从未真正做过选择；事件页红点、`resolvePlayerEvent`、教程第 9 步全部形同虚设；花钱事件自动扣钱，历史事件永远走第一分支 | ✅ |
| S2 | `js/core/battle.js:72` + `js/ui/tabs/military.js:230-235` | 围城战术非决胜回合 `armyBattle` 返回 `report:null`，`doArmyAttack` 直接 `showBattleReport(null)` 抛 TypeError，界面卡死不刷新 | ✅ |
| S3 | `js/systems/economy.js:98-109` | 军团粮耗在饥荒判定之后才扣除，欠粮下回合被 `f.food=0` 勾销，衰减只打预备役；预备役保持 0 即可永久白嫖大军维持费 | ✅ |
| S4 | `js/config/events.js:66,211` + `js/systems/eventSystem.js:125` | 投诚/离间/三顾茅庐转移武将时不调 `removeGeneralFromArmies` 清原军团，产生"幽灵武将"：旧主军团仍享受其属性，新主永远卡死无法任用 | ✅ |
| S5 | `js/systems/eventSystem.js:148-156` | 「大意失荆州」易主时不调 `disbandArmiesAt` 遣散守方军团，刘备军团变孙权城内幽灵军团 | ✅ |
| S6 | `js/systems/save.js:236-237` | 读档后已穿戴装备被重置 `owned=false`，重新进入商店/掉落池可重复获得（README 称已修复，实际方向写反） | ✅ |
| S7 | `js/systems/save.js:143-208` | `deserializeState` 首行即 `setState(data)` 后校验，坏存档虽提示失败但全局 state 已被残破对象替换，当前对局被污染 | ✅ |

## 二、中等问题

| ID | 位置 | 问题 | 状态 |
|----|------|------|------|
| M1 | `js/config/events.js:294,303,312,321` + `js/systems/eventSystem.js:96-146` | 历史事件一次性标记只写在选项 effect 里；S1 修复后事件跨回合挂起，未处理期间每月重复入队、效果叠加 | ✅ |
| M2 | `js/core/battle.js:116,148,150` | 守方武将技能（武圣/奇袭/暴怒/咆哮/神算）与部分羁绊乘区（攻方 moraleMul/defMul、守方 atkMul/forceMul）不进攻防公式，配置静默无效 | ✅ |
| M3 | `js/core/battle.js:177-179` | 攻城胜利 `garrison=floor(survivors/2)` 凭空造兵，军团幸存兵不扣，每次攻克白赚一半兵力（AI 同享） | ✅ |
| M4 | `js/core/battle.js:189-192` | 火攻"守军额外损失"在驻军结算后执行，实际砍自己驻军；"城防下降"从未实现，火攻被正面强攻全面碾压 | ✅ |
| M5 | `js/core/battle.js:173` | 任何攻方（含 AI vs AI）胜利都 `stats.wins++`，成就「百战之师」、任务「连战连捷」可被 AI 互打刷出 | ✅ |
| M6 | `js/core/battle.js:196` + `js/systems/ai.js:217` | AI 攻城胜利也触发 `awardRandomEquipment`，装备 `owned=true` 从池中消失，玩家可缴获装备被动枯竭 | ✅ |
| M7 | `js/systems/ai.js:217` | AI 进攻玩家城池时 `armyBattle` 返回值被丢弃，玩家城被打无战报无特效 | ✅ |
| M8 | `js/systems/ai.js:199-220` | AI 多军团攻同一目标不复核归属：第一支攻下后第二支仍攻该城，自我宣战并遣散己方驻军军团 | ✅ |
| M9 | `js/systems/eventSystem.js:158-168` + `js/systems/gameEnd.js:5-19` | 势力灭亡（白门楼/通用路径）后残余武将不转 `free`，永久不可获得，「英雄美人」「河北双雄」等羁绊实际不可达 | ✅ |
| M10 | `js/data/generals.js:102-106` + `js/systems/eventSystem.js:104-114` | 黄巾 5 将初始归属悬空的 `huangjin` 势力（事件触发前既不可寻访也不在任何势力），黄巾灭亡后同样永久冻结 | ✅ |
| M11 | `js/systems/eventSystem.js:237,32-53` | 事件链进度全局共享且每回合按所有存活势力逐个推进：两步链当月走完，后续事件落在未触发前置的势力头上，且整局只能触发一次 | ✅ |
| M12 | `js/config/events.js:13,221,229,241,254,275,285` 等 + `js/systems/eventSystem.js:202-233` | 事件把 `city.food`/`city.money`（每回合基础产出）当库存永久加减；正向事件每势力每月必发，城市产出逐年无限膨胀 | ✅ |
| M13 | `js/ui/tabs/internal.js:76-79` | 开垦/商业 200 金换永久产出，无次数限制无等级上限，经济数回合后失控 | ✅ |
| M14 | `js/config/policies.js:4` + `js/systems/economy.js:61-66` | 仁政政策"金钱产出+10%"从未实现，只有衰减减半生效 | ✅ |
| M15 | `js/ui/tabs/internal.js:111,58` + `js/systems/ai.js:99` | 城防科技每级 `c.defense+=0.1` 与 `defBonus` 双重生效（实际 +0.2/级）；面板显示公式漏 `fortBonus` 与实战不符 | ✅ |
| M16 | `js/systems/economy.js:95` + `js/ui/tabs/internal.js:80-83` | 预备役超限被每回合静默截断（无日志），招兵 UI 无上限校验，花钱粮买的兵无声蒸发 | ✅ |
| M17 | `js/config/quests.js:13,20` + `js/systems/achievements.js:7` | 玩家开局即有 5 城，「初占城池」「五城之主」「初出茅庐」开局自动完成白拿奖励 | ✅ |
| M18 | `js/systems/eventSystem.js:179-187` | 「三国归晋」y20-25 每月 20% 判定几乎必触发，无视玩家局势直接判负；日志"司马氏篡曹操"拼接错误 | ✅ |
| M19 | `js/systems/tutorial.js:51-55` | 教程正常走完不落盘（只有"跳过"才写 `tutorial_seen`），认真看完的玩家每次刷新重看教程 | ✅ |
| M20 | `js/ui/renderer.js:21` + `js/app.js:26-29` | 游戏结束后点「重新开始」只重置状态不渲染，画面停在结局页无反应 | ✅ |
| M21 | `js/systems/ai.js:127-131` | AI 分兵进各城守军不检查 `garrisonCap`，长局龟缩 AI 守军无限膨胀，可能事实上无法统一 | ✅ |

## 三、轻微问题

| ID | 位置 | 问题 | 状态 |
|----|------|------|------|
| L1 | `js/data/cities.js` | 邻接表 3 处单向不对称：荆州→江夏、荆州→武关、安定→长安 反向缺失，长安永远不能攻安定 | ✅ |
| L2 | `js/systems/ai.js:50` | AI 阵型 id `'changsheng'` 拼写错误（配置为 `'changshe'`），长蛇阵静默回退鱼鳞阵 | ✅ |
| L3 | `js/core/battle.js:292` | 装备掉落权重 `weights=it.rarity`，越稀有掉得越多 | ✅ |
| L4 | `js/core/battle.js:378` | 战前估算 `estimateBattle` 漏算城墙建筑加成，预览胜率系统性偏高 | ✅ |
| L5 | `js/systems/eventSystem.js:170-177` | 五丈原只置受伤标记不移出军团，诸葛亮照常作战；99 个月后还会"伤愈复出"与星落秋风矛盾 | ✅ |
| L6 | `js/systems/gameEnd.js:21-40` + `js/ui/tabs/military.js` | 胜利口径 85% 城与"消灭所有势力"文案不符；攻下 85% 城不当场判胜；`checkVictory` 会覆盖事件结局；判负第二条件为死代码且不含预备役 | ✅ |
| L7 | `js/systems/eventSystem.js:104-143` + `js/data/cities.js:26-27` | 史实问题：张角 184 年已死却在 y2-4 领导黄巾起义；事件窗口重叠使三顾可早于官渡、南中可早于夷陵；寿春/汝南归孙权任何时间线都说不通 | ✅ |
| L8 | `js/config/events.js:295,35,313` + `js/systems/eventSystem.js:93` | 文本与效果不符 ×4：煮酒论英雄"声望"实为士气；merchant 触发条件 100 与交易选项 200 不对齐；夷陵"重修旧好"关系只设 20；董卓"洛阳焚毁"无任何实际效果 | ✅ |
| L9 | `js/core/battle.js:31,183` | 围城进度不校验 attackerId 可被第三方继承；普通攻城破城不清第三方残留 siegeProgress | ✅ |
| L10 | `js/core/battle.js:44,66` | 围城分支无视 `tactic.loss=0.7` 死配置；围城胜利战报 `defLosses` 报的是剩余守军；围城破城不安置驻军可能留 0 守军空城 | ✅ |
| L11 | `js/systems/save.js:65,132,194,72-75` | 存档处理不一致 ×3：本地读档不看 `_version` 而导入严格拒绝（自相矛盾）；旧档 `eventIdSeq` 重算可能与现存事件 id 冲突；侧栏导入加密存档成功后不刷新界面 | ✅ |
| L12 | `js/config/eliteTroops.js:21` | 虎豹骑描述"攻击+20%"与实际 `atk:1.25`（+25%）不符 | ✅ |
| L13 | `js/systems/ai.js:120` | AI 外交结盟 `f.gold-=500` 前不查余额，AI 金钱可为负 | ✅ |
| L14 | `js/systems/ai.js:199-220` | AI 同一军团同回合可连续攻击多个目标，攻占首城后军团已移动，后续攻击违反相邻规则 | ✅ |
| L15 | `js/systems/economy.js:73` | 夏季免费守军不检查守军上限；`Math.floor(20*(1+0.2))` 硬编码魔法数 | ✅ |
| L16 | `js/ui/tabs/internal.js:82-83` | 0 城时 `recruitMul=0`，招兵照扣 150 金 200 粮却 +0 兵 | ✅ |
| L17 | `js/ui/tabs/internal.js:112-117` | 旧版兼容分支 `doInternal('tech')` 先扣 500 再递归扣折扣价，双重收费（当前无入口的死代码） | ✅ |
| L18 | `js/core/battle.js:134,367` | 战斗公式 `army.infantry/total` 在 `total=0` 时除零 NaN（当前不可达但无保护） | ✅ |
| L19 | `js/systems/save.js:150` | 读档重建 huangjin 势力缺 `eliminated` 字段，与创建时不一致 | ✅ |
| L20 | `js/data/generals.js:40` | "黄巾军武将"注释错位在"蜀汉补充"段前，且描述与实现不符 | ✅ |

## 四、确认无问题（已核查，无需修复）

- 中文加密存档导出（`TextEncoder` 字节流，`btoa` 中文问题修复彻底）
- 事件选项 `condition` 函数读档后按 `defId+idx` 回查兜底生效
- 政策对象 `state.policy` vs `player().policy` 问题修复彻底，无残留错误读取
- 旧 `battle()` 双轨逻辑已清干净，全库仅 `armyBattle` 一个入口
- 武将/城池/势力名称引用全部对得上，无悬空引用
- 兵种克制方向、阵型加成对象、军团组建校验（0 兵/超编/武将重复/精锐上限）均正确
- 金钱粮草不会出现 NaN，不会出现"什么都不做就死局"的数值死锁

## 五、设计取舍（不修复，仅记录）

| ID | 位置 | 说明 |
|----|------|------|
| N1 | `js/config/quests.js:68-73` | 「诛灭吕布」可被白门楼事件代劳完成——要求玩家参与需额外追踪最后一击，改动大于收益，保留现状 |
| N2 | `js/config/events.js` | 随机事件无冷却可反复触发——属设计选择而非 bug |
| N3 | `js/core/battle.js` | 守方武将无受伤/被俘机制——未实现特性而非 bug，可作为后续功能方向 |

## 六、修复记录

（按修复完成顺序逐项追加）


### 2026-07-19 修复批次（AI 组，`js/systems/ai.js`）

- ✅ M7：`aiArmyAttack` 接收 `armyBattle` 返回值，玩家为守方且有战报时弹 `showBattleFx`/`playSound`/`showBattleReport`（ai.js:227-234）。
- ✅ M8：攻击循环内攻前复核 `atk.to.owner===f.id` 则跳过，杜绝攻自己城/自我宣战/误遣散己方驻军（ai.js:222-223）。
- ✅ M21：AI 分兵套用与玩家同款 `garrisonCap`（6000+特性+建筑），装不下的留预备役（ai.js:130-138）。
- ✅ L2：`'changsheng'` → `'changshe'`，长蛇阵不再回退鱼鳞（ai.js:53）。
- ✅ L13：AI 结盟扣费前查 `f.gold>=500`（ai.js:119）。
- ✅ L14：攻下一城即 `break`，一军团一回合最多攻一城（ai.js:235-236）。
- ✅ M15（AI 侧）：删除 tech_fort 对 `c.defense` 的直接累加，只保留 `defBonus`（ai.js:102）。

### 2026-07-19 修复批次（存档流程组，`js/systems/save.js`、`js/app.js`、`js/systems/tutorial.js`）

- ✅ S6：读档重建装备引用时 `live.owned = false` → `true`，已穿戴装备不再回流商店/掉落池（save.js:237）。
- ✅ S7：`deserializeState` 改为先在传入对象上完成全部迁移/校验，末尾才 `setState`；中途抛错不再污染当前对局（save.js:144-146,245-247）。
- ✅ M19：教程走完最后一步改为调用 `skipTutorial()` 同一收尾（置 `tutorial=false`、写 `tutorial_seen`、自动保存）（tutorial.js:53-54）。
- ✅ M20：`appActions.initGame` 补 `renderAll()`，并按启动逻辑处理教程弹层（app.js:26-33）。
- ✅ L11a：导入加密存档删除 `_version` 硬拒绝，与本地读档一致走 `deserializeState` 迁移（save.js:65）。
- ✅ L11b：旧档 `eventIdSeq` 改为现存事件最大 id + 1（save.js:194-195）。
- ✅ L11c：侧栏导入加密存档成功后触发 `renderAll()`（save.js:72-76 + app.js:75）。
- ✅ L19：读档重建 huangjin 补 `eliminated:false` 字段（save.js:151）。

### 2026-07-19 修复批次（内政数据组，`internal.js`/`gameEnd.js`/`quests.js`/`achievements.js`/`cities.js`/`generals.js`/`eliteTroops.js`/`state.js`）

- ✅ M13：开垦/商业加每城开发等级上限 `DEV_MAX=10`，达上限不扣钱并提示、按钮禁用（internal.js）。
- ✅ M15（玩家侧）：tech_fort 删除对 `c.defense` 的双重累加；城池产出表城防显示公式补 `fortBonus`，与实战对齐（internal.js:111,58）。
- ✅ M16：招兵前校验预备役上限（城数×3000），超限按钮禁用/拦截不扣钱粮（internal.js:80-83）。
- ✅ M17：`initState` 新增 `startCityCount`；`first_city`/`first_blood` 改为"当前城数 > 初始城数"，`own_5_cities` 改为"≥初始+5"；旧档缺字段按 0 兜底（state.js、quests.js、achievements.js）。
- ✅ M9（通用路径）：`checkEliminations` 在势力灭亡时把残余武将转 `'free'`、忠诚置 60，可被寻访（gameEnd.js）。
- ✅ M10（数据侧）：黄巾 5 将初始 `faction` 改为 `'free'`（generals.js）。
- ✅ L1：邻接补齐——江夏/武关 +荆州，长安 +安定（cities.js）。
- ✅ L6：`checkVictory` 开头加 `gameOver` 守卫；删除死代码判负分支并修正为"城全丢且预备役为 0 且无军团"；胜利口径改为"占 85% 城 或 所有非玩家势力均消灭"（gameEnd.js）。
- ✅ L7（数据侧）：寿春、汝南 `owner` 改为 `null` 无主（cities.js）。
- ✅ L12：虎豹骑描述改为"攻击+25%"（eliteTroops.js:21）。
- ✅ L16：0 城时招兵禁用/拦截，不再白扣钱粮（internal.js）。
- ✅ L17：删除旧版 `doInternal('tech')` 分支先扣的 500 金双重收费（internal.js）。
- ✅ L20：删除错位黄巾注释并修正措辞（generals.js:40,101）。

### 2026-07-19 修复批次（战斗组，`js/core/battle.js`、`js/ui/tabs/military.js`）

- ✅ S2：`doArmyAttack` 改为 `result && result.playerInvolved && result.report` 才弹特效/战报，围城持续回合不再抛 TypeError（military.js）。
- ✅ M2：攻击公式接入 `moraleMul/defMul` 乘区、防御公式接入守方 `forceMul/atkMul`，守方技能与攻防两侧羁绊不再空转；estimateBattle 镜像公式同步（battle.js）。
- ✅ M3：攻城驻军改为 `applyArmyLosses(army, total, losses + garrison)` 从军团兵力拨付，不再凭空造兵（battle.js）。
- ✅ M4：火攻守军额外杀伤前移到城破结算前对原守军生效；补 `targetCity.defense` 实际削减（battle.js）。
- ✅ M5：`stats.wins++` 仅玩家为攻方时累加（battle.js:173）。
- ✅ M6：`awardRandomEquipment` 仅玩家为攻方胜利时触发（battle.js）。
- ✅ L3：掉落权重改为 `5 - rarity`，越稀有掉越少（battle.js:292）。
- ✅ L4：estimateBattle 防御公式补 `buildingDefBonus`（battle.js:378）。
- ✅ L9：围城进度按 attackerId 校验重建，破城清空第三方残留（battle.js:31,183）。
- ✅ L10：围城损失乘 `tactic.loss`；战报 defLosses 按战前守军算真实损失；围城破城按普通胜利安置驻军（battle.js:44,66）。
- ✅ L18：atkShare 加 `(total || 1)` 除零兜底（battle.js:141,380）。
- ✅ L6（军事侧）：玩家胜利后立即 `checkVictory()`，占城达标当场判胜（military.js）。

### 2026-07-19 修复批次（事件配置组，`js/config/events.js`）

- ✅ S4（events.js 侧）：defector、general_defects 两处"接纳"分支改势力前先 `removeGeneralFromArmies`（events.js:69,214）。
- ✅ M12：22 处对 `city.food`/`city.money` 基础产出的直接修改全部改为对势力库存的一次性增减（数值 ×10 换算，负向保留 `Math.max(0,...)`），文件顶部统一注释换算约定。
- ✅ L8（events.js 侧）：煮酒文本改"士气提升"；merchant 触发条件对齐 gold≥200；夷陵"以和为贵"关系 20→60。

### 2026-07-19 修复批次（事件/经济核心，`js/systems/economy.js`、`js/systems/eventSystem.js`）

- ✅ S1：`autoResolveAllPending()` 从 `endTurnCleanup` 移到 `nextTurn` 开头——只结算上一回合遗留事件，本回合新事件挂起等待玩家处理，事件选择玩法恢复（economy.js）。
- ✅ S3：军团粮耗 `armyFoodNeed` 并入 `consumeUpkeep` 统一参与饥荒判定；新增 `applyFamineDecay` 按"预备役→守军→军团（按比例）"减员，白嫖维持费堵死（economy.js）。
- ✅ S4（三顾茅庐）：改势力前 `removeGeneralFromArmies('诸葛亮')`（eventSystem.js）。
- ✅ S5：「大意失荆州」易主前 `disbandArmiesAt('荆州','liu')`（eventSystem.js）。
- ✅ M1：`tryTriggerHistoricalEvent(evId, flagName)` 成功入队即置一次性标记，4 处调用点（煮酒/讨董/夷陵/南中）传入标记名，挂起期间不再重复入队（eventSystem.js）。
- ✅ M9（白门楼）：吕布势力灭亡时残余武将转 `'free'`、忠诚 60，可被寻访（eventSystem.js）。
- ✅ M10（事件侧）：黄巾事件触发时把在野的张宝/张梁/管亥/裴元绍拨归 huangjin（eventSystem.js）。
- ✅ M11：事件链进度改为按势力维度 `eventChains[factionId][chainId]`，各势力独立推进，同一势力同一链只启动一次（eventSystem.js）。
- ✅ M12（频率侧）：季节事件改为每季首月（3/6/9/12 月）才触发（eventSystem.js）。
- ✅ M14：经济结算补 `renzheng` 分支 `cityMoney *= 1.1`（economy.js）。
- ✅ M16（日志侧）：预备役截断时输出"预备役超出承载上限，裁减 N 兵"日志（economy.js）。
- ✅ M18：「三国归晋」加"司马氏势力城数 ≥ 玩家城数"门槛；文案改"司马氏篡魏"（eventSystem.js）。
- ✅ L5：五丈原移出军团 + `injuredTurns=9999`，不再出战也不再"伤愈复出"（eventSystem.js）。
- ✅ L7（事件侧）：三顾窗口 y3-5→y9-11（排在白门楼/官渡之后）、南中 y10-18→y17-19（排在夷陵之后）；黄巾事件改名"黄巾余党复起"、领袖换管亥，消除张角死而复生（eventSystem.js）。
- ✅ L8（董卓）：洛阳焚毁落到实处——洛阳士气 -30（下限 20）、守军减半（eventSystem.js）。
- ✅ L15：夏季免费守军套用 `garrisonCap` 上限，魔法数提取为 `SUMMER_DRAFT_TROOPS` 常量（economy.js）。

## 七、验证与收尾（2026-07-19）

**修复范围**：严重 7 项、中等 21 项、轻微 20 项，共 48 项全部修复完成；设计取舍 3 项（N1-N3）按记录保留现状。改动涉及 17 个 JS 文件（+288/-150 行）。

**验证结果**：

- 语法检查：全部 43 个 JS 文件 `node --check`（ESM 模式）通过。
- 改动审查：全部 `git diff` 逐文件人工复核通过，重点核查战斗公式、存档迁移重构（`deserializeState` 体内无 `getState()` 残留调用）、UI 与 AI 的 import 无循环依赖。
- 浏览器冒烟（Playwright + 本地静态服务器）：
  - 页面加载无任何 JS 错误（仅 favicon 404，与代码无关）；
  - 教程浮层正常、可跳过；
  - 连续结束 3 回合（第 1 回合 → 第 4 回合），经济结算 / AI 行动 / 事件触发全链路无异常；
  - 事件页出现「待处理事件」——S1 修复生效，玩家事件真正挂起等待处理而非被系统代选。
- 未覆盖：完整对局长测（数十回合的数值演进、存档跨版本实机导入）未逐项实机跑过，如后续发现平衡性问题请在本文档追加记录。

**注意**：本次修复全部作用于模块化版本（`index.html` + `js/`）。旧版单文件入口 `sanguo_slg.html` 保持冻结未动，仍是修复前的旧逻辑，仅作离线兼容保留。
