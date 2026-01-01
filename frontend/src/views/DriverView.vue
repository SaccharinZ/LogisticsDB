<template>
    <div>
        <h1 class="page-title">司机管理</h1>

        <!-- 司机信息录入 -->
        <div class="card">
            <h2>录入司机信息</h2>
            <div class="form-container">
                <el-form :model="driverForm" :rules="driverRules" ref="driverFormRef" label-width="120px">
                    <el-form-item label="司机工号" prop="driverId">
                        <el-input v-model="driverForm.driverId" placeholder="请输入司机工号" />
                    </el-form-item>

                    <el-form-item label="司机姓名" prop="driverName">
                        <el-input v-model="driverForm.driverName" placeholder="请输入司机姓名" />
                    </el-form-item>

                    <el-form-item label="驾照等级" prop="licenseLevel">
                        <el-select v-model="driverForm.licenseLevel" placeholder="请选择驾照等级">
                            <el-option label="A" value="A" />
                            <el-option label="B" value="B" />
                            <el-option label="C" value="C" />
                        </el-select>
                    </el-form-item>

                    <el-form-item label="联系方式" prop="contact">
                        <el-input v-model="driverForm.contact" placeholder="请输入11位手机号" maxlength="11" />
                    </el-form-item>

                    <el-form-item label="入职日期" prop="hireDate">
                        <el-date-picker v-model="driverForm.hireDate" type="date" placeholder="选择入职日期"
                            value-format="YYYY-MM-DD" />
                    </el-form-item>

                    <el-form-item label="所属车队" prop="fleetId">
                        <el-input v-model="driverForm.fleetId" placeholder="请输入车队ID，如：F001" />
                    </el-form-item>

                    <el-form-item>
                        <el-button type="primary" @click="submitDriverForm" :loading="submitting">
                            提交
                        </el-button>
                        <el-button @click="resetDriverForm">重置</el-button>
                    </el-form-item>
                </el-form>

                <div v-if="submitResult" :class="submitResult.type">
                    {{ submitResult.message }}
                </div>
            </div>
        </div>

        <!-- 司机绩效查询 -->
        <div class="card">
            <h2>司机绩效查询</h2>
            <div class="form-container">
                <el-form :model="queryForm" label-width="120px">
                    <el-form-item label="司机工号">
                        <el-input v-model="queryForm.driverId" placeholder="请输入要查询的司机工号" />
                    </el-form-item>

                    <el-form-item label="查询时间段">
                        <el-date-picker v-model="queryForm.dateRange" type="daterange" range-separator="至"
                            start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" />
                    </el-form-item>

                    <el-form-item>
                        <el-button type="primary" @click="queryPerformance" :loading="querying">
                            查询
                        </el-button>
                    </el-form-item>
                </el-form>
            </div>

            <!-- 查询结果显示 -->
            <div v-if="performanceData" class="card">
                <h3>绩效详情 - {{ performanceData.driverInfo.driverName }}</h3>

                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-label">总运单数</div>
                        <div class="stat-value">{{ performanceData.statistics.totalOrders }}</div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-label">总运输重量</div>
                        <div class="stat-value">{{ performanceData.statistics.totalWeight }} 吨</div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-label">准时送达率</div>
                        <div class="stat-value">{{ performanceData.statistics.onTimeRate }}</div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-label">异常事件数</div>
                        <div class="stat-value">{{ performanceData.statistics.totalAbnormalEvents }}</div>
                    </div>
                </div>

                <!-- 运单明细 -->
                <h4 style="margin-top: 30px;">近期运单记录</h4>
                <el-table :data="performanceData.orderDetails" style="width: 100%" border>
                    <el-table-column prop="Order_ID" label="运单号" width="180" />
                    <el-table-column prop="Create_Time" label="创建时间" width="220" />
                    <el-table-column prop="Goods_Weight" label="货物重量(吨)" />
                    <el-table-column prop="Destination" label="目的地" />
                    <el-table-column prop="Transport_Status" label="状态" />
                </el-table>

                <!-- 异常明细 -->
                <h4 style="margin-top: 30px;">异常记录</h4>
                <el-table v-if="performanceData.abnormalDetails.length > 0" :data="performanceData.abnormalDetails"
                    style="width: 100%" border>
                    <el-table-column prop="Event_ID" label="事件ID" width="150" />
                    <el-table-column prop="Occur_Time" label="发生时间" width="220" />
                    <el-table-column prop="Event_Type" label="异常类型" />
                    <el-table-column prop="Description" label="描述" />
                    <el-table-column prop="Fine_Amount" label="罚款金额" />
                </el-table>
                <div v-else class="empty-state">暂无异常记录</div>
            </div>
        </div>
    </div>
