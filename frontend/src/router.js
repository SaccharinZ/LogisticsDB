import { createRouter, createWebHistory } from 'vue-router'

// 导入页面组件
import HomeView from './views/HomeView.vue'
import DriverView from './views/DriverView.vue'
import VehicleView from './views/VehicleView.vue'
import OrderView from './views/OrderView.vue'
import AbnormalView from './views/AbnormalView.vue'
import FleetView from './views/FleetView.vue'
import ReportView from './views/ReportView.vue'

// 路由配置
const routes = [
    {
        path: '/',
        name: 'Home',
        component: HomeView
    },
    {
        path: '/driver',
        name: 'Driver',
        component: DriverView
    },
    {
        path: '/vehicle',
        name: 'Vehicle',
        component: VehicleView
    },
    {
        path: '/order',
        name: 'Order',
        component: OrderView
    },
    {
        path: '/abnormal',
        name: 'Abnormal',
        component: AbnormalView
    },
    {
        path: '/fleet',
        name: 'Fleet',
        component: FleetView
    },
    {
        path: '/report',
        name: 'Report',
        component: ReportView
    }
]

// 创建路由实例
const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router