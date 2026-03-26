<template>
  <div class="reservation-page">

    <!-- 页面标题 -->
    <div class="page-header">
      <div>
        <h1 class="page-title">我的预约</h1>
        <p class="page-subtitle">查看并管理你的预约记录</p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="state-wrap">
      <el-icon class="is-loading" :size="28" color="#909399"><Loading /></el-icon>
    </div>

    <!-- 空状态 -->
    <div v-else-if="list.length === 0" class="state-wrap">
      <el-empty description="暂无预约记录" />
    </div>

    <!-- 预约列表 -->
    <div v-else class="reservation-list">
      <div v-for="item in list" :key="item.reservationId" class="reservation-item">

        <!-- 左侧信息 -->
        <div class="item-info">
          <div class="item-main">
            <span class="seat-label">座位 #{{ item.seatId }}</span>
            <span :class="['status-badge', `status-${item.status}`]">
              {{ statusText(item.status) }}
            </span>
          </div>
          <div class="item-meta">
            <span>预约号：{{ item.reservationId }}</span>
            <span class="divider">·</span>
            <span>{{ formatTime(item.startTime) }} — {{ formatTime(item.endTime) }}</span>
          </div>
        </div>

        <!-- 右侧操作 -->
        <div class="item-actions">
          <template v-if="item.status === 'reserved'">
            <button
              class="btn btn-primary"
              :disabled="loadingId === item.reservationId"
              @click="doCheckin(item)"
            >签到</button>
            <button
              class="btn btn-ghost"
              :disabled="loadingId === item.reservationId"
              @click="doCancel(item)"
            >取消</button>
          </template>
          <template v-else-if="item.status === 'checked_in'">
            <button
              class="btn btn-primary"
              :disabled="loadingId === item.reservationId"
              @click="doComplete(item)"
            >完成</button>
          </template>
          <!-- completed / cancelled: 无操作按钮 -->
        </div>

      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import {
  getReservations,
  checkIn,
  completeReservation,
  cancelReservation
} from '@/api/reservation'

const CURRENT_USER_ID = 1   // TODO: 替换为实际登录用户 ID

const list = ref([])
const loading = ref(false)
const loadingId = ref(null)  // 当前操作中的预约 ID

// 状态文字
const statusText = (status) => {
  const map = {
    reserved:   '已预约',
    checked_in: '已签到',
    completed:  '已完成',
    cancelled:  '已取消'
  }
  return map[status] ?? status
}

// 时间格式化
const formatTime = (str) => {
  if (!str) return '-'
  const d = new Date(str)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// 加载列表
const fetchList = async () => {
  loading.value = true
  try {
    list.value = await getReservations(CURRENT_USER_ID)
  } catch (e) {
    ElMessage.error('加载预约列表失败')
  } finally {
    loading.value = false
  }
}

// 公共操作包装
const doAction = async (item, fn, successMsg) => {
  loadingId.value = item.reservationId
  try {
    await fn(item.reservationId)
    ElMessage.success(successMsg)
    fetchList()
  } catch (e) {
    ElMessage.error('操作失败，请重试')
  } finally {
    loadingId.value = null
  }
}

const doCheckin  = (item) => doAction(item, checkIn,            '签到成功！')
const doComplete = (item) => doAction(item, completeReservation, '已完成预约')
const doCancel   = (item) => doAction(item, cancelReservation,   '预约已取消')

onMounted(fetchList)
</script>

<style scoped>
.reservation-page {
  background: #f5f6f7;
  padding: 40px 0 48px;
  box-sizing: border-box;
}

/* 页面标题 */
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
.reservation-list {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 每条预约 */
.reservation-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 22px;
  background: #fff;
  border-radius: 10px;
  transition: background 0.15s;
}

.reservation-item:hover {
  background: #fafafa;
}

/* 左侧信息 */
.item-info {
  flex: 1;
  min-width: 0;
}

.item-main {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.seat-label {
  font-size: 15px;
  font-weight: 600;
  color: #111;
}

/* 状态徽标 */
.status-badge {
  padding: 2px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.status-reserved {
  background: #fff7ed;
  color: #c2410c;
  border: 1px solid #fed7aa;
}

.status-checked_in {
  background: #eff6ff;
  color: #1d4ed8;
  border: 1px solid #bfdbfe;
}

.status-completed {
  background: #f0fdf4;
  color: #15803d;
  border: 1px solid #bbf7d0;
}

.status-cancelled {
  background: #f9fafb;
  color: #9ca3af;
  border: 1px solid #e5e7eb;
}

/* 次级信息 */
.item-meta {
  font-size: 13px;
  color: #999;
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.divider { color: #d1d5db; }

/* 右侧按钮 */
.item-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.btn {
  padding: 7px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
  white-space: nowrap;
  border: none;
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
  .reservation-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .item-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .page-header,
  .reservation-list {
    padding: 0 16px;
  }

  .page-title { font-size: 20px; }
}
</style>