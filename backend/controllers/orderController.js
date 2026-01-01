const { sql, poolPromise } = require('../database.js')

/**
 * 运单控制器
 * 处理运单相关的业务逻辑
 */
class OrderController {

    /**
     * 创建运单
     * POST /api/order/create
     * 数据库有超载校验触发器
     */
    async createOrder(req, res) {
        try {
            const { orderId, goodsWeight, goodsVolume, destination, licensePlate } = req.body

            // 基础校验
            if (!orderId || !goodsWeight || !goodsVolume || !destination || !licensePlate) {
                return res.status(400).json({
                    code: 400,
                    message: '所有字段都是必填项',
                    data: null
                })
            }

            // 数值校验
            if (goodsWeight <= 0 || goodsVolume <= 0) {
                return res.status(400).json({
                    code: 400,
                    message: '货物重量和体积必须大于0',
                    data: null
                })
            }

            const pool = await poolPromise

            // 检查车辆是否存在
            const vehicleCheck = await pool.request()
                .input('licensePlate', sql.VarChar(10), licensePlate)
                .query('SELECT License_Plate FROM Vehicle WHERE License_Plate = @licensePlate')

            if (vehicleCheck.recordset.length === 0) {
                return res.status(404).json({
                    code: 404,
                    message: '指定的车辆不存在',
                    data: null
                })
            }

            // 检查运单是否已存在
            const orderCheck = await pool.request()
                .input('orderId', sql.VarChar(20), orderId)
                .query('SELECT Order_ID FROM [Order] WHERE Order_ID = @orderId')

            if (orderCheck.recordset.length > 0) {
                return res.status(400).json({
                    code: 400,
                    message: '运单号已存在',
                    data: null
                })
            }

            // 尝试插入运单（触发器会进行超载校验）
            await pool.request()
                .input('orderId', sql.VarChar(20), orderId)
                .input('goodsWeight', sql.Decimal(10, 2), goodsWeight)
                .input('goodsVolume', sql.Decimal(10, 2), goodsVolume)
                .input('destination', sql.VarChar(100), destination)
                .input('licensePlate', sql.VarChar(10), licensePlate)
                .query(`
          INSERT INTO [Order] (Order_ID, Goods_Weight, Goods_Volume, Destination, License_Plate)
          VALUES (@orderId, @goodsWeight, @goodsVolume, @destination, @licensePlate)
        `)

            // 获取创建时间
            const orderResult = await pool.request()
                .input('orderId', sql.VarChar(20), orderId)
                .query('SELECT Create_Time FROM [Order] WHERE Order_ID = @orderId')

            res.status(200).json({
                code: 200,
                message: '运单创建成功',
                data: {
                    orderId,
                    createTime: orderResult.recordset[0].Create_Time
                }
            })

        } catch (error) {
            console.error('创建运单失败:', error)

            // 检查是否为超载错误（触发器抛出的异常）
            if (error.message && error.message.includes('超出车辆最大载重')) {
                return res.status(500).json({
                    code: 500,
                    message: '超出车辆最大载重，运单分配失败',
                    data: null
                })
            }

            res.status(500).json({
                code: 500,
                message: '服务器内部错误',
                data: null
            })
        }
    }
}

module.exports = new OrderController()