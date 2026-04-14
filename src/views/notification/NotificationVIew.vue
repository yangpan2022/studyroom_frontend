<template>
  <div class="notif-page">

    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">通知中心</h1>
      <p class="page-subtitle">查看系统消息与提醒</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="state-wrap">
      <el-icon class="is-loading" :size="28" color="#909399"><Loading /></el-icon>
    </div>

    <!-- 空状态 -->
    <div v-else-if="list.length === 0" class="state-wrap">
      <el-empty description="暂无通知消息" />
    </div>

    <!-- 通知列表 -->
    <div v-else class="notif-list">
      <div
        v-for="item in list"
        :key="item.notificationId"
        :class="['notif-item', item.status === 'unread' ? 'notif-unread' : 'notif-read']"
      >
        <!-- 未读圆点 -->
        <span v-if="item.status === 'unread'" class="unread-dot"></span>

        <!-- 内容区 -->
        <div class="notif-body">
          <p class="notif-message">{{ item.message }}</p>
          <div class="notif-meta">
            <span class="type-tag" :style="typeStyle(item.type)">{{ typeLabel(item.type) }}</span>
            <span class="divider">·</span>
            <span>{{ formatTime(item.sendTime) }}</span>
            <span class="divider">·</span>
            <span :class="item.status === 'unread' ? 'meta-unread' : 'meta-read'">
              {{ item.status === 'unread' ? '未读' : '已读' }}
            </span>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="notif-actions">
          <button
            v-if="item.status === 'unread'"
            class="btn btn-primary"
            :disabled="actionId === item.notificationId"
            @click="doMarkRead(item)"
          >
            标记已读
          </button>
          <button
            class="btn btn-ghost"
            :disabled="actionId === item.notificationId"
            @click="doDelete(item)"
          >
            删除
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue'
import { ElMessage } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import {
  getNotificationsByUser,
  markNotificationRead,
  deleteNotification
} from '@/api/notification'
import { getCurrentUserId } from '@/utils/auth'

const userId = getCurrentUserId()

/**
 * 注入来自 MainLayout 的 fetchUnread 函数。
 * 当用户在本页面执行标记已读或删除操作后，
 * 调用该函数可使侧边栏未读角标立即同步，无需刷新整个页面。
 * 若未在 MainLayout 下使用（如独立页面测试），则降级为空函数。
 */
const fetchUnread = inject('fetchUnread', () => {})

const list = ref([])
const loading = ref(false)
const actionId = ref(null)

// 类型映射
const TYPE_MAP = {
  reservation_success:   '预约成功',
  reservation_cancelled: '预约取消',
  checkin_success:       '签到成功',
  reservation_completed: '预约完成',
  seat_auto_released:    '自动释放',
  study_warning:         '学习提醒',
  system_notice:         '系统通知',
  seat_conflict_warning: '异常占用',
}

const typeLabel = (type) => TYPE_MAP[type] ?? '系统消息'

// 类型 → 颜色样式映射（背景色 + 文字色）
const TYPE_STYLE_MAP = {
  reservation_success:   { background: '#ecfdf5', color: '#22c55e' },
  reservation_cancelled: { background: '#fef3c7', color: '#92400e' },
  checkin_success:       { background: '#eff6ff', color: '#3b82f6' },
  reservation_completed: { background: '#f5f3ff', color: '#8b5cf6' },
  seat_auto_released:    { background: '#fffbeb', color: '#f59e0b' },
  study_warning:         { background: '#fef2f2', color: '#ef4444' },
  system_notice:         { background: '#f8fafc', color: '#64748b' },
  seat_conflict_warning: { background: '#fff7ed', color: '#ea580c' },
}

// 根据 type 返回对应 style 对象，未知类型降级为 system_notice 配色
const typeStyle = (type) =>
  TYPE_STYLE_MAP[type] ?? { background: '#f1f5f9', color: '#64748b' }

// 时间格式化
const formatTime = (str) => {
  if (!str) return '-'
  const d = new Date(str)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// 加载通知
const fetchList = async () => {
  if (!userId) return
  loading.value = true
  try {
    const data = await getNotificationsByUser(userId)
    // 倒序（最新的在最前）
    list.value = [...data].sort((a, b) =>
      new Date(b.sendTime) - new Date(a.sendTime)
    )
  } catch (e) {
    ElMessage.error('加载通知失败')
  } finally {
    loading.value = false
  }
}

const doMarkRead = async (item) => {
  actionId.value = item.notificationId
  try {
    await markNotificationRead(item.notificationId)
    item.status = 'read'
    ElMessage.success('已标记为已读')
    // 通知 MainLayout 刷新侧边栏未读角标
    fetchUnread()
  } catch (e) {
    ElMessage.error('操作失败，请重试')
  } finally {
    actionId.value = null
  }
}

// 删除（本地移除）
const doDelete = async (item) => {
  actionId.value = item.notificationId
  try {
    await deleteNotification(item.notificationId)
    list.value = list.value.filter(n => n.notificationId !== item.notificationId)
    ElMessage.success('通知已删除')
    // 通知 MainLayout 刷新侧边栏未读角标
    fetchUnread()
  } catch (e) {
    ElMessage.error('删除失败，请重试')
  } finally {
    actionId.value = null
  }
}

onMounted(fetchList)
</script>

<style scoped>
.notif-page {
  background: #f5f6f7;
  padding: 40px 0 48px;
  box-sizing: border-box;
}

/* 标题 */
.page-header {
  max-width: 800px;
  margin: 0 auto 28px;
  padding: 0 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  color: #111;
  margin: 0 0 4px;
}

.page-subtitle {
  font-size: 14px;
  color: #999;
  margin: 0;
}

/* 列表 */
.notif-list {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 每条通知 */
.notif-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  background: #fff;
  border-radius: 10px;
  transition: background 0.15s;
}

.notif-item:hover {
  background: #fafafa;
}

.notif-unread {
  border-left: 3px solid #ef4444;
}

.notif-read {
  border-left: 3px solid transparent;
  opacity: 0.85;
}

/* 未读圆点 */
.unread-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
  flex-shrink: 0;
}

/* 内容 */
.notif-body {
  flex: 1;
  min-width: 0;
}

.notif-message {
  font-size: 14px;
  font-weight: 500;
  color: #111;
  margin: 0 0 6px;
  line-height: 1.5;
  word-break: break-word;
}

.notif-read .notif-message {
  color: #6b7280;
  font-weight: 400;
}

/* meta 行 */
.notif-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  font-size: 12px;
  color: #9ca3af;
}

.type-tag {
  padding: 1px 8px;
  background: #f3f4f6;
  border-radius: 20px;
  color: #555;
  font-size: 11px;
}

.divider { color: #d1d5db; }

.meta-unread { color: #ef4444; font-weight: 500; }
.meta-read   { color: #9ca3af; }

/* 操作按钮 */
.notif-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.btn {
  padding: 7px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  border: none;
  transition: background 0.15s, opacity 0.15s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #111;
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  background: #333;
}

.btn-ghost {
  background: #fff;
  color: #555;
  border: 1px solid #e5e7eb;
}

.btn-ghost:hover:not(:disabled) {
  background: #f3f4f6;
}

/* Loading / Empty */
.state-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

/* 响应式 */
@media (max-width: 600px) {
  .page-header,
  .notif-list {
    padding: 0 16px;
  }

  .page-title { font-size: 20px; }

  .notif-item {
    flex-wrap: wrap;
    gap: 10px;
  }

  .notif-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>