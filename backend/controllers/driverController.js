const { sql, poolPromise } = require('../database.js')

/**
 * 司机控制器
 * 处理司机相关的业务逻辑
 */
class DriverController {

    /**
     * 添加司机信息
     * POST /api/driver/add
     */
    async addDriver(req, res) {
        try {
            const { driverId, driverName, licenseLevel, contact, hireDate, fleetId } = req.body

            // 基础校验
            if (!driverId || !driverName || !licenseLevel || !contact || !hireDate || !fleetId) {
                return res.status(400).json({
                    code: 400,
                    message: '所有字段都是必填项',
                    data: null
                })
            }

            // 驾照等级校验
            const validLicenseLevels = ['A', 'B', 'C']
            if (!validLicenseLevels.includes(licenseLevel)) {
                return res.status(400).json({
                    code: 400,
                    message: '驾照等级必须为A、B、C之一',
                    data: null
                })
            }

            // 联系方式校验（简单手机号校验）
            const phoneRegex = /^1\d{10}$/
            if (!phoneRegex.test(contact)) {
                return res.status(400).json({
                    code: 400,
                    message: '联系方式格式不正确',
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

            // 检查司机是否已存在
            const driverCheck = await pool.request()
                .input('driverId', sql.VarChar(10), driverId)
                .query('SELECT Driver_ID FROM Driver WHERE Driver_ID = @driverId')

            if (driverCheck.recordset.length > 0) {
                return res.status(400).json({
                    code: 400,
                    message: '司机工号已存在',
                    data: null
                })
            }

            // 插入司机信息
            await pool.request()
                .input('driverId', sql.VarChar(10), driverId)
                .input('driverName', sql.VarChar(20), driverName)
                .input('licenseLevel', sql.VarChar(1), licenseLevel)
                .input('contact', sql.VarChar(11), contact)
                .input('hireDate', sql.Date, hireDate)
                .input('fleetId', sql.VarChar(10), fleetId)
                .query(`
          INSERT INTO Driver (Driver_ID, Driver_Name, License_Level, Contact, Hire_Date, Fleet_ID)
          VALUES (@driverId, @driverName, @licenseLevel, @contact, @hireDate, @fleetId)
        `)

            res.status(200).json({
                code: 200,
                message: '司机信息添加成功',
                data: null
            })

        } catch (error) {
            console.error('添加司机失败:', error)
            res.status(500).json({
                code: 500,
                message: '服务器内部错误',
                data: null
            })
        }
    }

    /**
     * 查询司机绩效
     * GET /api/driver/performance?driverId=D002&startDate=2025-12-01&endDate=2025-12-25
     */
    async getDriverPerformance(req, res) {
        try {
            const { driverId, startDate, endDate } = req.query

            if (!driverId) {
                return res.status(400).json({
                    code: 400,
                    message: '司机ID不能为空',
                    data: null
                })
            }

            const pool = await poolPromise

            // 获取司机基本信息
            const driverResult = await pool.request()
                .input('driverId', sql.VarChar(10), driverId)
                .query(`
          SELECT Driver_ID, Driver_Name, License_Level, Hire_Date
          FROM Driver
          WHERE Driver_ID = @driverId
        `)

            if (driverResult.recordset.length === 0) {
                return res.status(404).json({
                    code: 404,
                    message: '司机不存在',
                    data: null
                })
            }

            const driverInfo = driverResult.recordset[0]

            // 构建时间筛选条件
            let dateCondition = ''
            if (startDate && endDate) {
                dateCondition = `AND Create_Time BETWEEN '${startDate}' AND DATEADD(DAY, 1, '${endDate}')`
            }

            // 统计运单数据
            const orderStats = await pool.request()
                .input('driverId', sql.VarChar(10), driverId)
                .query(`
          SELECT 
            COUNT(*) as totalOrders,
            SUM(Goods_Weight) as totalWeight,
            AVG(DATEDIFF(HOUR, Create_Time, Sign_Time)) as avgDeliveryHours
          FROM [Order] o
          JOIN Vehicle v ON o.License_Plate = v.License_Plate
          JOIN Driver d ON v.Fleet_ID = d.Fleet_ID
          WHERE d.Driver_ID = @driverId
          AND Transport_Status = '已签收'
          ${dateCondition}
        `)

            // 统计异常事件
            const abnormalStats = await pool.request()
                .input('driverId', sql.VarChar(10), driverId)
                .query(`
          SELECT 
            COUNT(*) as totalAbnormalEvents,
            SUM(Fine_Amount) as totalFines
          FROM AbnormalEvent
          WHERE Driver_ID = @driverId
          ${dateCondition ? `AND Occur_Time BETWEEN '${startDate}' AND DATEADD(DAY, 1, '${endDate}')` : ''}
        `)

            // 获取详细运单记录
            const orderDetails = await pool.request()
                .input('driverId', sql.VarChar(10), driverId)
                .query(`
          SELECT TOP 50
            o.Order_ID, o.Create_Time, o.Goods_Weight, o.Destination,
            o.Sign_Time, o.Transport_Status
          FROM [Order] o
          JOIN Vehicle v ON o.License_Plate = v.License_Plate
          JOIN Driver d ON v.Fleet_ID = d.Fleet_ID
          WHERE d.Driver_ID = @driverId
          ${dateCondition}
          ORDER BY o.Create_Time DESC
        `)

            // 获取详细异常记录
            const abnormalDetails = await pool.request()
                .input('driverId', sql.VarChar(10), driverId)
                .query(`
          SELECT 
            Event_ID, Occur_Time, Event_Type, Description,
            Fine_Amount, Handle_Status
          FROM AbnormalEvent
          WHERE Driver_ID = @driverId
          ${dateCondition ? `AND Occur_Time BETWEEN '${startDate}' AND DATEADD(DAY, 1, '${endDate}')` : ''}
          ORDER BY Occur_Time DESC
        `)

            // 计算准时率（假设4小时内送达为准时）
            const onTimeResult = await pool.request()
                .input('driverId', sql.VarChar(10), driverId)
                .query(`
          SELECT 
            COUNT(*) as totalDelivered,
            SUM(CASE WHEN DATEDIFF(HOUR, Create_Time, Sign_Time) <= 4 THEN 1 ELSE 0 END) as onTimeDelivered
          FROM [Order] o
          JOIN Vehicle v ON o.License_Plate = v.License_Plate
          JOIN Driver d ON v.Fleet_ID = d.Fleet_ID
          WHERE d.Driver_ID = @driverId
          AND Transport_Status = '已签收'
          AND Sign_Time IS NOT NULL
          ${dateCondition}
        `)

            const onTimeRate = onTimeResult.recordset[0].totalDelivered > 0
                ? (onTimeResult.recordset[0].onTimeDelivered / onTimeResult.recordset[0].totalDelivered * 100).toFixed(1)
                : 0

            res.status(200).json({
                code: 200,
                message: '成功',
                data: {
                    driverInfo,
                    statistics: {
                        totalOrders: orderStats.recordset[0].totalOrders || 0,
                        totalWeight: orderStats.recordset[0].totalWeight || 0,
                        avgDeliveryTime: orderStats.recordset[0].avgDeliveryHours
                            ? `${orderStats.recordset[0].avgDeliveryHours.toFixed(1)}小时`
                            : '0小时',
                        onTimeRate: `${onTimeRate}%`,
                        totalAbnormalEvents: abnormalStats.recordset[0].totalAbnormalEvents || 0,
                        totalFines: abnormalStats.recordset[0].totalFines || 0
                    },
                    orderDetails: orderDetails.recordset,
                    abnormalDetails: abnormalDetails.recordset
                }
            })

        } catch (error) {
            console.error('查询司机绩效失败:', error)
            res.status(500).json({
                code: 500,
                message: '服务器内部错误',
                data: null
            })
        }
    }
}

module.exports = new DriverController()