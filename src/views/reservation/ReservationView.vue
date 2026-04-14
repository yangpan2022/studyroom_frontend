<template>
  <div class="reservation-page">

    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">我的预约</h1>
        <p class="page-subtitle">查看并管理你的预约记录</p>
      </div>
      <div class="header-right">
        <el-input
          v-model="searchQuery"
          placeholder="搜索预约号/座位号"
          clearable
          class="search-input"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-select v-model="statusFilter" placeholder="状态筛选" class="status-select" clearable>
          <el-option label="全部" value="" />
          <el-option label="未签到" value="not_checked_in" />
          <el-option label="使用中" value="checked_in" />
          <el-option label="已签退" value="completed" />
          <el-option label="已取消" value="cancelled" />
        </el-select>
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
      <div 
        v-for="item in filteredReservations" 
        :key="item.reservationId" 
        class="reservation-item"
        @click="openDetailDialog(item)"
        style="cursor: pointer;"
      >

        <!-- 左侧信息 -->
        <div class="item-info">
          <div class="item-main">
            <span class="seat-label">
              {{ item.roomName || '自习室' }} &middot; 座位 {{ item.seatNumber || item.seatId }}
            </span>
            <span class="status-display">
              <span :class="['status-dot', getStatusInfo(item).dot]"></span>
              <span :class="['status-text', getStatusInfo(item).textClass]">
                {{ getStatusInfo(item).text }}
              </span>
            </span>
          </div>
          <div class="item-meta">
            <span>预约号：{{ item.reservationId }}</span>
            <template v-if="item.location">
              <span class="divider">·</span>
              <span>{{ item.location }}</span>
            </template>
            <span class="divider">·</span>
            <span>{{ formatTime(item.startTime) }} — {{ formatTime(item.endTime) }}</span>
          </div>
        </div>

        <!-- 右侧操作 -->
        <div class="item-actions">
          <template v-if="item.status === 'reserved' || item.status === 'occupied'">
            <button
              class="select-btn"
              :disabled="loadingId === item.reservationId || item.status === 'occupied'"
              @click.stop="doCheckin(item)"
            >签到</button>
            <button
              class="select-btn"
              :disabled="loadingId === item.reservationId || item.status === 'reserved'"
              @click.stop="doCheckout(item)"
            >签退</button>
          </template>
        </div>

      </div>
    </div>

    <!-- 预约详情/编辑弹窗 -->
    <el-dialog v-model="detailDialogVisible" title="预约详情" width="450px" destroy-on-close :close-on-click-modal="false">
      <div v-if="detailLoading" class="state-wrap">
        <el-icon class="is-loading" :size="28"><Loading /></el-icon>
      </div>
      
      <el-form v-else ref="editFormRef" :model="detailForm" :rules="rules" label-position="top">
        <el-form-item label="预约编号">
          <span class="readonly-text">{{ detailForm.reservationId }}</span>
        </el-form-item>

        <el-form-item label="自习室">
          <span class="readonly-text">{{ detailForm.roomName || '-' }}</span>
        </el-form-item>

        <el-form-item label="座位号" prop="seatId">
          <el-input v-if="isEditing" v-model="detailForm.seatId" placeholder="请输入座位号" clearable />
          <span v-else class="readonly-text">{{ detailForm.seatNumber || detailForm.seatId }}</span>
        </el-form-item>

        <el-form-item label="位置">
          <span class="readonly-text">{{ detailForm.location || '-' }}</span>
        </el-form-item>
        
        <el-form-item label="开始时间" prop="startTime">
          <el-date-picker
            v-if="isEditing"
            v-model="detailForm.startTime"
            type="datetime"
            placeholder="选择开始时间"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
            class="w-full"
          />
          <span v-else class="readonly-text">{{ formatTime(detailForm.startTime) }}</span>
        </el-form-item>

        <el-form-item label="结束时间" prop="endTime">
          <el-date-picker
            v-if="isEditing"
            v-model="detailForm.endTime"
            type="datetime"
            placeholder="选择结束时间"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
            class="w-full"
          />
          <span v-else class="readonly-text">{{ formatTime(detailForm.endTime) }}</span>
        </el-form-item>

        <el-form-item label="状态">
          <div class="status-display">
            <span :class="['status-dot', getStatusInfo(detailForm).dot]"></span>
            <span :class="['status-text', getStatusInfo(detailForm).textClass]">
              {{ getStatusInfo(detailForm).text }}
            </span>
          </div>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer detail-actions">
          <div class="left-actions">
            <!-- 仅在未编辑，且非完结状态允许取消预约 -->
            <template v-if="!isEditing">
              <el-button 
                v-if="detailForm.status !== 'completed' && detailForm.status !== 'cancelled'" 
                type="danger" 
                plain 
                @click="handleCancelReservation"
              >取消预约</el-button>
            </template>
            <template v-else>
              <el-button @click="cancelEdit">取消修改</el-button>
            </template>
          </div>
          <div class="right-actions">
            <template v-if="!isEditing">
              <el-button @click="detailDialogVisible = false">关闭</el-button>
              <el-button 
                v-if="detailForm.status === 'reserved' || detailForm.status === 'occupied'" 
                type="primary" 
                @click="isEditing = true"
              >修改</el-button>
            </template>
            <template v-else>
              <el-button type="primary" :loading="saving" @click="submitEdit">保存</el-button>
            </template>
          </div>
        </div>
      </template>
    </el-dialog>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Loading, Search } from '@element-plus/icons-vue'
