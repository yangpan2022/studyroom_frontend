<template>
  <div class="seat-page">

    <!-- 左上角返回按钮 -->
    <div class="top-nav">
      <button class="back-btn" @click="router.back()">
        <el-icon><ArrowLeft /></el-icon>
        返回
      </button>
    </div>

    <!-- 顶部标题 -->
    <div class="page-header">
      <div class="header-left">
        <div>
          <h1 class="page-title">座位选择</h1>
          <p class="page-subtitle">请选择一个可用座位进行预约</p>
        </div>
      </div>

      <!-- 图例 -->
      <div class="legend">
        <span class="legend-item"><span class="dot dot-available"></span>可预约</span>
        <span class="legend-item"><span class="dot dot-reserved"></span>已预约</span>
        <span class="legend-item"><span class="dot dot-occupied"></span>使用中</span>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="state-wrap">
      <el-icon class="is-loading" :size="28" color="#909399"><Loading /></el-icon>
    </div>

    <!-- 空状态 -->
    <div v-else-if="seats.length === 0" class="state-wrap">
      <el-empty description="该自习室暂无座位" />
    </div>

    <!-- 座位网格 -->
    <div v-else class="seat-grid">
      <div
        v-for="seat in seats"
        :key="seat.seatId"
        :class="['seat-card', `seat-${seat.status}`, { clickable: seat.status === 'available' }]"
        @click="seat.status === 'available' && openDialog(seat)"
      >
        <span class="seat-number">{{ seat.seatNumber }}</span>
        <span class="seat-label">{{ statusLabel(seat.status) }}</span>
      </div>
    </div>

    <!-- 预约弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      title="预约座位"
      width="420px"
      :close-on-click-modal="false"
      class="reserve-dialog"
    >
      <div class="dialog-seat-info">
        <span class="dialog-seat-number">{{ selectedSeat?.seatNumber }}</span>
        <span class="dialog-seat-tag">可预约</span>
      </div>

      <el-form :model="form" label-position="top" class="reserve-form">
        <el-form-item label="开始时间">
          <el-date-picker
            v-model="form.startTime"
            type="datetime"
            placeholder="请选择开始时间"
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DDTHH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="结束时间">
          <el-date-picker
            v-model="form.endTime"
            type="datetime"
            placeholder="请选择结束时间"
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DDTHH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <button class="cancel-btn" @click="dialogVisible = false">取消</button>
          <button class="confirm-btn" :disabled="submitting" @click="submitReservation">
            {{ submitting ? '提交中...' : '确认预约' }}
          </button>
        </div>
      </template>
    </el-dialog>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Loading, ArrowLeft } from '@element-plus/icons-vue'
import { getSeatsByRoom } from '@/api/seat'
import { createReservation } from '@/api/reservation'

const route = useRoute()
const router = useRouter()
const roomId = route.params.roomId

const seats = ref([])
const loading = ref(false)

// 弹窗状态
const dialogVisible = ref(false)
const selectedSeat = ref(null)
const submitting = ref(false)
const form = ref({ startTime: '', endTime: '' })

// 状态文字映射
const statusLabel = (status) => {
  const map = { available: '可预约', reserved: '已预约', occupied: '使用中' }
  return map[status] ?? status
}

// 加载座位
const fetchSeats = async () => {
  loading.value = true
  try {
    seats.value = await getSeatsByRoom(roomId)
  } catch (e) {
    console.error('获取座位列表失败', e)
    ElMessage.error('获取座位列表失败')
  } finally {
    loading.value = false
  }
}

// 打开弹窗
const openDialog = (seat) => {
  selectedSeat.value = seat
  form.value = { startTime: '', endTime: '' }
  dialogVisible.value = true
}

