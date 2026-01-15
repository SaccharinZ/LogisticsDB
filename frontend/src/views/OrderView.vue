<template>
    <div>
        <h1 class="page-title">运单分配</h1>

        <!-- 创建运单 -->
        <div class="card">
            <h2>创建新运单</h2>
            <div class="form-container">
                <el-form :model="orderForm" :rules="orderRules" ref="orderFormRef" label-width="130px">
                    <el-form-item label="运单号" prop="orderId">
                        <el-input v-model="orderForm.orderId" placeholder="请输入运单号，如：ORD202512001" />
                    </el-form-item>

                    <el-form-item label="货物重量(吨)" prop="goodsWeight">
                        <el-input-number v-model="orderForm.goodsWeight" :min="0.1" :step="0.1" :precision="1"
                            placeholder="请输入货物重量" />
                    </el-form-item>

                    <el-form-item label="货物体积(立方米)" prop="goodsVolume">
                        <el-input-number v-model="orderForm.goodsVolume" :min="0.1" :step="0.1" :precision="1"
                            placeholder="请输入货物体积" />
                    </el-form-item>

                    <el-form-item label="目的地" prop="destination">
                        <el-input v-model="orderForm.destination" placeholder="请输入详细目的地地址" type="textarea" :rows="2" />
                    </el-form-item>

                    <el-form-item label="分配车辆" prop="licensePlate">
                        <el-input v-model="orderForm.licensePlate" placeholder="请输入车牌号，如：沪A12345" />
                        <div style="margin-top: 10px; font-size: 12px; color: #909399;">
                            提示：请先使用车辆管理页面查询可用车辆
                        </div>
                    </el-form-item>

                    <el-form-item>
                        <el-button type="primary" @click="submitOrderForm" :loading="submitting">
                            创建运单
                        </el-button>
                        <el-button @click="resetOrderForm">重置</el-button>
                    </el-form-item>
                </el-form>

                <div v-if="submitResult" :class="submitResult.type">
                    {{ submitResult.message }}
                </div>
            </div>
        </div>

        <!-- 超载校验说明 -->
        <div class="card">
            <h3>超载校验说明</h3>
            <p>
                1. 系统会自动检查车辆当前负载，防止超载分配<br>
                2. 当车辆载重超过最大载重时，会提示"超出最大载重"<br>
                3. 运单创建成功后，车辆状态会自动更新为"运输中"<br>
                4. 运单签收后，车辆状态会自动更新为"空闲"
            </p>
        </div>
    </div>
</template>

<script>
    import { orderApi } from '../api'

    export default {
        name: 'OrderView',
        data() {
            return {
                // 运单表单数据
                orderForm: {
                    orderId: '',
                    goodsWeight: 0,
                    goodsVolume: 0,
                    destination: '',
                    licensePlate: ''
                },

                // 运单表单验证规则
                orderRules: {
                    orderId: [
                        { required: true, message: '请输入运单号', trigger: 'blur' }
                    ],
                    goodsWeight: [
                        { required: true, message: '请输入货物重量', trigger: 'blur' },
                        { type: 'number', min: 0.1, message: '货物重量必须大于0', trigger: 'blur' }
                    ],
                    goodsVolume: [
                        { required: true, message: '请输入货物体积', trigger: 'blur' },
                        { type: 'number', min: 0.1, message: '货物体积必须大于0', trigger: 'blur' }
                    ],
                    destination: [
                        { required: true, message: '请输入目的地', trigger: 'blur' }
                    ],
                    licensePlate: [
                        { required: true, message: '请输入车牌号', trigger: 'blur' }
                    ]
                },

                // 状态标志
                submitting: false,

                // 提交结果
                submitResult: null
            }
        },
        methods: {
            // 提交运单表单
            async submitOrderForm() {
                try {
                    // 验证表单
                    await this.$refs.orderFormRef.validate()

                    this.submitting = true
                    this.submitResult = null

                    // 调用API
                    const response = await orderApi.createOrder(this.orderForm)

                    if (response.data.code === 200) {
                        this.submitResult = {
                            type: 'success-msg',
                            message: ''
                        }
                        alert(`运单创建成功！创建时间：${response.data.data.createTime}`)
                        // 重置表单
                        this.resetOrderForm()
                    } else {
                        this.submitResult = {
                            type: 'error-msg',
                            message: response.data.message || '创建失败'
                        }
                    }
                } catch (error) {
                    console.error('创建运单失败:', error)

                    // 处理超载错误
                    if (error.response?.data?.message?.includes('超出最大载重')) {
                        this.submitResult = {
                            type: 'error-msg',
                            message: '超出车辆最大载重，请选择其他车辆或减少货物重量'
                        }
                    } else {
                        this.submitResult = {
                            type: 'error-msg',
                            message: error.response?.data?.message || ''
                        }
                    }
                } finally {
                    this.submitting = false
                }
            },

            // 重置运单表单
            resetOrderForm() {
                this.orderForm = {
                    orderId: '',
                    goodsWeight: 0,
                    goodsVolume: 0,
                    destination: '',
                    licensePlate: ''
                }
                this.submitResult = null
                if (this.$refs.orderFormRef) {
                    this.$refs.orderFormRef.resetFields()
                }
            }
        }
    }
</script>