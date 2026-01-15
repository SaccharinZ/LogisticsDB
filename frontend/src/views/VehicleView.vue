<template>
    <div>
        <h1 class="page-title">车辆管理</h1>

        <!-- 车辆信息录入 -->
        <div class="card">
            <h2>录入车辆信息</h2>
            <div class="form-container">
                <el-form :model="vehicleForm" :rules="vehicleRules" ref="vehicleFormRef" label-width="130px">
                    <el-form-item label="车牌号码" prop="licensePlate">
                        <el-input v-model="vehicleForm.licensePlate" placeholder="请输入车牌号，如：沪A12345" />
                    </el-form-item>

                    <el-form-item label="最大载重(吨)" prop="maxLoad">
                        <el-input-number v-model="vehicleForm.maxLoad" :min="0.1" :step="0.1" :precision="1"
                            placeholder="请输入最大载重" />
                    </el-form-item>

                    <el-form-item label="最大容积(立方米)" prop="maxVolume">
                        <el-input-number v-model="vehicleForm.maxVolume" :min="0.1" :step="0.1" :precision="1"
                            placeholder="请输入最大容积" />
                    </el-form-item>

                    <el-form-item label="当前状态" prop="currentStatus">
                        <el-select v-model="vehicleForm.currentStatus" placeholder="请选择车辆状态">
                            <el-option label="空闲" value="空闲" />
                            <el-option label="运输中" value="运输中" />
                            <el-option label="维修中" value="维修中" />
                            <el-option label="异常" value="异常" />
                        </el-select>
                    </el-form-item>

                    <el-form-item label="所属车队" prop="fleetId">
                        <el-input v-model="vehicleForm.fleetId" placeholder="请输入车队ID，如：F001" />
                    </el-form-item>

                    <el-form-item label="购买日期" prop="buyDate">
                        <el-date-picker v-model="vehicleForm.buyDate" type="date" placeholder="选择购买日期"
                            value-format="YYYY-MM-DD" />
                    </el-form-item>

                    <el-form-item>
                        <el-button type="primary" @click="submitVehicleForm" :loading="submitting">
                            提交
                        </el-button>
                        <el-button @click="resetVehicleForm">重置</el-button>
                    </el-form-item>
                </el-form>

                <div v-if="submitResult" :class="submitResult.type">
                    {{ submitResult.message }}
                </div>
            </div>
        </div>

        <!-- 可用车辆查询 -->
        <div class="card">
            <h2>查询可用车辆</h2>
            <div class="form-container">
                <el-form :model="queryForm" label-width="120px">
                    <el-form-item label="货物重量(吨)">
                        <el-input-number v-model="queryForm.weight" :min="0.1" :step="0.1" :precision="1"
                            placeholder="请输入货物重量" />
                    </el-form-item>

                    <el-form-item label="货物体积(立方米)">
                        <el-input-number v-model="queryForm.volume" :min="0.1" :step="0.1" :precision="1"
                            placeholder="请输入货物体积" />
                    </el-form-item>

                    <el-form-item label="配送中心">
                        <el-input v-model="queryForm.dcId" placeholder="可选：配送中心ID，如：DC001" />
                    </el-form-item>

                    <el-form-item>
                        <el-button type="primary" @click="queryAvailableVehicles" :loading="querying">
                            查询可用车辆
                        </el-button>
                    </el-form-item>
                </el-form>
            </div>

            <!-- 查询结果 -->
            <div v-if="vehicles.length > 0" class="table-container">
                <h3>可用车辆列表</h3>
                <el-table :data="vehicles" style="width: 100%" border>
                    <el-table-column prop="License_Plate" label="车牌号" width="120" />
                    <el-table-column prop="Max_Load" label="最大载重(吨)" width="120" />
                    <el-table-column prop="Current_Load" label="当前载重(吨)" width="120" />
                    <el-table-column prop="Available_Load" label="可用载重(吨)" width="120" />
                    <el-table-column prop="Available_Load_Percent" label="可用百分比" width="120">
                        <template #default="{ row }">
                            {{ row.Available_Load_Percent }}%
                        </template>
                    </el-table-column>
                    <el-table-column prop="Max_Volume" label="最大容积(m³)" width="120" />
                    <el-table-column prop="Current_Status" label="状态" width="100" />
                    <el-table-column prop="Fleet_Name" label="所属车队" />
                    <el-table-column prop="Driver_Name" label="主管司机" />
                </el-table>
            </div>

            <div v-else-if="vehicles.length === 0 && hasQueried" class="empty-state">
                没有找到符合条件的可用车辆
            </div>
        </div>
    </div>
