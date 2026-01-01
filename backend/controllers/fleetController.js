const { sql, poolPromise } = require('../database.js')

/**
 * 车队控制器
 * 处理车队相关的业务逻辑
 */
class FleetController {

    /**
     * 查询车队负载情况
     * GET /api/fleet/load-status?dcId=DC001
     */
    async getFleetLoadStatus(req, res) {
        try {
            const { dcId } = req.query

            if (!dcId) {
                return res.status(400).json({
                    code: 400,
                    message: '配送中心ID不能为空',
                    data: null
                })
            }

            const pool = await poolPromise

            // 检查配送中心是否存在
            const dcCheck = await pool.request()
                .input('dcId', sql.VarChar(10), dcId)
                .query('SELECT DC_ID FROM DistributionCenter WHERE DC_ID = @dcId')

            if (dcCheck.recordset.length === 0) {
                return res.status(404).json({
                    code: 404,
                    message: '指定的配送中心不存在',
                    data: null
                })
            }

            // 获取配送中心下的所有车队
            const fleetsResult = await pool.request()
                .input('dcId', sql.VarChar(10), dcId)
                .query(`
          SELECT f.Fleet_ID, f.Fleet_Name
          FROM Fleet f
          WHERE f.DC_ID = @dcId
          ORDER BY f.Fleet_ID
        `)

            const fleetData = []

            // 遍历每个车队，获取车辆信息
            for (const fleet of fleetsResult.recordset) {
                // 获取车队下的所有车辆
                const vehiclesResult = await pool.request()
                    .input('fleetId', sql.VarChar(10), fleet.Fleet_ID)
                    .query(`
            SELECT 
              v.License_Plate,
              v.Current_Status,
              v.Max_Load,
              v.Max_Volume,
              d.Driver_Name,
              ae.Description as Abnormal_Reason,
              (
                SELECT MAX(Create_Time)
                FROM [Order] o
                WHERE o.License_Plate = v.License_Plate
              ) as Last_Order_Time,
              ISNULL((
                SELECT SUM(Goods_Weight)
                FROM [Order] o
                WHERE o.License_Plate = v.License_Plate
                AND o.Transport_Status IN ('待运输','装货中','运输中')
              ), 0) as Current_Load
            FROM Vehicle v
            LEFT JOIN Driver d ON v.Fleet_ID = d.Fleet_ID AND d.Driver_ID LIKE '%主管%'
            LEFT JOIN AbnormalEvent ae ON v.License_Plate = ae.License_Plate 
              AND ae.Handle_Status = '未处理'
            WHERE v.Fleet_ID = @fleetId
            ORDER BY v.Current_Status, v.License_Plate
          `)

                const vehicles = vehiclesResult.recordset.map(vehicle => ({
                    licensePlate: vehicle.License_Plate,
                    currentStatus: vehicle.Current_Status,
                    maxLoad: vehicle.Max_Load,
                    currentLoad: vehicle.Current_Load,
                    availableLoad: vehicle.Max_Load - vehicle.Current_Load,
                    lastOrderTime: vehicle.Last_Order_Time,
                    abnormalReason: vehicle.Abnormal_Reason
                }))

                // 统计车队概览
                const statusCounts = vehicles.reduce((acc, vehicle) => {
                    acc[vehicle.currentStatus] = (acc[vehicle.currentStatus] || 0) + 1
                    return acc
                }, {})

                fleetData.push({
                    fleetId: fleet.Fleet_ID,
                    fleetName: fleet.Fleet_Name,
                    vehicles,
                    summary: {
                        totalVehicles: vehicles.length,
                        availableVehicles: statusCounts['空闲'] || 0,
                        busyVehicles: (statusCounts['运输中'] || 0) + (statusCounts['装货中'] || 0),
                        abnormalVehicles: statusCounts['异常'] || 0,
                        maintenanceVehicles: statusCounts['维修中'] || 0
                    }
                })
            }

            res.status(200).json({
                code: 200,
                message: '成功',
                data: fleetData
            })

        } catch (error) {
            console.error('查询车队负载失败:', error)
            res.status(500).json({
                code: 500,
                message: '服务器内部错误',
                data: null
            })
        }
    }

