<template>
    <div>
        <h1 class="page-title">智慧物流管理系统</h1>

        <div class="card">
            <div class="des-bar">
                <div class="des">
                    <h2>系统功能概述</h2>
                    <p>欢迎使用智慧物流管理系统，请选择上方菜单进行操作。</p>
                </div>
                <div class="api-status">
                    后端api状态: <span>{{ apiStatus }}</span>
                </div>
            </div>

            <el-row :gutter="20">
                <el-col :span="8">
                    <div style="padding: 20px; text-align: center;">
                        <el-icon size="40" color="#409eff">
                            <User />
                        </el-icon>
                        <h4>司机管理</h4>
                        <p>录入司机基本信息，查询司机绩效</p>
                    </div>
                </el-col>
                <el-col :span="8">
                    <div style="padding: 20px; text-align: center;">
                        <el-icon size="40" color="#67c23a">
                            <Van />
                        </el-icon>
                        <h4>车辆管理</h4>
                        <p>管理车辆信息，查询可用车辆</p>
                    </div>
                </el-col>
                <el-col :span="8">
                    <div style="padding: 20px; text-align: center;">
                        <el-icon size="40" color="#e6a23c">
                            <Document />
                        </el-icon>
                        <h4>运单分配</h4>
                        <p>分配运单给车辆，自动超载校验</p>
                    </div>
                </el-col>
                <el-col :span="8">
                    <div style="padding: 20px; text-align: center;">
                        <el-icon size="40" color="#f56c6c">
                            <Warning />
                        </el-icon>
                        <h4>异常记录</h4>
                        <p>记录运输异常事件</p>
                    </div>
                </el-col>
                <el-col :span="8">
                    <div style="padding: 20px; text-align: center;">
                        <el-icon size="40" color="#909399">
                            <OfficeBuilding />
                        </el-icon>
                        <h4>车队查询</h4>
                        <p>查询车队负载情况</p>
                    </div>
                </el-col>
                <el-col :span="8">
                    <div style="padding: 20px; text-align: center;">
                        <el-icon size="40" color="#303133">
                            <DataAnalysis />
                        </el-icon>
                        <h4>统计报表</h4>
                        <p>查看车队月度报表</p>
                    </div>
                </el-col>
            </el-row>
        </div>
    </div>
</template>

<script>
    import { healthApi } from '../api'
    import {
        User, Van, Document, Warning,
        OfficeBuilding, DataAnalysis
    } from '@element-plus/icons-vue'

    export default {
        name: 'HomeView',
        components: {
            User, Van, Document, Warning,
            OfficeBuilding, DataAnalysis
        },
        data() {
            return {
                apiStatus: '检查中...'
            }
        },
        mounted() {
            // 检查API状态
            this.checkApiStatus()
        },
        methods: {
            async checkApiStatus() {
                try {
                    const response = await healthApi.checkHealth()
                    if (response.data.code === 200) {
                        this.apiStatus = '正常'
                    } else {
                        this.apiStatus = '异常'
                    }
                } catch (error) {
                    this.apiStatus = '连接失败'
                }
            }
        }
    }
</script>

<style lang="css" scoped>
    .des-bar {
        display: flex;
        justify-content: space-between;
        margin-bottom: 30px;
    }

    .api-status {
        font-size: large;
    }

    .api-status span {
        color: #409eff;
    }
</style>