// 提交预约
const submitReservation = async () => {
  if (!form.value.startTime || !form.value.endTime) {
    ElMessage.warning('请填写完整的预约时间')
    return
  }
  submitting.value = true
  try {
    await createReservation({
      userId: 1,                        // TODO: 替换为实际登录用户 ID
      seatId: selectedSeat.value.seatId,
      startTime: form.value.startTime,
      endTime: form.value.endTime
    })
    ElMessage.success('预约成功！')
    dialogVisible.value = false
    fetchSeats()   // 刷新座位列表
  } catch (e) {
    ElMessage.error('预约失败，请重试')
  } finally {
    submitting.value = false
  }
}

onMounted(fetchSeats)
</script>

<style scoped>
/* ===== 页面基础 ===== */
.seat-page {
  background: #f5f6f7;
  padding: 0 0 48px;
  box-sizing: border-box;
}

/* ===== 顶部导航条（普通流，不遮内容）===== */
.top-nav {
  width: 100%;
  padding: 16px 20px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
}

/* ===== 顶部标题区 ===== */
.page-header {
  max-width: 860px;
  margin: 0 auto 32px;
  padding: 0 24px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.header-left {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  background: #111;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #fff;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}

.back-btn:hover {
  background: #333;
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

/* ===== 图例 ===== */
.legend {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #666;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}

.dot-available { background: #22c55e; }
.dot-reserved  { background: #f97316; }
.dot-occupied  { background: #ef4444; }

/* ===== 座位网格 ===== */
.seat-grid {
  max-width: 860px;
  margin: 0 auto;
  padding: 0 24px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: 12px;
}

/* ===== 座位卡片 ===== */
.seat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 16px 8px;
  border-radius: 10px;
  cursor: default;
  transition: transform 0.12s, box-shadow 0.12s;
  user-select: none;
}

.seat-card.clickable {
  cursor: pointer;
}

.seat-card.clickable:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

/* available */
.seat-available {
  background: #f0fdf4;
  border: 1.5px solid #bbf7d0;
}

.seat-available .seat-number { color: #15803d; }
.seat-available .seat-label  { color: #22c55e; }

/* reserved */
.seat-reserved {
  background: #fff7ed;
  border: 1.5px solid #fed7aa;
  opacity: 0.85;
}

.seat-reserved .seat-number { color: #c2410c; }
.seat-reserved .seat-label  { color: #f97316; }

/* occupied */
.seat-occupied {
  background: #fef2f2;
  border: 1.5px solid #fecaca;
  opacity: 0.85;
}

.seat-occupied .seat-number { color: #b91c1c; }
.seat-occupied .seat-label  { color: #ef4444; }

.seat-number {
  font-size: 15px;
  font-weight: 700;
}

.seat-label {
  font-size: 11px;
  font-weight: 500;
}

/* ===== Loading / Empty ===== */
.state-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

/* ===== 弹窗内容 ===== */
.dialog-seat-info {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.dialog-seat-number {
  font-size: 20px;
  font-weight: 700;
  color: #111;
}

.dialog-seat-tag {
  padding: 2px 10px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #16a34a;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.reserve-form {
  margin-top: 4px;
}

/* 弹窗底部按钮 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.cancel-btn {
  padding: 8px 20px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  color: #555;
  cursor: pointer;
  transition: background 0.15s;
}

.cancel-btn:hover {
  background: #f3f4f6;
}

.confirm-btn {
  padding: 8px 22px;
  background: #111;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}

.confirm-btn:hover:not(:disabled) {
  background: #333;
}

.confirm-btn:disabled {
  background: #d1d5db;
  color: #9ca3af;
  cursor: not-allowed;
}

/* ===== 响应式 ===== */
@media (max-width: 768px) {
  .seat-page { padding: 32px 0; }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 20px;
  }

  .seat-grid {
    grid-template-columns: repeat(auto-fill, minmax(76px, 1fr));
    gap: 10px;
  }
}

@media (max-width: 480px) {
  .seat-page { padding: 20px 0; }

  .page-header,
  .seat-grid {
    padding: 0 16px;
  }

  .page-title { font-size: 20px; }

  .seat-grid {
    grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
    gap: 8px;
  }

  .seat-card {
    padding: 12px 4px;
  }

  .seat-number { font-size: 13px; }
  .seat-label  { font-size: 10px; }
}
</style>