    /**
     * 获取车队月度报表
     * GET /api/fleet/monthly-report?fleetId=F001&year=2025&month=12
     */
    async getFleetMonthlyReport(req, res) {
        try {
            const { fleetId, year, month } = req.query

            if (!fleetId || !year || !month) {
                return res.status(400).json({
                    code: 400,
                    message: '车队ID、年份和月份都是必填项',
                    data: null
                })
            }

            const pool = await poolPromise

            // 调用存储过程
            const result = await pool.request()
                .input('in_fleet_id', sql.VarChar(10), fleetId)
                .input('in_year', sql.Int, parseInt(year))
                .input('in_month', sql.Int, parseInt(month))
                .output('out_total_orders', sql.Int)
                .output('out_total_events', sql.Int)
                .output('out_total_fines', sql.Decimal(10, 2))
                .execute('SP_Fleet_Monthly_Report')

            // 获取存储过程输出参数
            const totalOrders = result.output.out_total_orders || 0
            const totalEvents = result.output.out_total_events || 0
            const totalFines = result.output.out_total_fines || 0

            // 获取车队基本信息
            const fleetInfo = await pool.request()
                .input('fleetId', sql.VarChar(10), fleetId)
                .query('SELECT Fleet_Name FROM Fleet WHERE Fleet_ID = @fleetId')

            if (fleetInfo.recordset.length === 0) {
                return res.status(404).json({
                    code: 404,
                    message: '车队不存在',
                    data: null
                })
            }

            // 获取更多详细数据用于报表
            // 1. 运单效率指标
            const efficiencyData = await pool.request()
                .input('fleetId', sql.VarChar(10), fleetId)
                .input('year', sql.Int, parseInt(year))
                .input('month', sql.Int, parseInt(month))
                .query(`
          SELECT 
            COUNT(*) as totalOrders,
            SUM(Goods_Weight) as totalWeight,
            AVG(DATEDIFF(HOUR, Create_Time, Sign_Time)) as avgDeliveryHours,
            SUM(CASE WHEN DATEDIFF(HOUR, Create_Time, Sign_Time) <= 4 THEN 1 ELSE 0 END) as onTimeDeliveries
          FROM [Order] o
          JOIN Vehicle v ON o.License_Plate = v.License_Plate
          WHERE v.Fleet_ID = @fleetId
          AND YEAR(o.Create_Time) = @year
          AND MONTH(o.Create_Time) = @month
          AND o.Transport_Status = '已签收'
          AND o.Sign_Time IS NOT NULL
        `)

            // 2. 异常事件分布
            const eventDistribution = await pool.request()
                .input('fleetId', sql.VarChar(10), fleetId)
                .input('year', sql.Int, parseInt(year))
                .input('month', sql.Int, parseInt(month))
                .query(`
          SELECT 
            Event_Type,
            COUNT(*) as eventCount,
            AVG(Fine_Amount) as avgFineAmount
          FROM AbnormalEvent ae
          JOIN Vehicle v ON ae.License_Plate = v.License_Plate
          WHERE v.Fleet_ID = @fleetId
          AND YEAR(ae.Occur_Time) = @year
          AND MONTH(ae.Occur_Time) = @month
          GROUP BY Event_Type
        `)

            // 3. 司机绩效排名
            const driverRanking = await pool.request()
                .input('fleetId', sql.VarChar(10), fleetId)
                .input('year', sql.Int, parseInt(year))
                .input('month', sql.Int, parseInt(month))
                .query(`
          SELECT TOP 10
            d.Driver_ID,
            d.Driver_Name,
            COUNT(DISTINCT o.Order_ID) as orderCount,
            COUNT(DISTINCT ae.Event_ID) as abnormalCount,
            ISNULL(SUM(ae.Fine_Amount), 0) as totalFines,
            CASE 
              WHEN COUNT(DISTINCT o.Order_ID) > 0 THEN 
                (COUNT(DISTINCT o.Order_ID) * 100.0 - ISNULL(SUM(ae.Fine_Amount), 0)) / COUNT(DISTINCT o.Order_ID)
              ELSE 0 
            END as performanceScore
          FROM Driver d
          LEFT JOIN [Order] o ON d.Fleet_ID = (SELECT Fleet_ID FROM Vehicle WHERE License_Plate = o.License_Plate)
            AND YEAR(o.Create_Time) = @year AND MONTH(o.Create_Time) = @month
          LEFT JOIN AbnormalEvent ae ON d.Driver_ID = ae.Driver_ID
            AND YEAR(ae.Occur_Time) = @year AND MONTH(ae.Occur_Time) = @month
          WHERE d.Fleet_ID = @fleetId
          GROUP BY d.Driver_ID, d.Driver_Name
          HAVING COUNT(DISTINCT o.Order_ID) > 0
          ORDER BY performanceScore DESC
        `)

            // 构建报表数据
            const reportData = {
                reportInfo: {
                    fleetId,
                    fleetName: fleetInfo.recordset[0].Fleet_Name,
                    reportPeriod: `${year}年${month}月`,
                    generateTime: new Date().toISOString()
                },
                efficiencyMetrics: {
                    totalOrders: totalOrders,
                    totalWeight: efficiencyData.recordset[0]?.totalWeight || 0,
                    avgDeliveryTime: efficiencyData.recordset[0]?.avgDeliveryHours
                        ? `${efficiencyData.recordset[0].avgDeliveryHours.toFixed(1)}小时`
                        : '0小时',
                    onTimeDeliveryRate: efficiencyData.recordset[0]?.totalOrders > 0
                        ? ((efficiencyData.recordset[0].onTimeDeliveries / efficiencyData.recordset[0].totalOrders) * 100).toFixed(1) + '%'
                        : '0%'
                },
                safetyMetrics: {
                    totalAbnormalEvents: totalEvents,
                    totalFines: totalFines,
                    eventDistribution: eventDistribution.recordset.reduce((acc, item) => {
                        acc[item.Event_Type] = item.eventCount
                        return acc
                    }, {}),
                    severityAnalysis: {
                        // 这里可以根据罚款金额划分严重程度
                        '轻微（罚款≤200）': 0,
                        '中等（200<罚款≤1000）': 0,
                        '严重（罚款>1000）': 0
                    }
                },
                driverRanking: driverRanking.recordset.map((driver, index) => ({
                    rank: index + 1,
                    driverId: driver.Driver_ID,
                    driverName: driver.Driver_Name,
                    totalOrders: driver.orderCount,
                    abnormalEvents: driver.abnormalCount,
                    performanceScore: driver.performanceScore.toFixed(1)
                }))
            }

            res.status(200).json({
                code: 200,
                message: '成功',
                data: reportData
            })

        } catch (error) {
            console.error('获取车队月度报表失败:', error)
            res.status(500).json({
                code: 500,
                message: '服务器内部错误',
                data: null
            })
        }
    }
}

module.exports = new FleetController()