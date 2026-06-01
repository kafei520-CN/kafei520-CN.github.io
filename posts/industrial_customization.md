# SimuKraft 工业系统自定义说明

本文面向整合包开发者，说明如何通过外部 JSON 定义工业建筑的职业、配方、容器、站位点和 NPC 工作流程。

## 文件位置

工业 JSON 放在：

```text
simukraftbuilding/industry/
```

推荐让工业 JSON 与建筑 `.sk` 文件同名：

```text
mill.sk
mill.json
```

也可以在 `.sk` 文件中显式指定工业配置：

```text
industrial:custom_mill.json
```

加载优先级：

1. `.sk` 里的 `industrial:<file>.json`
2. 与 `.sk` 同名的 JSON
3. 模组内置的备用 JSON

## 核心原则

工业流程完全由 JSON 编排，代码只负责安全执行。

`jobType` 和 `jobName` 不需要写进语言文件，也不要在代码里硬编码。系统会从工业 JSON 读取：

```json
{
  "jobType": "miller",
  "jobName": "磨坊工人"
}
```

`jobType` 用作数据库里的细分职业键，建议使用稳定的小写下划线命名，例如 `brick_maker`、`cow_farmer`。  
`jobName` 是界面上显示给玩家看的职业名称，可以直接写中文。

兼容键名：

```text
jobType / JobType / job_type
jobName / JobName / job_name
```

## 坐标规则

工业 JSON 里的坐标是结构坐标，不是世界坐标。

结构坐标指建筑 `.sk` 原始结构里的局部坐标：

```json
{ "pos": [4, 1, 6] }
```

建筑放置到世界后，系统会根据建筑朝向自动旋转并转换成世界坐标。所有点位和容器坐标必须落在已建成建筑范围内，否则会被忽略。

支持单点和数组：

```json
{
  "pos": [4, 1, 6]
}
```

```json
{
  "positions": [
    [2, 1, 4],
    [3, 1, 4]
  ]
}
```

数组最多读取 64 个坐标。

## 顶层字段

```json
{
  "id": "simukraft:mill",
  "name": "磨坊",
  "jobType": "miller",
  "jobName": "磨坊工人",
  "heldItem": "minecraft:wheat",
  "points": {},
  "containers": {},
  "recipes": [],
  "spawnEntity": {}
}
```

字段说明：

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `id` | 建议 | 工业定义 ID，建议唯一 |
| `name` | 是 | 工业流程名称，显示在工业控制箱 |
| `jobType` | 是 | 细分职业键，写入市民数据库 |
| `jobName` | 是 | 玩家看到的职业名 |
| `heldItem` | 否 | 默认手持物，配方或步骤可覆盖 |
| `points` | 是 | NPC 站位点、朝向点、机器点 |
| `containers` | 是 | 输入和输出容器位置 |
| `recipes` | 是 | 可选择的工业配方 |
| `spawnEntity` | 否 | 首次运行时生成动物等实体 |

## points 工作点

`points` 用来定义 NPC 移动和朝向目标。

```json
{
  "points": {
    "stand": {
      "type": "structure_pos",
      "positions": [[4, 1, 5], [5, 1, 5]],
      "select": "nearest"
    },
    "machine": {
      "type": "structure_pos",
      "pos": [4, 1, 6]
    }
  }
}
```

字段说明：

| 字段 | 说明 |
| --- | --- |
| `type` | 当前支持 `structure_pos` |
| `pos` | 单个结构坐标 |
| `positions` | 多个结构坐标 |
| `select` | `nearest` 或 `ordered` |

`nearest` 会选择距离 NPC 最近的可用点。  
`ordered` 会固定使用数组中的第一个点。

## containers 容器

`containers` 用来定义输入箱和输出箱。

```json
{
  "containers": {
    "input": {
      "type": "structure_pos",
      "positions": [[2, 1, 4], [3, 1, 4]]
    },
    "output": {
      "type": "structure_pos",
      "positions": [[6, 1, 4], [7, 1, 4]]
    }
  }
}
```