import {
  getReservations,
  getReservationById,
  checkIn,
  checkOut,
  cancelReservation,
  updateReservation
} from '@/api/reservation'
import { getCurrentUserId } from '@/utils/auth'

const userId = getCurrentUserId()

const list = ref([])
const loading = ref(false)
const loadingId = ref(null) 

const searchQuery = ref('')
const statusFilter = ref('')

const filteredReservations = computed(() => {
  let res = list.value
  
  if (statusFilter.value) {
    if (statusFilter.value === 'not_checked_in') {
      res = res.filter(r => r.status === 'reserved')
    } else if (statusFilter.value === 'checked_in') {
      res = res.filter(r => r.status === 'checked_in')
    } else if (statusFilter.value === 'completed') {
      res = res.filter(r => r.status === 'completed')
    } else if (statusFilter.value === 'cancelled') {
      res = res.filter(r => r.status === 'cancelled')
    }
  }
  
  if (searchQuery.value) {
    const q = searchQuery.value.trim().toLowerCase()
    res = res.filter(r => 
      String(r.reservationId).includes(q) || 
      String(r.seatId).includes(q)
    )
  }
  
  return res
})

const getStatusInfo = (item) => {
  if (item.status === 'occupied') {
    return { dot: 'dot-green', textClass: 'text-green', text: '使用中' }
  }
  if (item.status === 'completed') {
    return { dot: 'dot-gray', textClass: 'text-gray', text: '已签退' }
  }
  if (item.status === 'cancelled') {
    return { dot: 'dot-red', textClass: 'text-red', text: '已取消' }
  }
  // reserved (默认)
  return { dot: 'dot-yellow', textClass: 'text-yellow', text: '未签到' }
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
  if (!userId) return
  loading.value = true
  try {
    list.value = await getReservations(userId)
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

const doCheckin  = (item) => doAction(item, checkIn,    '签到成功！')
const doCheckout = (item) => doAction(item, checkOut,   '签退成功！')

// ================= [详情与编辑逻辑] =================

const detailDialogVisible = ref(false)
const detailLoading = ref(false)
const isEditing = ref(false)
const editFormRef = ref(null)
const saving = ref(false)

const detailForm = ref({})
const originalDetail = ref({})
const currentReservationId = ref(null)

const validateEnd = (rule, value, callback) => {
  if (value && detailForm.value.startTime && new Date(value) <= new Date(detailForm.value.startTime)) {
    callback(new Error('结束时间必须大于开始时间'))
  } else {
    callback()
  }
}

const rules = {
  seatId: [{ required: true, message: '座位号不能为空', trigger: 'blur' }],
  startTime: [{ required: true, message: '开始时间不能为空', trigger: 'change' }],
  endTime: [
    { required: true, message: '结束时间不能为空', trigger: 'change' },
    { validator: validateEnd, trigger: 'change' }
  ]
}

const openDetailDialog = async (item) => {
  currentReservationId.value = item.reservationId
  isEditing.value = false
  detailDialogVisible.value = true
  detailLoading.value = true
  try {
    const data = await getReservationById(currentReservationId.value)
    originalDetail.value = { ...data }
    detailForm.value = { ...data }
  } catch (e) {
    ElMessage.error('加载详情失败')
    detailDialogVisible.value = false
  } finally {
    detailLoading.value = false
  }
}

const cancelEdit = () => {
  detailForm.value = { ...originalDetail.value }
  isEditing.value = false
  editFormRef.value?.clearValidate()
}

// 将 'yyyy-MM-dd HH:mm:ss' 转为后端 LocalDateTime 需要的 'yyyy-MM-ddTHH:mm:ss'
const toISOLocal = (str) => str ? str.replace(' ', 'T') : str

const submitEdit = async () => {
  const valid = await editFormRef.value?.validate().catch(() => false)
  if (!valid) return
  saving.value = true
  try {
    const payload = {
      seatId: detailForm.value.seatId,
      startTime: toISOLocal(detailForm.value.startTime),
      endTime: toISOLocal(detailForm.value.endTime)
    }
    await updateReservation(currentReservationId.value, payload)
    ElMessage.success('修改成功')
    originalDetail.value = { ...originalDetail.value, ...payload }
    isEditing.value = false
    fetchList() // 同步刷新列表
  } catch (e) {
    ElMessage.error(e?.message || '修改失败')
  } finally {
    saving.value = false
  }
}

const handleCancelReservation = () => {
  ElMessageBox.confirm('确定取消该预约吗？', '确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
    confirmButtonClass: 'el-button--danger'
  }).then(async () => {
    try {
      await cancelReservation(currentReservationId.value)
      ElMessage.success('取消成功')
      detailDialogVisible.value = false
      fetchList()
    } catch (e) {
      ElMessage.error(e?.message || '取消失败')
    }
  }).catch(() => {})
}

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
  max-width: 860px;
  margin: 0 auto 32px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.header-left {
  flex-shrink: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.search-input {
  width: 200px;
}

.status-select {
  width: 120px;
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
  max-width: 860px;
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

.status-display {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.dot-green  { background: #22c55e; }
.dot-yellow { background: #f59e0b; }
.dot-gray   { background: #9ca3af; }
.dot-red    { background: #ef4444; }

.status-text {
  font-size: 13px;
}

.text-green  { color: #16a34a; }
.text-yellow { color: #d97706; }
.text-gray   { color: #6b7280; }
.text-red    { color: #dc2626; }

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

/* 黑色按钮 */
.select-btn {
  flex-shrink: 0;
  padding: 8px 20px;
  background: #111;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
}

.select-btn:hover:not(:disabled) {
  background: #333;
}

.select-btn:disabled {
  background: #d1d5db;
  color: #9ca3af;
  cursor: not-allowed;
}

/* Loading / Empty */
.state-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

/* 响应式 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  .header-right {
    width: 100%;
  }
  .search-input {
    flex: 1;
    width: auto;
  }
  .reservation-item {
    flex-wrap: wrap;
    align-items: center;
  }
  .item-actions {
    margin-left: auto;
    order: 4;
  }
}

@media (max-width: 480px) {
  .page-header, .reservation-list {
    padding: 0 16px;
  }
  .page-title {
    font-size: 20px;
  }
  .select-btn {
    padding: 7px 14px;
    font-size: 13px;
  }
}

/* 弹窗及辅助类 */
.w-full {
  width: 100%;
}

.readonly-text {
  font-size: 15px;
  color: #111;
  font-weight: 500;
  display: flex;
  align-items: center;
  height: 32px;
}

.detail-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.right-actions {
  display: flex;
  gap: 12px;
}

/* 覆盖样式 */
:deep(.el-button--primary) {
  background-color: #111;
  border-color: #111;
}
:deep(.el-button--primary:hover) {
  background-color: #333;
  border-color: #333;
}
:deep(.el-button--primary.is-disabled) {
  background-color: #d1d5db;
  border-color: #d1d5db;
}
:deep(.el-message-box__btns .el-button--primary.el-button--danger) {
  background-color: #dc2626;
  border-color: #dc2626;
}
:deep(.el-message-box__btns .el-button--primary.el-button--danger:hover) {
  background-color: #b91c1c;
  border-color: #b91c1c;
}
</style>