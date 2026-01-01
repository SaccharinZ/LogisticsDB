# 智慧物流管理系统 API 文档

## 1. 接口概览

### 基础信息

- **BASE_URL**: `http://127.0.0.1:8080/api`
- **响应格式**: JSON
- **数据库**: SQL Server (LogisticsDB)

---

## 2. 接口详情

### 2.1 基础信息管理

#### 2.1.1 司机管理

**接口名称**: 司机信息录入
**请求方式**: POST
**接口地址**: `/driver/add`

**请求参数 (JSON)**:

```json
{
  "driverId": "D003", // 工号（必填，长度≤10）
  "driverName": "王五", // 姓名（必填）
  "licenseLevel": "B", // 驾照等级：A/B/C（必填）
  "contact": "13600136000", // 联系方式（必填，手机号格式）
  "hireDate": "2023-05-10", // 入职日期（必填，yyyy-MM-dd）
  "fleetId": "F001" // 所属车队ID（必填）
}
```

**响应示例 (成功)**:

```json
{
  "code": 200,
  "message": "司机信息添加成功",
  "data": null
}
```

**响应示例 (失败)**:

```json
{
  "code": 400,
  "message": "驾照等级必须为A、B、C之一",
  "data": null
}
```

**前端校验规则**:

1. 所有字段非空
2. 驾照等级：只能为 A、B、C
3. 联系方式：11位数字，符合手机号格式
4. 工号：长度≤10，唯一性校验

---

#### 2.1.2 车辆管理

**接口名称**: 车辆信息录入
**请求方式**: POST
**接口地址**: `/vehicle/add`

**请求参数 (JSON)**:

```json
{
  "licensePlate": "沪B56789", // 车牌号（必填，正则校验）
  "maxLoad": 8.0, // 最大载重（必填，>0）
  "maxVolume": 15.0, // 最大容积（必填，>0）
  "currentStatus": "空闲", // 当前状态：空闲/运输中/维修中/异常
  "fleetId": "F001", // 所属车队ID（必填）
  "buyDate": "2023-06-01" // 购买日期（必填）
}
```

**响应示例**:

```json
{
  "code": 200,
  "message": "车辆信息添加成功",
  "data": null
}
```

**前端校验规则**:

1. 所有字段非空
2. 车牌号：符合车牌号正则表达式（如：沪A12345）
3. 最大载重/容积：大于0的数字
4. 当前状态：枚举值校验

---

### 2.2 运单分配

**接口名称**: 创建运单
**请求方式**: POST
**接口地址**: `/order/create`

**请求参数 (JSON)**:

```json
{
  "orderId": "ORD202512003", // 运单号（必填）
  "goodsWeight": 3.5, // 货物重量（必填，>0）
  "goodsVolume": 6.0, // 货物体积（必填，>0）
  "destination": "苏州市工业园区XX路", // 目的地（必填）
  "licensePlate": "沪A12345" // 车牌号（必填）
}
```

**响应示例 (成功)**:

```json
{
  "code": 200,
  "message": "运单创建成功",
  "data": {
    "orderId": "ORD202512003",
    "createTime": "2025-12-25 10:30:00"
  }
}
```

**响应示例 (超载失败)**:

```json
{
  "code": 500,
  "message": "超出车辆最大载重，运单分配失败",
  "data": null
}
```

**接口说明**:

1. 前端需先调用 `/vehicle/available` 获取空闲且载重足够的车辆列表
2. 选择车辆时需实时计算：当前车辆已分配重量 + 新运单重量 ≤ 车辆最大载重
3. 后端触发器会进行最终校验，超载时会抛出异常

---

**辅助接口**: 获取可用车辆列表
**请求方式**: GET
**接口地址**: `/vehicle/available`

**请求参数**:

```
?weight=3.5&volume=6.0&dcId=DC001
```

**响应示例**:

```json
{
  "code": 200,
  "message": "成功",
  "data": [
    {
      "licensePlate": "沪A12345",
      "maxLoad": 5.0,
      "maxVolume": 10.0,
      "currentStatus": "空闲",
      "fleetName": "华东配送车队",
      "driverName": "李四",
      "currentLoad": 2.0 // 当前已分配重量
    }
  ]
}
```

---

### 2.3 异常记录录入

**接口名称**: 异常事件录入
**请求方式**: POST
**接口地址**: `/abnormal-event/add`

**请求参数 (JSON)**:

```json
{
  "eventId": "EV202512002", // 事件ID（必填）
  "licensePlate": "沪A12345", // 车牌号（必填）
  "driverId": "D002", // 司机ID（必填）
  "eventType": "运输中异常", // 异常类型：运输中异常/空闲时异常
  "description": "轮胎爆裂导致延误", // 异常描述（必填）
  "fineAmount": 500.0, // 罚款金额（≥0）
  "handleStatus": "未处理" // 处理状态：已处理/未处理
}
```

**响应示例**:

```json
{
  "code": 200,
  "message": "异常事件记录成功",
  "data": {
    "eventId": "EV202512002",
    "occurTime": "2025-12-25 14:20:00"
  }
}
```

**前端校验规则**:

1. 车牌号和司机ID需关联校验
2. 罚款金额不能为负数
3. 异常类型和处理状态为枚举值

