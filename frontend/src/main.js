import { createApp } from 'vue'
import App from './App.vue'
import router from './router.js'  // 导入路由
import './style.css'

// 导入Element Plus和样式
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

const app = createApp(App)

// 使用Element Plus和路由
app.use(ElementPlus)
app.config.globalProperties.$message = ElementPlus.ElMessage
app.use(router)

app.mount('#app')