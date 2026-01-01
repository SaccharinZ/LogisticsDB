const sql = require('mssql')

// SQL Server 连接配置
const config = {
    user: 'logistics_user',
    password: 'admin123',
    server: 'localhost',
    database: 'LogisticsDB',
    options: {
        encrypt: false,               // 本地SQL Server设为false
        trustServerCertificate: true  // 本地开发时忽略证书验证
    },
    pool: {
        max: 10, // 连接池最大连接数
        min: 0,
        idleTimeoutMillis: 30000
    }
}

// 创建连接池
const poolPromise = new sql.ConnectionPool(config)
    .connect()
    .then(pool => {
        console.log('成功连接到 SQL Server 数据库')
        return pool
    })
    .catch(err => {
        console.error('数据库连接失败:', err)
        process.exit(1)
    })

// 导出数据库连接
module.exports = {
    sql,
    poolPromise
}