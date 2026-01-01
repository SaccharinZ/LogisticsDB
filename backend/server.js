const express = require('express')
const path = require('path')
const cors = require('cors')
const { sql, poolPromise } = require('./database.js')
// 创建Express应用
const app = express()
const PORT = 8080

// 托管静态文件，指定默认主页为 index.html
app.use(express.static(path.resolve(__dirname, '../frontend/dist'), { index: 'index.html' }))

// 中间件配置
app.use(cors()) // 启用CORS
app.use(express.json()) // 解析JSON请求体
app.use(express.urlencoded({ extended: true })) // 解析URL编码请求体

// 请求日志中间件
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`)
    next()
})

// 导入路由
const apiRoutes = require('./routes.js')

// API路由前缀
app.use('/api', apiRoutes)

// 全局错误处理中间件
app.use((err, req, res, next) => {
    console.error('全局错误:', err.stack)
    res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
    })
})

// 404处理
app.use((req, res) => {
    res.status(404).json({
        code: 404,
        message: '请求的接口不存在',
        data: null
    })
})

// 启动服务器
app.listen(PORT, async () => {
    try {
        // 测试数据库连接
        const pool = await poolPromise
        console.log(`数据库连接状态: 正常`)
        console.log(`物流系统后端服务器已启动, 端口: ${PORT}`)
    } catch (error) {
        console.error('服务器启动失败:', error)
        process.exit(1)
    }
})


process.on('SIGINT', async () => {
    console.log('正在关闭服务器...')
    try {
        const pool = await poolPromise
        await pool.close()
        console.log('数据库连接已关闭')
        process.exit(0)
    } catch (error) {
        console.error('关闭数据库连接失败:', error)
        process.exit(1)
    }
})

module.exports = app