</template>

<script>
    import { driverApi } from '../api'

    export default {
        name: 'DriverView',
        data() {
            // 手机号验证规则
            const validatePhone = (rule, value, callback) => {
                if (!value) {
                    callback(new Error('请输入手机号'))
                } else if (!/^1\d{10}$/.test(value)) {
                    callback(new Error('手机号格式不正确'))
                } else {
                    callback()
                }
            }

            return {
                // 司机表单数据
                driverForm: {
                    driverId: '',
                    driverName: '',
                    licenseLevel: '',
                    contact: '',
                    hireDate: '',
                    fleetId: ''
                },

                // 司机表单验证规则
                driverRules: {
                    driverId: [
                        { required: true, message: '请输入司机工号', trigger: 'blur' },
                        { max: 10, message: '工号长度不能超过10位', trigger: 'blur' }
                    ],
                    driverName: [
                        { required: true, message: '请输入司机姓名', trigger: 'blur' }
                    ],
                    licenseLevel: [
                        { required: true, message: '请选择驾照等级', trigger: 'change' }
                    ],
                    contact: [
                        { required: true, validator: validatePhone, trigger: 'blur' }
                    ],
                    hireDate: [
                        { required: true, message: '请选择入职日期', trigger: 'change' }
                    ],
                    fleetId: [
                        { required: true, message: '请输入所属车队ID', trigger: 'blur' }
                    ]
                },

                // 查询表单数据
                queryForm: {
                    driverId: '',
                    dateRange: []
                },

                // 状态标志
                submitting: false,
                querying: false,

                // 提交结果
                submitResult: null,

                // 绩效数据
                performanceData: null
            }
        },
        methods: {
            // 提交司机表单
            async submitDriverForm() {
                try {
                    // 验证表单
                    await this.$refs.driverFormRef.validate()

                    this.submitting = true
                    this.submitResult = null

                    // 调用API
                    const response = await driverApi.addDriver(this.driverForm)

                    if (response.data.code === 200) {
                        this.submitResult = {
                            type: 'success-msg',
                            message: '司机信息添加成功！'
                        }
                        alert('司机信息添加成功！')
                        // 重置表单
                        this.resetDriverForm()
                    } else {
                        this.submitResult = {
                            type: 'error-msg',
                            message: response.data.message || '提交失败'
                        }
                    }
                } catch (error) {
                    console.error('提交司机信息失败:', error)
                    this.submitResult = {
                        type: 'error-msg',
                        message: error.response?.data?.message || ''
                    }
                } finally {
                    this.submitting = false
                }
            },

            // 重置司机表单
            resetDriverForm() {
                this.driverForm = {
                    driverId: '',
                    driverName: '',
                    licenseLevel: '',
                    contact: '',
                    hireDate: '',
                    fleetId: ''
                }
                this.submitResult = null
                if (this.$refs.driverFormRef) {
                    this.$refs.driverFormRef.resetFields()
                }
            },

            // 查询司机绩效
            async queryPerformance() {
                if (!this.queryForm.driverId) {
                    alert('请输入司机工号')
                    return
                }

                try {
                    this.querying = true

                    // 准备查询参数
                    const params = {
                        driverId: this.queryForm.driverId
                    }

                    // 如果有日期范围，添加到参数
                    if (this.queryForm.dateRange && this.queryForm.dateRange.length === 2) {
                        params.startDate = this.queryForm.dateRange[0]
                        params.endDate = this.queryForm.dateRange[1]
                    }

                    // 调用API
                    const response = await driverApi.getPerformance(
                        params.driverId,
                        params.startDate,
                        params.endDate
                    )

                    if (response.data.code === 200) {
                        this.performanceData = response.data.data
                    } else {
                        this.$message.error(response.data.message || '查询失败')
                        this.performanceData = null
                    }
                } catch (error) {
                    console.error('查询司机绩效失败:', error)
                    this.$message.error(error.response?.data?.message || '网络错误，请稍后重试')
                    this.performanceData = null
                } finally {
                    this.querying = false
                }
            }
        }
    }
</script>