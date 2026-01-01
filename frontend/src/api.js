import axios from 'axios'

// 创建axios实例
const api = axios.create({
    baseURL: '/api',
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    }
})

/**
 * API接口函数集合
 */

// 司机管理API
export const driverApi = {
    /**
     * 添加司机信息
     * @param {Object} data 司机信息
     */
    addDriver(data) {
        return api.post('/driver/add', data)
    },

    /**
     * 查询司机绩效
     * @param {String} driverId 司机ID
     * @param {String} startDate 开始日期（可选）
     * @param {String} endDate 结束日期（可选）
     */
    getPerformance(driverId, startDate, endDate) {
        const params = { driverId }
        if (startDate) params.startDate = startDate
        if (endDate) params.endDate = endDate
        return api.get('/driver/performance', { params })
    }
}

// 车辆管理API
export const vehicleApi = {
    /**
     * 添加车辆信息
     * @param {Object} data 车辆信息
     */
    addVehicle(data) {
        return api.post('/vehicle/add', data)
    },

    /**
     * 获取可用车辆列表
     * @param {Number} weight 货物重量
     * @param {Number} volume 货物体积
     * @param {String} dcId 配送中心ID（可选）
     */
    getAvailableVehicles(weight, volume, dcId) {
        const params = { weight, volume }
        if (dcId) params.dcId = dcId
        return api.get('/vehicle/available', { params })
    }
}

// 运单管理API
export const orderApi = {
    /**
     * 创建运单
     * @param {Object} data 运单信息
     */
    createOrder(data) {
        return api.post('/order/create', data)
    }
}

// 异常管理API
export const abnormalApi = {
    /**
     * 添加异常事件
     * @param {Object} data 异常信息
     */
    addAbnormalEvent(data) {
        return api.post('/abnormal-event/add', data)
    }
}

// 车队管理API
export const fleetApi = {
    /**
     * 查询车队负载情况
     * @param {String} dcId 配送中心ID
     */
    getLoadStatus(dcId) {
        return api.get('/fleet/load-status', { params: { dcId } })
    },

    /**
     * 获取车队月度报表
     * @param {String} fleetId 车队ID
     * @param {Number} year 年份
     * @param {Number} month 月份
     */
    getMonthlyReport(fleetId, year, month) {
        return api.get('/fleet/monthly-report', {
            params: { fleetId, year, month }
        })
    }
}

// 健康检查API
export const healthApi = {
    /**
     * 检查API服务状态
     */
    checkHealth() {
        return api.get('/health')
    }
}

export default api