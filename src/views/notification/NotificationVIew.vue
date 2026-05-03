<template>
  <div class="notif-page">

    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">通知中心</h1>
        <p class="page-subtitle">查看系统消息与提醒</p>
      </div>
      <div class="header-right">
        <el-select v-model="filterType" placeholder="全部通知" clearable style="width: 180px;">
          <el-option label="全部通知" value="" />
          <el-option label="预约成功" value="reservation_success" />
          <el-option label="预约取消" value="reservation_cancelled" />
          <el-option label="签到成功" value="checkin_success" />
          <el-option label="即将开始" value="reservation_reminder_start" />
          <el-option label="即将结束" value="reservation_reminder_end" />
          <el-option label="预约完成" value="reservation_completed" />
          <el-option label="自动签退" value="reservation_completed_auto" />
          <el-option label="自动释放" value="seat_auto_released" />
          <el-option label="异常占用" value="seat_conflict_warning" />
          <el-option label="学习提醒" value="study_warning" />
          <el-option label="系统通知" value="system_notice" />
        </el-select>
        <el-switch v-model="onlyUnread" active-text="只看未读" style="margin-left: 12px; margin-right: 12px;" />
        <button
          class="btn btn-ghost"
          :disabled="unreadCount === 0 || processingAll"
          @click="markAllRead"
        >
          {{ processingAll ? '处理中...' : '一键已读' }}
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="state-wrap">
      <el-icon class="is-loading" :size="28" color="#909399"><Loading /></el-icon>
    </div>

    <!-- 空状态 -->
    <div v-else-if="list.length === 0" class="state-wrap">
      <el-empty description="暂无通知" />
    </div>
    <div v-else-if="filteredNotifications.length === 0" class="state-wrap">
      <el-empty description="暂无符合条件的通知" />
    </div>

    <!-- 通知列表 -->
    <div v-else class="notif-list">
      <div
        v-for="item in filteredNotifications"
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
import { ref, computed, onMounted, onUnmounted, inject } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
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

const filterType = ref('')
const onlyUnread = ref(false)
const processingAll = ref(false)

const unreadCount = computed(() => list.value.filter(item => item.status === 'unread').length)

const markAllRead = async () => {
  const unreadItems = list.value.filter(n => n.status === 'unread')
  if (unreadItems.length === 0) return
  
  try {
    await ElMessageBox.confirm('确定将所有未读通知标记为已读吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info'
    })
  } catch {
    return
  }

  processingAll.value = true
  try {
    await Promise.all(unreadItems.map(item => markNotificationRead(item.notificationId)))
    unreadItems.forEach(item => item.status = 'read')
    ElMessage.success('已全部标记为已读')
    fetchUnread()
  } catch (e) {
    ElMessage.error('部分或全部标记失败，请重试')
    fetchList() // 同步最新状态
  } finally {
    processingAll.value = false
  }
}

const filteredNotifications = computed(() => {
  let res = list.value

  if (filterType.value) {
    res = res.filter(item => item.type === filterType.value)
  }

  if (onlyUnread.value) {
    res = res.filter(item => item.status === 'unread')
  }

  return res
})

// 类型映射
const TYPE_MAP = {
  reservation_success:        '预约成功',
  reservation_cancelled:      '预约取消',
  checkin_success:            '签到成功',
  reservation_reminder_start: '即将开始',
  reservation_reminder_end:   '即将结束',
  reservation_completed:      '预约完成',
  reservation_completed_auto: '预约完成',   // 自动签退，标签与手动一致
  seat_auto_released:         '自动释放',
  study_warning:              '学习提醒',
  system_notice:              '系统通知',
  seat_conflict_warning:      '异常占用',
}

const typeLabel = (type) => TYPE_MAP[type] ?? '系统消息'

// 类型 → 颜色样式映射（背景色 + 文字色）
const TYPE_STYLE_MAP = {
  reservation_success:        { background: '#ecfdf5', color: '#22c55e' },
  reservation_cancelled:      { background: '#fef3c7', color: '#92400e' },
  checkin_success:            { background: '#eff6ff', color: '#3b82f6' },
  reservation_reminder_start: { background: '#e0e7ff', color: '#4f46e5' },
  reservation_reminder_end:   { background: '#ffe4e6', color: '#e11d48' },
  reservation_completed:      { background: '#f5f3ff', color: '#8b5cf6' },
  reservation_completed_auto: { background: '#f5f3ff', color: '#8b5cf6' },  // 与手动签退一致
  seat_auto_released:         { background: '#fffbeb', color: '#f59e0b' },
  study_warning:              { background: '#fef2f2', color: '#ef4444' },
  system_notice:              { background: '#f8fafc', color: '#64748b' },
  seat_conflict_warning:      { background: '#fff7ed', color: '#ea580c' },
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

// ──────────── 轮询自动刷新 ────────────
let pollTimer = null

/**
 * 静默刷新（不显示 loading），用于轮询。
 * 对比新旧通知 ID Set，若有新增则弹出提示。
 */
const silentRefresh = async () => {
  if (!userId) return
  try {
    const data = await getNotificationsByUser(userId)
    const sorted = [...data].sort((a, b) => new Date(b.sendTime) - new Date(a.sendTime))

    // 检测新增通知（用 ID Set 对比，准确且高效）
    const oldIds = new Set(list.value.map(n => n.notificationId))
    const newItems = sorted.filter(n => !oldIds.has(n.notificationId))

    if (newItems.length > 0) {
      ElMessage.success(`收到 ${newItems.length} 条新通知`)
      // 同步侧边栏未读角标
      fetchUnread()
    }

    list.value = sorted
  } catch (_) {
    // 轮询失败静默忽略，不打扰用户
  }
}

onMounted(() => {
  // 首次进入：带 loading 状态加载
  fetchList()
  // 每 3 秒静默刷新一次
  pollTimer = setInterval(silentRefresh, 3000)
})

onUnmounted(() => {
  clearInterval(pollTimer)
})
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
}

.header-left {
  flex-shrink: 0;
}

.header-right {
  display: flex;
  align-items: center;
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
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
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