规则：

- 当前只支持 `structure_pos`。
- 容器必须是可访问的箱子、桶或兼容容器。
- 多个输入容器会按数组顺序统计和消耗。
- 多个输出容器会按数组顺序尝试插入。
- 输出空间会在消耗输入前检查，空间不足不会吞材料。
- 不会扫描 3x3 范围，只访问 JSON 精确指定的坐标。

## recipes 配方

每个工业 JSON 可以有多个配方，玩家在工业控制箱中选择。

```json
{
  "id": "wheat2cookie",
  "name": "曲奇生产",
  "heldItem": "minecraft:wheat",
  "inputs": [
    { "item": "minecraft:wheat", "count": 3 },
    { "item": "minecraft:sugar", "count": 1 }
  ],
  "outputs": [
    {
      "item": "minecraft:cookie",
      "baseAmount": 1,
      "randomRange": 2,
      "probability": 1.0
    }
  ],
  "steps": []
}
```

配方字段：

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `id` | 是 | 配方 ID |
| `name` | 是 | 配方显示名称 |
| `heldItem` | 否 | 本配方默认手持物，优先级高于顶层 `heldItem` |
| `inputs` | 是 | 输入材料 |
| `outputs` | 是 | 输出产物 |
| `steps` | 是 | NPC 执行步骤 |

### inputs

```json
{ "item": "minecraft:dirt", "count": 4 }
```

支持字段：

| 字段 | 说明 |
| --- | --- |
| `item` | 物品 ID |
| `count` / `amount` | 数量，默认 1 |
| `consume` | 是否消耗，默认 `true` |
| `potion` | 药水类型，用于区分水瓶等药水物品 |

水瓶示例：

```json
{
  "item": "minecraft:potion",
  "potion": "minecraft:water",
  "count": 1
}
```

### outputs

```json
{
  "item": "minecraft:packed_mud",
  "baseAmount": 1,
  "randomRange": 0,
  "probability": 1.0,
  "ignoreMultiplier": true
}
```

支持字段：

| 字段 | 说明 |
| --- | --- |
| `item` | 物品 ID |
| `potion` | 药水类型 |
| `baseAmount` / `count` | 基础产量，默认 1 |
| `randomRange` | 额外随机数量范围，实际为 `0` 到 `randomRange - 1` |
| `probability` | 产出概率，范围 `0.0` 到 `1.0` |
| `ignoreMultiplier` | 是否忽略职业等级产量倍率，默认 `false` |

工业员工等级会提高产量倍率：每高 1 级约增加 5%。  
如果产物必须固定数量，例如空瓶返还，建议设置：

```json
{ "ignoreMultiplier": true }
```

## steps 工作步骤

步骤按数组顺序执行。最后一步完成后会回到第一步，继续循环生产。

支持动作：

| type | 作用 |
| --- | --- |
| `set_held_item` | 设置 NPC 手持物 |
| `move_to` | 移动到工作点 |
| `look_at` | 面朝某个点 |
| `require_inputs` | 检查输入材料 |
| `require_output_space` | 检查输出空间 |
| `use_item` | 使用手持物，等待指定 tick |
| `craft_recipe` | 消耗输入并写入输出 |
| `set_status` | 设置工业箱状态文本 |

### set_held_item

```json
{
  "type": "set_held_item",
  "item": "minecraft:wheat"
}
```

如果不写 `item`，会使用配方 `heldItem`，再回退到顶层 `heldItem`。

### move_to

```json
{
  "type": "move_to",
  "point": "stand",
  "range": 1.2
}
```

NPC 会走到 `points.stand`，距离目标小于 `range` 后进入下一步。

### look_at

```json
{
  "type": "look_at",
  "point": "machine"
}
```

NPC 会面朝指定工作点。

### require_inputs

```json
{
  "type": "require_inputs",
  "container": "input"
}
```

检查配方 `inputs` 是否足够。材料不足时暂停重试，不会消耗材料。

也可以写：

```json
{
  "type": "require_inputs",
  "input": "input"
}
```

