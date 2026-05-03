<template>
  <div class="layout">

    <!-- 左侧导航栏 -->
    <aside class="sidebar" :class="{ 'sidebar-collapsed': isCollapsed }">
      <div class="sidebar-brand">
        <span v-if="!isCollapsed" class="brand-text">自习室管理</span>
        <el-icon class="collapse-btn" @click="isCollapsed = !isCollapsed">
          <component :is="isCollapsed ? Expand : Fold" />
        </el-icon>
      </div>

      <nav class="sidebar-nav">
        <router-link
          v-for="item in menus"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          active-class="nav-item--active"
          :class="{ 'nav-item-collapsed': isCollapsed }"
          :title="isCollapsed ? item.label : ''"
        >
          <el-icon class="nav-icon"><component :is="item.icon" /></el-icon>
          <span v-if="!isCollapsed" class="nav-label">{{ item.label }}</span>
          <!-- 未读角标 -->
          <span v-if="item.badge && item.badge.value > 0" class="nav-badge" :class="{ 'nav-badge-collapsed': isCollapsed }">
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
        <div class="topbar-right" @click="router.push('/profile')" title="个人信息">
          <!-- 使用稳定的 src，避免 v-if 切换造成闪烁 -->
          <img
            class="topbar-avatar"
            :src="avatarSrc"
            alt="头像"
          />
          <span class="topbar-user">欢迎使用，{{ currentUser.username || '用户' }}</span>
        </div>
      </header>

      <!-- 内容区域 -->
      <div class="content">
        <router-view @notification-read="fetchUnread" />
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, provide } from 'vue'
import { useRouter } from 'vue-router'
import { House, Calendar, Bell, DataLine, Grid, Monitor, User, Fold, Expand } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getNotificationsByUser } from '@/api/notification'
import { getCurrentUser, getCurrentUserId } from '@/utils/auth'

const router = useRouter()
const isCollapsed = ref(false)

// 安全读取当前登录用户
const currentUser = getCurrentUser()
const userId = getCurrentUserId()

// 稳定的头像地址：根据角色判断
const avatarSrc = computed(() => {
  if (currentUser.role === 'student') {
    return '/avatars/student.png'
  }
  return '/avatars/user1.png'
})

// 未读数（响应式，注入到 Bell 菜单项）
const unreadCount = ref(0)

/**
 * 获取当前用户的未读通知数量，用于更新侧边栏角标。
 * 通过 provide 向下传递，子页面可通过 inject('fetchUnread') 在操作后主动调用，
 * 实现标记已读 / 删除通知后角标即时同步，无需刷新页面。
 */
const fetchUnread = async () => {
  if (!userId) return
  try {
    const data = await getNotificationsByUser(userId)
    // 统计 status 为 unread 的通知数量
    unreadCount.value = data.filter(n => n.status === 'unread').length
  } catch {
    // 静默失败，角标拉取失败不影响主体功能
  }
}

// 向所有子页面提供 fetchUnread，子页面可通过 inject 调用来刷新角标
 provide('fetchUnread', fetchUnread)

 const isAdmin = currentUser.role !== 'student'

 // 侧边栏菜单（个人信息不放入菜单，只能通过头像入口）
 const menus = [
   { label: '自习室',   path: '/rooms',         icon: House    },
   ...(isAdmin ? [{ label: '座位管理', path: '/seats/manage',   icon: Grid }] : []),
   ...(isAdmin ? [{ label: '用户管理', path: '/users/manage',   icon: User }] : []),
   { label: '我的预约', path: '/reservations',   icon: Calendar },
   { label: '通知',     path: '/notifications',  icon: Bell,    badge: unreadCount },
   { label: '实时监控', path: '/monitor', icon: Monitor },
   { label: '数据分析', path: '/analysis',       icon: DataLine }
 ]

// 未读角标定时轮询（30s 一次）
let unreadTimer = null

onMounted(() => {
  // 若未登录（localStorge 中没有用户信息），提示并自动返回登录页
  if (!currentUser.username) {
    ElMessage.warning('请先登录')
    setTimeout(() => router.push('/login'), 1000)
    return
  }
  fetchUnread()
  // 每 30 秒刷新一次未读角标，确保 AI / 定时任务触发的新通知能及时显示
  unreadTimer = setInterval(fetchUnread, 30000)
})

onUnmounted(() => {
  clearInterval(unreadTimer)
})
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
  transition: width 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.sidebar-collapsed {
  width: 64px;
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
  justify-content: space-between;
}

.sidebar-collapsed .sidebar-brand {
  padding: 0;
  justify-content: center;
}

.collapse-btn {
  font-size: 18px;
  cursor: pointer;
  color: #555;
  transition: color 0.15s;
}

.collapse-btn:hover {
  color: #111;
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
}

.nav-item-collapsed {
  justify-content: center;
  padding: 9px 0;
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
}

.nav-badge-collapsed {
  position: absolute;
  top: 4px;
  right: 6px;
  transform: scale(0.8);
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

/* 右侧用户区域（可点击跳转个人信息） */
.topbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 4px 10px 4px 6px;
  border-radius: 8px;
  transition: background 0.15s;
}

.topbar-right:hover {
  background: #f3f4f6;
}

/* 头像图片 */
.topbar-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  border: 1.5px solid #e5e7eb;
  flex-shrink: 0;
}

/* 头像占位（无图时显示图标） */
.topbar-avatar-placeholder {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #f3f4f6;
  border: 1.5px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  flex-shrink: 0;
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