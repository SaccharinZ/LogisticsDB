const express = require('express')
const router = express.Router()

// 导入控制器
const driverController = require('./controllers/driverController.js')
const vehicleController = require('./controllers/vehicleController.js')
const orderController = require('./controllers/orderController.js')
const abnormalController = require('./controllers/abnormalController.js')
const fleetController = require('./controllers/fleetController.js')

// 后端api路由
router.post('/driver/add', driverController.addDriver)                 // 添加司机信息
router.get('/driver/performance', driverController.getDriverPerformance) // 查询司机绩效

router.post('/vehicle/add', vehicleController.addVehicle)               // 添加车辆信息
router.get('/vehicle/available', vehicleController.getAvailableVehicles) // 获取可用车辆列表

router.post('/order/create', orderController.createOrder)               // 创建运单

router.post('/abnormal-event/add', abnormalController.addAbnormalEvent) // 添加异常事件

router.get('/fleet/load-status', fleetController.getFleetLoadStatus)    // 查询车队负载情况

router.get('/fleet/monthly-report', fleetController.getFleetMonthlyReport) // 车队月度报表

// 服务器状态检测路由
router.get('/health', (req, res) => {
    res.status(200).json({
        code: 200,
        message: '物流系统API运行正常',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    })
})

module.exports = router