优先级：`container` > `input` > 默认 `input`。

### require_output_space

```json
{
  "type": "require_output_space",
  "container": "output"
}
```

检查输出容器是否有足够空间。空间不足时暂停重试，不会消耗材料。

也可以写：

```json
{
  "type": "require_output_space",
  "output": "output"
}
```

优先级：`container` > `output` > 默认 `output`。

### use_item

```json
{
  "type": "use_item",
  "ticks": 80,
  "swing": true
}
```

NPC 会等待指定 tick。  
`swing: true` 时只在开始使用时挥手一次，表现更接近原版玩家使用工具。

### craft_recipe

```json
{
  "type": "craft_recipe",
  "input": "input",
  "output": "output"
}
```

执行真正的生产：

1. 再次检查输入材料。
2. 预生成输出列表并检查空间。
3. 消耗输入材料。
4. 插入输出物品。
5. 增加工业职业经验。

如果输入或输出失败，会显示阻塞状态并等待重试。

### set_status

```json
{
  "type": "set_status",
  "statusKey": "gui.simukraft.industrial.status.running",
  "statusText": "正在加工"
}
```

`statusKey` 可以使用已有语言 key。  
`statusText` 会直接拼在状态后面。

## spawnEntity 首次生成实体

适合动物农场等工业建筑。

```json
{
  "spawnEntity": {
    "enabled": true,
    "type": "minecraft:cow",
    "count": 4
  }
}
```

规则：

- 只在工业箱首次运行时执行一次。
- 如果建筑范围附近已有同类型实体，不会重复刷。
- 生成点会从工业控制箱附近随机挑选，必须在建筑范围内且位置可站立。
- 不会因为动物流失而无限补刷。

## 完整最小示例

```json
{
  "id": "simukraft:mill",
  "name": "磨坊",
  "jobType": "miller",
  "jobName": "磨坊工人",
  "heldItem": "minecraft:wheat",
  "points": {
    "stand": {
      "type": "structure_pos",
      "positions": [[4, 1, 5], [5, 1, 5]],
      "select": "nearest"
    },
    "machine": {
      "type": "structure_pos",
      "pos": [4, 1, 6]
    }
  },
  "containers": {
    "input": {
      "type": "structure_pos",
      "positions": [[2, 1, 4], [3, 1, 4]]
    },
    "output": {
      "type": "structure_pos",
      "positions": [[6, 1, 4], [7, 1, 4]]
    }
  },
  "recipes": [
    {
      "id": "wheat2cookie",
      "name": "曲奇生产",
      "inputs": [
        { "item": "minecraft:wheat", "count": 3 },
        { "item": "minecraft:sugar", "count": 1 }
      ],
      "outputs": [
        { "item": "minecraft:cookie", "baseAmount": 1, "randomRange": 2, "probability": 1.0 }
      ],
      "steps": [
        { "type": "require_inputs", "container": "input" },
        { "type": "require_output_space", "container": "output" },
        { "type": "set_held_item", "item": "minecraft:wheat" },
        { "type": "move_to", "point": "stand", "range": 1.2 },
        { "type": "look_at", "point": "machine" },
        { "type": "use_item", "ticks": 80, "swing": true },
        { "type": "craft_recipe", "input": "input", "output": "output" }
      ]
    }
  ]
}
```

## 调试建议

- 在工业控制箱界面打开“显示边界”，检查建筑范围、容器点、站位点和机器点是否正确。
- 如果界面提示“工业流程配置无效”，优先检查 JSON 格式、`recipes` 是否为空、点位是否缺失。
- 如果 NPC 一直提示缺少输入材料，检查容器坐标是否是结构坐标，以及箱子里物品 ID 是否正确。
- 如果输出容器满，系统不会消耗输入；先清理输出箱再运行。
- 如果旋转建筑后点位错位，说明 JSON 坐标不是原始结构坐标，需要回到 `.sk` 原始局部坐标重新标点。
- 修改 JSON 后重新进入世界或重新打开相关界面，确保最新配置被加载。

