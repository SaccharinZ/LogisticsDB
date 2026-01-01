<template>
    <div>
        <h1 class="page-title">异常记录管理</h1>

        <!-- 异常事件录入 -->
        <div class="card">
            <h2>录入异常事件</h2>
            <div class="form-container">
                <el-form :model="abnormalForm" :rules="abnormalRules" ref="abnormalFormRef" label-width="120px">
                    <el-form-item label="事件ID" prop="eventId">
                        <el-input v-model="abnormalForm.eventId" placeholder="请输入事件ID，如：EV202512001" />
                    </el-form-item>

                    <el-form-item label="车牌号" prop="licensePlate">
                        <el-input v-model="abnormalForm.licensePlate" placeholder="请输入车牌号，如：沪A12345" />
                    </el-form-item>

                    <el-form-item label="司机ID" prop="driverId">
                        <el-input v-model="abnormalForm.driverId" placeholder="请输入司机工号，如：D001" />
                    </el-form-item>

                    <el-form-item label="异常类型" prop="eventType">
                        <el-select v-model="abnormalForm.eventType" placeholder="请选择异常类型">
                            <el-option label="运输中异常" value="运输中异常" />
                            <el-option label="空闲时异常" value="空闲时异常" />
                        </el-select>
                    </el-form-item>

                    <el-form-item label="异常描述" prop="description">
                        <el-input v-model="abnormalForm.description" placeholder="请输入异常描述" type="textarea" :rows="3" />
                    </el-form-item>

                    <el-form-item label="罚款金额(元)" prop="fineAmount">
                        <el-input-number v-model="abnormalForm.fineAmount" :min="0" :step="100" :precision="2"
                            placeholder="请输入罚款金额" />
                    </el-form-item>

                    <el-form-item label="处理状态" prop="handleStatus">
                        <el-select v-model="abnormalForm.handleStatus" placeholder="请选择处理状态">
                            <el-option label="未处理" value="未处理" />
                            <el-option label="已处理" value="已处理" />
                        </el-select>
                    </el-form-item>

                    <el-form-item>
                        <el-button type="primary" @click="submitAbnormalForm" :loading="submitting">
                            提交异常记录
                        </el-button>
                        <el-button @click="resetAbnormalForm">重置</el-button>
                    </el-form-item>
                </el-form>

                <div v-if="submitResult" :class="submitResult.type">
                    {{ submitResult.message }}
                </div>
            </div>
        </div>

        <!-- 说明 -->
        <div class="card">
            <h3>异常处理说明</h3>
            <p>
                1. "运输中异常"会自动将车辆状态更新为"异常"<br>
                2. "空闲时异常"不会自动更新车辆状态<br>
                3. 异常记录可用于司机绩效考核<br>
                4. 处理状态可用于跟踪异常处理进度
            </p>
        </div>
    </div>
</template>

<script>
    import { abnormalApi } from '../api'

    export default {
        name: 'AbnormalView',
        data() {
            return {
                // 异常表单数据
                abnormalForm: {
                    eventId: '',
                    licensePlate: '',
                    driverId: '',
                    eventType: '运输中异常',
                    description: '',
                    fineAmount: 0,
                    handleStatus: '未处理'
                },

                // 异常表单验证规则
                abnormalRules: {
                    eventId: [
                        { required: true, message: '请输入事件ID', trigger: 'blur' }
                    ],
                    licensePlate: [
                        { required: true, message: '请输入车牌号', trigger: 'blur' }
                    ],
                    driverId: [
                        { required: true, message: '请输入司机工号', trigger: 'blur' }
                    ],
                    eventType: [
                        { required: true, message: '请选择异常类型', trigger: 'change' }
                    ],
                    description: [
                        { required: true, message: '请输入异常描述', trigger: 'blur' }
                    ],
                    fineAmount: [
                        { type: 'number', min: 0, message: '罚款金额不能为负数', trigger: 'blur' }
                    ]
                },

                // 状态标志
                submitting: false,

                // 提交结果
                submitResult: null
            }
        },
        methods: {
            // 提交异常表单
            async submitAbnormalForm() {
                try {
                    // 验证表单
                    await this.$refs.abnormalFormRef.validate()

                    this.submitting = true
                    this.submitResult = null

                    // 调用API
                    const response = await abnormalApi.addAbnormalEvent(this.abnormalForm)

                    if (response.data.code === 200) {
                        this.submitResult = {
                            type: 'success-msg',
                            message: ''
                        }
                        alert(`异常事件记录成功！发生时间：${response.data.data.occurTime}`)
                        // 重置表单
                        this.resetAbnormalForm()
                    } else {
                        this.submitResult = {
                            type: 'error-msg',
                            message: response.data.message || '提交失败'
                        }
                    }
                } catch (error) {
                    console.error('提交异常事件失败:', error)
                    this.submitResult = {
                        type: 'error-msg',
                        message: error.response?.data?.message || ''
                    }
                } finally {
                    this.submitting = false
                }
            },

            // 重置异常表单
            resetAbnormalForm() {
                this.abnormalForm = {
                    eventId: '',
                    licensePlate: '',
                    driverId: '',
                    eventType: '运输中异常',
                    description: '',
                    fineAmount: 0,
                    handleStatus: '未处理'
                }
                this.submitResult = null
                if (this.$refs.abnormalFormRef) {
                    this.$refs.abnormalFormRef.resetFields()
                }
            }
        }
    }
</script>