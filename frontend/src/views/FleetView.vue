<template>
    <div>
        <h1 class="page-title">车队资源查询</h1>

        <!-- 车队负载查询 -->
        <div class="card">
            <h2>查询车队负载情况</h2>
            <div class="form-container">
                <el-form :model="queryForm" label-width="120px">
                    <el-form-item label="配送中心ID">
                        <el-input v-model="queryForm.dcId" placeholder="请输入配送中心ID，如：DC001" />
                        <div style="margin-top: 10px; font-size: 12px; color: #909399;">
                            说明：查询该配送中心下所有车队的车辆负载情况
                        </div>
                    </el-form-item>

                    <el-form-item>
                        <el-button type="primary" @click="queryFleetLoad" :loading="querying">
                            查询车队负载
                        </el-button>
                    </el-form-item>
                </el-form>
            </div>
        </div>

        <!-- 查询结果 -->
        <div v-if="fleetData.length > 0">
            <div v-for="fleet in fleetData" :key="fleet.fleetId" class="card" style="margin-bottom: 30px;">
                <h3>{{ fleet.fleetName }} ({{ fleet.fleetId }})</h3>

                <!-- 车队概览 -->
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-label">总车辆数</div>
                        <div class="stat-value">{{ fleet.summary.totalVehicles }}</div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-label">可用车辆</div>
                        <div class="stat-value" style="color: #67c23a;">{{ fleet.summary.availableVehicles }}</div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-label">忙碌车辆</div>
                        <div class="stat-value" style="color: #e6a23c;">{{ fleet.summary.busyVehicles }}</div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-label">异常车辆</div>
                        <div class="stat-value" style="color: #f56c6c;">{{ fleet.summary.abnormalVehicles }}</div>
                    </div>
                </div>

                <!-- 车辆详情 -->
                <h4 style="margin-top: 30px;">车辆详情</h4>
                <el-table :data="fleet.vehicles" style="width: 100%" border>
                    <el-table-column prop="licensePlate" label="车牌号" width="120" />
                    <el-table-column prop="currentStatus" label="状态" width="100">
                        <template #default="{ row }">
                            <el-tag :type="getStatusTagType(row.currentStatus)" size="small">
                                {{ row.currentStatus }}
                            </el-tag>
                        </template>
                    </el-table-column>
                    <el-table-column prop="maxLoad" label="最大载重(吨)" width="120" />
                    <el-table-column prop="currentLoad" label="当前载重(吨)" width="120" />
                    <el-table-column prop="availableLoad" label="可用载重(吨)" width="120" />
                    <el-table-column prop="lastOrderTime" label="最后运单时间" width="220" />
                    <el-table-column prop="abnormalReason" label="异常原因" />
                </el-table>
            </div>
        </div>

        <div v-else-if="hasQueried && fleetData.length === 0" class="empty-state">
            没有找到车队信息或该配送中心下无车队
        </div>
    </div>
</template>

<script>
    import { fleetApi } from '../api'

    export default {
        name: 'FleetView',
        data() {
            return {
                // 查询表单数据
                queryForm: {
                    dcId: ''
                },

                // 状态标志
                querying: false,
                hasQueried: false,

                // 车队数据
                fleetData: []
            }
        },
        methods: {
            // 查询车队负载
            async queryFleetLoad() {
                if (!this.queryForm.dcId) {
                    alert('请输入配送中心ID')
                    return
                }

                try {
                    this.querying = true
                    this.hasQueried = true

                    // 调用API
                    const response = await fleetApi.getLoadStatus(this.queryForm.dcId)

                    if (response.data.code === 200) {
                        this.fleetData = response.data.data || []
                        if (this.fleetData.length === 0) {
                            alert('该配送中心下没有车队信息')
                        }
                    } else {
                        alert(response.data.message || '查询失败')
                        this.fleetData = []
                    }
                } catch (error) {
                    console.error('查询车队负载失败:', error)
                    alert(error.response?.data?.message || '网络错误，请稍后重试')
                    this.fleetData = []
                } finally {
                    this.querying = false
                }
            },

            // 根据状态获取标签类型
            getStatusTagType(status) {
                const typeMap = {
                    '空闲': 'success',
                    '运输中': 'warning',
                    '维修中': 'info',
                    '异常': 'danger'
                }
                return typeMap[status] || ''
            }
        }
    }
</script>