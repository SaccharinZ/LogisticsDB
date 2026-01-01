const { sql, poolPromise } = require('../database.js')

/**
 * 车辆控制器
 * 处理车辆相关的业务逻辑
 */
class VehicleController {

    /**
     * 添加车辆信息
     * POST /api/vehicle/add
     */
    async addVehicle(req, res) {
        try {
            const { licensePlate, maxLoad, maxVolume, currentStatus, fleetId, buyDate } = req.body

            // 基础校验
            if (!licensePlate || !maxLoad || !maxVolume || !fleetId || !buyDate) {
                return res.status(400).json({
                    code: 400,
                    message: '车牌号、最大载重、最大容积、车队ID和购买日期都是必填项',
                    data: null
                })
            }

            // 数值校验
            if (maxLoad <= 0 || maxVolume <= 0) {
                return res.status(400).json({
                    code: 400,
                    message: '最大载重和最大容积必须大于0',
                    data: null
                })
            }

            // 车牌号格式校验（简单校验）
            const plateRegex = /^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-HJ-NP-Z][A-HJ-NP-Z0-9]{4,5}[A-HJ-NP-Z0-9挂学警港澳]$/
            if (!plateRegex.test(licensePlate)) {
                return res.status(400).json({
                    code: 400,
                    message: '车牌号格式不正确',
                    data: null
                })
            }

            // 状态校验
            const validStatuses = ['空闲', '运输中', '维修中', '异常']
            if (currentStatus && !validStatuses.includes(currentStatus)) {
                return res.status(400).json({
                    code: 400,
                    message: '车辆状态必须为：空闲、运输中、维修中、异常',
                    data: null
                })
            }

            const pool = await poolPromise

            // 检查车队是否存在
            const fleetCheck = await pool.request()
                .input('fleetId', sql.VarChar(10), fleetId)
                .query('SELECT Fleet_ID FROM Fleet WHERE Fleet_ID = @fleetId')

            if (fleetCheck.recordset.length === 0) {
                return res.status(404).json({
                    code: 404,
                    message: '指定的车队不存在',
                    data: null
                })
            }

            // 检查车牌是否已存在
            const plateCheck = await pool.request()
                .input('licensePlate', sql.VarChar(10), licensePlate)
                .query('SELECT License_Plate FROM Vehicle WHERE License_Plate = @licensePlate')

            if (plateCheck.recordset.length > 0) {
                return res.status(400).json({
                    code: 400,
                    message: '车牌号已存在',
                    data: null
                })
            }

            // 插入车辆信息
            await pool.request()
                .input('licensePlate', sql.VarChar(10), licensePlate)
                .input('maxLoad', sql.Decimal(10, 2), maxLoad)
                .input('maxVolume', sql.Decimal(10, 2), maxVolume)
                .input('currentStatus', sql.VarChar(10), currentStatus || '空闲')
                .input('fleetId', sql.VarChar(10), fleetId)
                .input('buyDate', sql.Date, buyDate)
                .query(`
          INSERT INTO Vehicle (License_Plate, Max_Load, Max_Volume, Current_Status, Fleet_ID, Buy_Date)
          VALUES (@licensePlate, @maxLoad, @maxVolume, @currentStatus, @fleetId, @buyDate)
        `)

            res.status(200).json({
                code: 200,
                message: '车辆信息添加成功',
                data: null
            })

        } catch (error) {
            console.error('添加车辆失败:', error)
            res.status(500).json({
                code: 500,
                message: '服务器内部错误',
                data: null
            })
        }
    }

    /**
     * 获取可用车辆列表
     * GET /api/vehicle/available?weight=3.5&volume=6.0&dcId=DC001
     */
    async getAvailableVehicles(req, res) {
        try {
            const { weight, volume, dcId } = req.query

            if (!weight || !volume) {
                return res.status(400).json({
                    code: 400,
                    message: '货物重量和体积不能为空',
                    data: null
                })
            }

            const pool = await poolPromise

            // 构建查询条件
            let whereCondition = `
        WHERE v.Current_Status = '空闲'
        AND v.Max_Load >= @weight
        AND v.Max_Volume >= @volume
      `

            // 如果指定了配送中心
            if (dcId) {
                whereCondition += ` AND f.DC_ID = @dcId`
            }

            const request = pool.request()
                .input('weight', sql.Decimal(10, 2), parseFloat(weight))
                .input('volume', sql.Decimal(10, 2), parseFloat(volume))

            if (dcId) {
                request.input('dcId', sql.VarChar(10), dcId)
            }

            // 查询可用车辆
            const result = await request.query(`
        SELECT 
          v.License_Plate,
          v.Max_Load,
          v.Max_Volume,
          v.Current_Status,
          f.Fleet_Name,
          d.Driver_Name,
          ISNULL((
            SELECT SUM(Goods_Weight) 
            FROM [Order] o 
            WHERE o.License_Plate = v.License_Plate 
            AND o.Transport_Status IN ('待运输','装货中','运输中')
          ), 0) as Current_Load
        FROM Vehicle v
        JOIN Fleet f ON v.Fleet_ID = f.Fleet_ID
        LEFT JOIN Driver d ON f.Supervisor_ID = d.Driver_ID
        ${whereCondition}
        ORDER BY v.Max_Load DESC
      `)

            // 计算可用载重
            const vehicles = result.recordset.map(vehicle => ({
                ...vehicle,
                Available_Load: vehicle.Max_Load - vehicle.Current_Load,
                Available_Load_Percent: ((vehicle.Max_Load - vehicle.Current_Load) / vehicle.Max_Load * 100).toFixed(1)
            }))

            res.status(200).json({
                code: 200,
                message: '成功',
                data: vehicles
            })

        } catch (error) {
            console.error('获取可用车辆失败:', error)
            res.status(500).json({
                code: 500,
                message: '服务器内部错误',
                data: null
            })
        }
    }
}

module.exports = new VehicleController()