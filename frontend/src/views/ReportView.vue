<template>
    <div>
        <h1 class="page-title">统计报表</h1>

        <!-- 报表查询 -->
        <div class="card">
            <h2>车队月度安全与效率报表</h2>
            <div class="form-container">
                <el-form :model="queryForm" label-width="120px">
                    <el-form-item label="车队ID">
                        <el-input v-model="queryForm.fleetId" placeholder="请输入车队ID，如：F001" />
                    </el-form-item>

                    <el-form-item label="年份">
                        <el-input-number v-model="queryForm.year" :min="2000" :max="2100" placeholder="请输入年份" />
                    </el-form-item>

                    <el-form-item label="月份">
                        <el-input-number v-model="queryForm.month" :min="1" :max="12" placeholder="请输入月份" />
                    </el-form-item>

                    <el-form-item>
                        <el-button type="primary" @click="queryReport" :loading="querying">
                            生成报表
                        </el-button>
                    </el-form-item>
                </el-form>
            </div>
        </div>

        <!-- 报表显示 -->
        <div v-if="reportData" class="card">
            <h3>{{ reportData.reportInfo.fleetName }} - {{ reportData.reportInfo.reportPeriod }} 月度报表</h3>
            <p style="color: #909399; margin-bottom: 20px;">
                生成时间：{{ formatDate(reportData.reportInfo.generateTime) }}
            </p>

            <!-- 效率指标 -->
            <h4>效率指标</h4>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-label">总运单数</div>
                    <div class="stat-value">{{ reportData.efficiencyMetrics.totalOrders }}</div>
                </div>

                <div class="stat-card">
                    <div class="stat-label">总运输重量</div>
                    <div class="stat-value">{{ reportData.efficiencyMetrics.totalWeight }} 吨</div>
                </div>

                <div class="stat-card">
                    <div class="stat-label">平均送达时间</div>
                    <div class="stat-value">{{ reportData.efficiencyMetrics.avgDeliveryTime }}</div>
                </div>

                <div class="stat-card">
                    <div class="stat-label">准时送达率</div>
                    <div class="stat-value">{{ reportData.efficiencyMetrics.onTimeDeliveryRate }}</div>
                </div>
            </div>

            <!-- 安全指标 -->
            <h4 style="margin-top: 30px;">安全指标</h4>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-label">异常事件数</div>
                    <div class="stat-value">{{ reportData.safetyMetrics.totalAbnormalEvents }}</div>
                </div>

                <div class="stat-card">
                    <div class="stat-label">累计罚款金额</div>
                    <div class="stat-value">{{ reportData.safetyMetrics.totalFines }} 元</div>
                </div>
            </div>

            <!-- 异常分布 -->
            <div v-if="reportData.safetyMetrics.eventDistribution" style="margin-top: 20px;">
                <h5>异常事件分布</h5>
                <el-table :data="formatEventDistribution" style="width: 300px" border>
                    <el-table-column prop="type" label="异常类型" />
                    <el-table-column prop="count" label="事件数量" />
                </el-table>
            </div>

            <!-- 司机排名 -->
            <div v-if="reportData.driverRanking && reportData.driverRanking.length > 0" style="margin-top: 30px;">
                <h4>司机绩效排名</h4>
                <el-table :data="reportData.driverRanking" style="width: 100%" border>
                    <el-table-column prop="rank" label="排名" width="80">
                        <template #default="{ row }">
                            <el-tag v-if="row.rank === 1" type="success">第{{ row.rank }}名</el-tag>
                            <el-tag v-else-if="row.rank === 2" type="warning">第{{ row.rank }}名</el-tag>
                            <el-tag v-else-if="row.rank === 3" type="info">第{{ row.rank }}名</el-tag>
                            <span v-else>第{{ row.rank }}名</span>
                        </template>
                    </el-table-column>
                    <el-table-column prop="driverName" label="司机姓名" />
                    <el-table-column prop="driverId" label="工号" />
                    <el-table-column prop="totalOrders" label="运单数" />
                    <el-table-column prop="abnormalEvents" label="异常数" />
                    <el-table-column prop="performanceScore" label="绩效分" />
                </el-table>
            </div>
        </div>

        <div v-else-if="hasQueried && !reportData" class="empty-state">
            没有找到报表数据
        </div>
    </div>
</template>

<script>
    import { fleetApi } from '../api'

    export default {
        name: 'ReportView',
        data() {
            const currentDate = new Date()

            return {
                // 查询表单数据
                queryForm: {
                    fleetId: '',
                    year: currentDate.getFullYear(),
                    month: currentDate.getMonth() + 1
                },

                // 状态标志
                querying: false,
                hasQueried: false,

                // 报表数据
                reportData: null
            }
        },
        computed: {
            // 格式化异常分布数据
            formatEventDistribution() {
                if (!this.reportData?.safetyMetrics?.eventDistribution) return []

                return Object.entries(this.reportData.safetyMetrics.eventDistribution).map(([type, count]) => ({
                    type,
                    count
                }))
            }
        },
        methods: {
            // 查询报表
            async queryReport() {
                if (!this.queryForm.fleetId || !this.queryForm.year || !this.queryForm.month) {
                    alert('请填写所有查询条件')
                    return
                }

                try {
                    this.querying = true
                    this.hasQueried = true

                    // 调用API
                    const response = await fleetApi.getMonthlyReport(
                        this.queryForm.fleetId,
                        this.queryForm.year,
                        this.queryForm.month
                    )

                    if (response.data.code === 200) {
                        this.reportData = response.data.data
                        if (!this.reportData) {
                            this.$message.info('没有找到报表数据')
                        }
                    } else {
                        alert(response.data.message || '查询失败')
                        this.reportData = null
                    }
                } catch (error) {
                    console.error('查询报表失败:', error)
                    alert(error.response?.data?.message || '网络错误，请稍后重试')
                    this.reportData = null
                } finally {
                    this.querying = false
                }
            },

            // 格式化日期
            formatDate(dateString) {
                if (!dateString) return ''
                const date = new Date(dateString)
                return date.toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                })
            }
        }
    }
</script>