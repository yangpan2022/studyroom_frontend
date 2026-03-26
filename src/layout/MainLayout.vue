<template>
  <div class="layout">

    <!-- 左侧导航栏 -->
    <aside class="sidebar">
      <div class="sidebar-brand">自习室管理</div>

      <nav class="sidebar-nav">
        <router-link
          v-for="item in menus"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          active-class="nav-item--active"
        >
          <el-icon class="nav-icon"><component :is="item.icon" /></el-icon>
          <span class="nav-label">{{ item.label }}</span>
          <!-- 未读角标 -->
          <span v-if="item.badge && item.badge.value > 0" class="nav-badge">
            {{ item.badge.value > 99 ? '99+' : item.badge.value }}
          </span>
        </router-link>
      </nav>
    </aside>

    <!-- 右侧主体 -->
    <div class="main">

      <!-- 顶部栏 -->
      <header class="topbar">
        <span class="topbar-title">自习室管理系统</span>
        <span class="topbar-user">欢迎使用</span>
      </header>

      <!-- 内容区域 -->
      <div class="content">
        <router-view @notification-read="fetchUnread" />
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, provide } from 'vue'
import { House, Calendar, Bell, DataLine } from '@element-plus/icons-vue'
import { getNotificationsByUser } from '@/api/notification'

const CURRENT_USER_ID = 1

// 未读数（响应式，注入到 Bell 菜单项）
const unreadCount = ref(0)

/**
 * 获取当前用户的未读通知数量，用于更新侧边栏角标。
 * 通过 provide 向下传递，子页面可通过 inject('fetchUnread') 在操作后主动调用，
 * 实现标记已读 / 删除通知后角标即时同步，无需刷新页面。
 */
const fetchUnread = async () => {
  try {
    const data = await getNotificationsByUser(CURRENT_USER_ID)
    // 统计 status 为 unread 的通知数量
    unreadCount.value = data.filter(n => n.status === 'unread').length
  } catch {
    // 静默失败，角标拉取失败不影响主体功能
  }
}

// 向所有子页面提供 fetchUnread，子页面可通过 inject 调用来刷新角标
provide('fetchUnread', fetchUnread)

const menus = [
  { label: '自习室',   path: '/rooms',         icon: House     },
  { label: '我的预约', path: '/reservations',   icon: Calendar  },
  { label: '通知',     path: '/notifications',  icon: Bell,     badge: unreadCount },
  { label: '数据分析', path: '/analysis',       icon: DataLine  },
]

onMounted(fetchUnread)
</script>

<style scoped>
/* ===== 整体布局 ===== */
.layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: #f5f6f7;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}

/* ===== 左侧导航 ===== */
.sidebar {
  width: 200px;
  flex-shrink: 0;
  background: #fff;
  border-right: 1px solid #ebebeb;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-brand {
  height: 52px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  font-size: 16px;
  font-weight: 700;
  color: #111;
  border-bottom: 1px solid #ebebeb;
  letter-spacing: 0.01em;
  flex-shrink: 0;
}

.sidebar-nav {
  padding: 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 8px;
  font-size: 14px;
  color: #555;
  text-decoration: none;
  transition: background 0.15s, color 0.15s;
  position: relative;
}

.nav-item:hover {
  background: #f3f4f6;
  color: #111;
}

.nav-item--active {
  background: #f0f0f0;
  color: #111;
  font-weight: 600;
}

.nav-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.nav-label {
  flex: 1;
}

/* 角标 */
.nav-badge {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  background: #ef4444;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  flex-shrink: 0;
}

/* ===== 右侧 ===== */
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 顶部栏 */
.topbar {
  height: 52px;
  flex-shrink: 0;
  background: #fff;
  border-bottom: 1px solid #ebebeb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}

.topbar-title {
  font-size: 15px;
  font-weight: 600;
  color: #111;
}

.topbar-user {
  font-size: 13px;
  color: #999;
}

/* 内容区域 */
.content {
  flex: 1;
  overflow-y: auto;
  background: #f5f6f7;
}
</style>