</template>

<script>
    import { vehicleApi } from '../api'

    export default {
        name: 'VehicleView',
        data() {
            // 车牌号验证规则
            const validatePlate = (rule, value, callback) => {
                if (!value) {
                    callback(new Error('请输入车牌号'))
                } else if (!/^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-HJ-NP-Z][A-HJ-NP-Z0-9]{4,5}[A-HJ-NP-Z0-9挂学警港澳]$/.test(value)) {
                    callback(new Error('车牌号格式不正确'))
                } else {
                    callback()
                }
            }

            return {
                // 车辆表单数据
                vehicleForm: {
                    licensePlate: '',
                    maxLoad: 0,
                    maxVolume: 0,
                    currentStatus: '空闲',
                    fleetId: '',
                    buyDate: ''
                },

                // 车辆表单验证规则
                vehicleRules: {
                    licensePlate: [
                        { required: true, validator: validatePlate, trigger: 'blur' }
                    ],
                    maxLoad: [
                        { required: true, message: '请输入最大载重', trigger: 'blur' },
                        { type: 'number', min: 0.1, message: '最大载重必须大于0', trigger: 'blur' }
                    ],
                    maxVolume: [
                        { required: true, message: '请输入最大容积', trigger: 'blur' },
                        { type: 'number', min: 0.1, message: '最大容积必须大于0', trigger: 'blur' }
                    ],
                    fleetId: [
                        { required: true, message: '请输入所属车队ID', trigger: 'blur' }
                    ],
                    buyDate: [
                        { required: true, message: '请选择购买日期', trigger: 'change' }
                    ]
                },

                // 查询表单数据
                queryForm: {
                    weight: 1.0,
                    volume: 2.0,
                    dcId: ''
                },

                // 状态标志
                submitting: false,
                querying: false,
                hasQueried: false,

                // 提交结果
                submitResult: null,

                // 车辆数据
                vehicles: []
            }
        },
        methods: {
            // 提交车辆表单
            async submitVehicleForm() {
                try {
                    // 验证表单
                    await this.$refs.vehicleFormRef.validate()

                    this.submitting = true
                    this.submitResult = null

                    // 调用API
                    const response = await vehicleApi.addVehicle(this.vehicleForm)

                    if (response.data.code === 200) {
                        this.submitResult = {
                            type: 'success-msg',
                            message: '车辆信息添加成功！'
                        }
                        alert('车辆信息添加成功！')
                        // 重置表单
                        this.resetVehicleForm()
                    } else {
                        this.submitResult = {
                            type: 'error-msg',
                            message: response.data.message || '提交失败'
                        }
                    }
                } catch (error) {
                    console.error('提交车辆信息失败:', error)
                    this.submitResult = {
                        type: 'error-msg',
                        message: error.response?.data?.message || ''
                    }
                } finally {
                    this.submitting = false
                }
            },

            // 重置车辆表单
            resetVehicleForm() {
                this.vehicleForm = {
                    licensePlate: '',
                    maxLoad: 0,
                    maxVolume: 0,
                    currentStatus: '空闲',
                    fleetId: '',
                    buyDate: ''
                }
                this.submitResult = null
                if (this.$refs.vehicleFormRef) {
                    this.$refs.vehicleFormRef.resetFields()
                }
            },

            // 查询可用车辆
            async queryAvailableVehicles() {
                if (!this.queryForm.weight || !this.queryForm.volume) {
                    alert('请输入货物重量和体积')
                    return
                }

                try {
                    this.querying = true
                    this.hasQueried = true

                    // 调用API
                    const response = await vehicleApi.getAvailableVehicles(
                        this.queryForm.weight,
                        this.queryForm.volume,
                        this.queryForm.dcId
                    )

                    if (response.data.code === 200) {
                        this.vehicles = response.data.data || []
                        if (this.vehicles.length === 0) {
                            this.$message.info('没有找到符合条件的可用车辆')
                        }
                    } else {
                        this.$message.error(response.data.message || '查询失败')
                        this.vehicles = []
                    }
                } catch (error) {
                    console.error('查询可用车辆失败:', error)
                    this.$message.error(error.response?.data?.message || '网络错误，请稍后重试')
                    this.vehicles = []
                } finally {
                    this.querying = false
                }
            }
        }
    }
</script>
