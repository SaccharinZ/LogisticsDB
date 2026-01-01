<template>
  <div id="app">
    <!-- 导航栏 -->
    <nav class="nav-container">
      <ul class="nav-menu">
        <li>
          <router-link to="/" exact-active-class="active">首页</router-link>
        </li>
        <li>
          <router-link to="/driver" active-class="active">司机管理</router-link>
        </li>
        <li>
          <router-link to="/vehicle" active-class="active">车辆管理</router-link>
        </li>
        <li>
          <router-link to="/order" active-class="active">运单分配</router-link>
        </li>
        <li>
          <router-link to="/abnormal" active-class="active">异常记录</router-link>
        </li>
        <li>
          <router-link to="/fleet" active-class="active">车队查询</router-link>
        </li>
        <li>
          <router-link to="/report" active-class="active">统计报表</router-link>
        </li>
      </ul>
    </nav>

    <!-- 路由视图 -->
    <div class="container">
      <router-view />
    </div>
  </div>
</template>

<script>
  export default {
    name: 'App',
  }
</script>