---

### 2.4 车队资源查询

**接口名称**: 查询车队负载情况
**请求方式**: GET
**接口地址**: `/fleet/load-status`

**请求参数**:

```
?dcId=DC001  // 配送中心ID
```

**响应示例**:

```json
{
  "code": 200,
  "message": "成功",
  "data": [
    {
      "fleetId": "F001",
      "fleetName": "华东配送车队",
      "vehicles": [
        {
          "licensePlate": "沪A12345",
          "currentStatus": "空闲",
          "maxLoad": 5.0,
          "currentLoad": 0.0,
          "availableLoad": 5.0,
          "driverName": "李四",
          "lastOrderTime": "2025-12-25 09:00:00"
        },
        {
          "licensePlate": "沪B56789",
          "currentStatus": "运输中",
          "maxLoad": 8.0,
          "currentLoad": 7.5,
          "availableLoad": 0.5,
          "driverName": "王五",
          "lastOrderTime": "2025-12-25 11:30:00"
        },
        {
          "licensePlate": "沪C78901",
          "currentStatus": "异常",
          "maxLoad": 6.0,
          "currentLoad": 0.0,
          "availableLoad": 0.0,
          "driverName": "赵六",
          "abnormalReason": "发动机故障"
        }
      ],
      "summary": {
        "totalVehicles": 10,
        "availableVehicles": 6,
        "busyVehicles": 3,
        "abnormalVehicles": 1
      }
    }
  ]
}
```

---

### 2.5 司机绩效追踪

**接口名称**: 查询司机绩效
**请求方式**: GET
**接口地址**: `/driver/performance`

**请求参数**:

```
?driverId=D002&startDate=2025-12-01&endDate=2025-12-25
```

**响应示例**:

```json
{
  "code": 200,
  "message": "成功",
  "data": {
    "driverInfo": {
      "driverId": "D002",
      "driverName": "李四",
      "licenseLevel": "B",
      "hireDate": "2021-02-01"
    },
    "statistics": {
      "totalOrders": 15,
      "totalWeight": 42.5,
      "totalDistance": 1250.3,
      "onTimeRate": 93.3,
      "totalAbnormalEvents": 2,
      "totalFines": 700.0
    },
    "orderDetails": [
      {
        "orderId": "ORD202512001",
        "createTime": "2025-12-01 09:00:00",
        "goodsWeight": 2.0,
        "destination": "南京市玄武区",
        "signTime": "2025-12-01 14:30:00",
        "transportStatus": "已签收"
      }
    ],
    "abnormalDetails": [
      {
        "eventId": "EV202512001",
        "occurTime": "2025-12-10 11:20:00",
        "eventType": "运输中异常",
        "description": "货物轻微破损",
        "fineAmount": 200.0,
        "handleStatus": "已处理"
      }
    ]
  }
}
```

---

### 2.6 统计报表

**接口名称**: 车队月度安全与效率报表
**请求方式**: GET
**接口地址**: `/fleet/monthly-report`

**请求参数**:

```
?fleetId=F001&year=2025&month=12
```

**响应示例**:

```json
{
  "code": 200,
  "message": "成功",
  "data": {
    "reportInfo": {
      "fleetId": "F001",
      "fleetName": "华东配送车队",
      "reportPeriod": "2025年12月",
      "generateTime": "2025-12-25 15:00:00"
    },
    "efficiencyMetrics": {
      "totalOrders": 150,
      "totalWeight": 420.5,
      "avgDeliveryTime": "3.2小时",
      "vehicleUtilizationRate": 78.5,
      "onTimeDeliveryRate": 95.2
    },
    "safetyMetrics": {
      "totalAbnormalEvents": 8,
      "totalFines": 3200.0,
      "eventDistribution": {
        "运输中异常": 5,
        "空闲时异常": 3
      },
      "handleStatus": {
        "已处理": 6,
        "未处理": 2
      },
      "severityAnalysis": {
        "轻微": 5,
        "中等": 2,
        "严重": 1
      }
    },
    "driverRanking": [
      {
        "rank": 1,
        "driverId": "D001",
        "driverName": "张三",
        "totalOrders": 35,
        "abnormalEvents": 0,
        "performanceScore": 98.5
      }
    ],
    "trendAnalysis": {
      "dailyOrders": [
        { "date": "2025-12-01", "count": 5 },
        { "date": "2025-12-02", "count": 6 }
      ],
      "weeklyEfficiency": [
        { "week": "第1周", "onTimeRate": 94.2 },
        { "week": "第2周", "onTimeRate": 96.1 }
      ]
    }
  }
}
```

---

## 3. 错误码说明

| 错误码 | 说明           | 建议处理                   |
| ------ | -------------- | -------------------------- |
| 200    | 成功           | -                          |
| 400    | 请求参数错误   | 检查请求参数格式和内容     |
| 404    | 资源不存在     | 检查路径是否正确           |
| 500    | 服务器内部错误 | 查看服务器日志，如超载错误 |
| 503    | 服务不可用     | 检查数据库连接             |

---

**文档版本**: v1.0
**最后更新**: 2026-01-01
**维护人员**: 蒋建钊
