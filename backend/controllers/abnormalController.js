const { sql, poolPromise } = require('../database.js')

/**
 * 异常事件控制器
 * 处理异常事件相关的业务逻辑
 */
class AbnormalController {

    /**
     * 添加异常事件
     * POST /api/abnormal-event/add
     */
    async addAbnormalEvent(req, res) {
        try {
            const {
                eventId,
                licensePlate,
                driverId,
                eventType,
                description,
                fineAmount = 0,
                handleStatus = '未处理'
            } = req.body

            // 基础校验
            if (!eventId || !licensePlate || !driverId || !eventType || !description) {
                return res.status(400).json({
                    code: 400,
                    message: '事件ID、车牌号、司机ID、异常类型和描述都是必填项',
                    data: null
                })
            }

            // 异常类型校验
            const validEventTypes = ['运输中异常', '空闲时异常']
            if (!validEventTypes.includes(eventType)) {
                return res.status(400).json({
                    code: 400,
                    message: '异常类型必须为：运输中异常、空闲时异常',
                    data: null
                })
            }

            // 处理状态校验
            const validHandleStatuses = ['已处理', '未处理']
            if (handleStatus && !validHandleStatuses.includes(handleStatus)) {
                return res.status(400).json({
                    code: 400,
                    message: '处理状态必须为：已处理、未处理',
                    data: null
                })
            }

            // 罚款金额校验
            if (fineAmount < 0) {
                return res.status(400).json({
                    code: 400,
                    message: '罚款金额不能为负数',
                    data: null
                })
            }

            const pool = await poolPromise

            // 检查车辆和司机是否存在且匹配
            const checkResult = await pool.request()
                .input('licensePlate', sql.VarChar(10), licensePlate)
                .input('driverId', sql.VarChar(10), driverId)
                .query(`
          SELECT v.License_Plate, d.Driver_ID
          FROM Vehicle v
          JOIN Driver d ON v.Fleet_ID = d.Fleet_ID
          WHERE v.License_Plate = @licensePlate 
          AND d.Driver_ID = @driverId
        `)

            if (checkResult.recordset.length === 0) {
                return res.status(400).json({
                    code: 400,
                    message: '车辆和司机不匹配，请检查输入',
                    data: null
                })
            }

            // 检查事件ID是否已存在
            const eventCheck = await pool.request()
                .input('eventId', sql.VarChar(20), eventId)
                .query('SELECT Event_ID FROM AbnormalEvent WHERE Event_ID = @eventId')

            if (eventCheck.recordset.length > 0) {
                return res.status(400).json({
                    code: 400,
                    message: '事件ID已存在',
                    data: null
                })
            }

            // 插入异常事件
            await pool.request()
                .input('eventId', sql.VarChar(20), eventId)
                .input('licensePlate', sql.VarChar(10), licensePlate)
                .input('driverId', sql.VarChar(10), driverId)
                .input('eventType', sql.VarChar(20), eventType)
                .input('description', sql.VarChar(200), description)
                .input('fineAmount', sql.Decimal(10, 2), fineAmount)
                .input('handleStatus', sql.VarChar(10), handleStatus)
                .query(`
          INSERT INTO AbnormalEvent (Event_ID, License_Plate, Driver_ID, Event_Type, Description, Fine_Amount, Handle_Status)
          VALUES (@eventId, @licensePlate, @driverId, @eventType, @description, @fineAmount, @handleStatus)
        `)

            // 获取发生时间
            const eventResult = await pool.request()
                .input('eventId', sql.VarChar(20), eventId)
                .query('SELECT Occur_Time FROM AbnormalEvent WHERE Event_ID = @eventId')

            // 更新车辆状态为异常（如果是运输中异常）
            if (eventType === '运输中异常') {
                await pool.request()
                    .input('licensePlate', sql.VarChar(10), licensePlate)
                    .query(`
            UPDATE Vehicle 
            SET Current_Status = '异常' 
            WHERE License_Plate = @licensePlate
            AND Current_Status = '运输中'
          `)
            }

            res.status(200).json({
                code: 200,
                message: '异常事件记录成功',
                data: {
                    eventId,
                    occurTime: eventResult.recordset[0].Occur_Time
                }
            })

        } catch (error) {
            console.error('添加异常事件失败:', error)
            res.status(500).json({
                code: 500,
                message: '服务器内部错误',
                data: null
            })
        }
    }
}

module.exports = new AbnormalController()