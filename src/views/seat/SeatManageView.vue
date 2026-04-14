<template>
  <div class="seat-manage-page">

    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">座位管理</h1>
        <p class="page-subtitle">查看并管理各自习室座位信息</p>
      </div>
      <div class="header-right">
        <!-- 自习室筛选 -->
        <el-select
          v-model="selectedRoomId"
          placeholder="全部自习室"
          class="room-select"
          clearable
        >
          <el-option label="全部" value="" />
          <el-option
            v-for="room in rooms"
            :key="room.roomId"
            :label="room.roomName"
            :value="room.roomId"
          />
        </el-select>

        <!-- 搜索框 -->
        <el-input
          v-model="searchQuery"
          placeholder="搜索座位号"
          clearable
          class="search-input"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <!-- 新增按钮 -->
        <button class="add-btn" @click="openAddDialog">新增座位</button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="state-wrap">
      <el-icon class="is-loading" :size="28" color="#909399"><Loading /></el-icon>
    </div>

    <!-- 空状态 -->
    <div v-else-if="filteredSeats.length === 0" class="state-wrap">
      <el-empty description="暂无座位数据" />
    </div>

    <!-- 表格 -->
    <div v-else class="table-wrapper">
      <el-table
        :data="filteredSeats"
        row-class-name="table-row"
        @row-click="openDetailDialog"
        style="width: 100%; cursor: pointer;"
      >
        <el-table-column prop="seatId" label="座位ID" width="90" />

        <el-table-column prop="seatNumber" label="座位号" min-width="110" />

        <el-table-column label="自习室" min-width="150">
          <template #default="{ row }">
            {{ getRoomName(row.roomId) }}
          </template>
        </el-table-column>

        <el-table-column label="座位状态" min-width="120">
          <template #default="{ row }">
            <span class="status-display">
              <span :class="['status-dot', getSeatStatusInfo(row.status).dot]"></span>
              <span :class="['status-text', getSeatStatusInfo(row.status).textClass]">
                {{ getSeatStatusInfo(row.status).text }}
              </span>
            </span>
          </template>
        </el-table-column>

        <el-table-column label="摄像头" min-width="110">
          <template #default="{ row }">
            <span :class="row.cameraEnabled ? 'camera-on' : 'camera-off'">
              {{ row.cameraEnabled ? '已启用' : '未启用' }}
            </span>
          </template>
        </el-table-column>

        <el-table-column label="标定状态" min-width="110">
          <template #default="{ row }">
            <span :class="row.region ? 'calibrated' : 'uncalibrated'">
              {{ row.region ? '已标定' : '未标定' }}
            </span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="90" @click.stop>
          <template #default="{ row }">
            <button class="link-btn" @click.stop="openDetailDialog(row)">详情</button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- ===== 新增弹窗 ===== -->
    <el-dialog v-model="addDialogVisible" title="新增座位" width="400px" destroy-on-close :close-on-click-modal="false">
      <el-form ref="addFormRef" :model="addForm" :rules="addRules" label-position="top">
        <el-form-item label="自习室" prop="roomId">
          <el-select v-model="addForm.roomId" placeholder="请选择自习室" class="w-full">
            <el-option
              v-for="room in rooms"
              :key="room.roomId"
              :label="room.roomName"
              :value="room.roomId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="座位号" prop="seatNumber">
          <el-input v-model="addForm.seatNumber" placeholder="请输入座位号" clearable />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="addForm.status" class="w-full">
            <el-option label="可用" value="available" />
            <el-option label="已预约" value="reserved" />
            <el-option label="使用中" value="occupied" />
          </el-select>
        </el-form-item>
        <el-form-item label="摄像头">
          <el-switch v-model="addForm.cameraEnabled" :active-value="1" :inactive-value="0" />
          <span class="switch-label">{{ addForm.cameraEnabled ? '启用' : '关闭' }}</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="addDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="saving" @click="submitAdd">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- ===== 详情 / 编辑弹窗 ===== -->
    <el-dialog v-model="detailDialogVisible" title="座位详情" width="480px" destroy-on-close :close-on-click-modal="false">
      <div v-if="detailLoading" class="state-wrap">
        <el-icon class="is-loading" :size="28"><Loading /></el-icon>
      </div>

      <el-form v-else ref="editFormRef" :model="detailForm" :rules="editRules" label-position="top">
        <el-form-item label="座位ID">
          <span class="readonly-text">{{ detailForm.seatId }}</span>
        </el-form-item>

        <el-form-item label="座位号" prop="seatNumber">
          <el-input v-if="isEditing" v-model="detailForm.seatNumber" clearable />
          <span v-else class="readonly-text">{{ detailForm.seatNumber }}</span>
        </el-form-item>

        <el-form-item label="自习室">
          <span class="readonly-text">{{ getRoomName(detailForm.roomId) }}</span>
        </el-form-item>

        <el-form-item label="座位状态" prop="status">
          <el-select v-if="isEditing" v-model="detailForm.status" class="w-full">
            <el-option label="可用" value="available" />
            <el-option label="已预约" value="reserved" />
            <el-option label="使用中" value="occupied" />
          </el-select>
          <span v-else class="status-display">
            <span :class="['status-dot', getSeatStatusInfo(detailForm.status).dot]"></span>
            <span :class="['status-text', getSeatStatusInfo(detailForm.status).textClass]">
              {{ getSeatStatusInfo(detailForm.status).text }}
            </span>
          </span>
        </el-form-item>

        <el-form-item label="摄像头">
          <el-switch v-if="isEditing" v-model="detailForm.cameraEnabled" :active-value="1" :inactive-value="0" />
          <span v-else :class="detailForm.cameraEnabled ? 'camera-on' : 'camera-off'">
            {{ detailForm.cameraEnabled ? '已启用' : '未启用' }}
          </span>
        </el-form-item>

        <el-form-item label="标定状态">
          <span :class="detailForm.region ? 'calibrated' : 'uncalibrated'">
            {{ detailForm.region ? '已标定' : '未标定' }}
          </span>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer detail-actions">
          <div class="left-actions">
            <template v-if="!isEditing">
              <el-button type="danger" plain @click="handleDelete">删除</el-button>
              <el-button type="primary" @click="handleCalibrate">区域标定</el-button>
            </template>
            <template v-else>
              <el-button @click="cancelEdit">取消修改</el-button>
            </template>
          </div>
          <div class="right-actions">
            <template v-if="!isEditing">
              <el-button @click="detailDialogVisible = false">关闭</el-button>
              <el-button type="primary" @click="isEditing = true">修改</el-button>
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
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Loading, Search } from '@element-plus/icons-vue'
import { getAllSeats, createSeat, updateSeat, deleteSeat } from '@/api/seat'
import { getStudyRooms } from '@/api/room'

const router = useRouter()
const seats = ref([])
const rooms = ref([])
const loading = ref(false)
const saving = ref(false)

const searchQuery = ref('')
const selectedRoomId = ref('')

// =================== 过滤 ===================
const filteredSeats = computed(() => {
  let res = seats.value
  if (selectedRoomId.value !== '' && selectedRoomId.value !== null) {
    res = res.filter(s => s.roomId === selectedRoomId.value)
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    res = res.filter(s => String(s.seatNumber).toLowerCase().includes(q))
  }
  return res
})

// =================== 辅助函数 ===================
const getRoomName = (roomId) => {
  const room = rooms.value.find(r => r.roomId === roomId)
  return room ? room.roomName : `自习室${roomId}`
}

const getSeatStatusInfo = (status) => {
  if (status === 'reserved') return { dot: 'dot-yellow', textClass: 'text-yellow', text: '已预约' }
  if (status === 'occupied') return { dot: 'dot-red', textClass: 'text-red', text: '使用中' }
  return { dot: 'dot-green', textClass: 'text-green', text: '可用' }
}

// =================== 数据加载 ===================
const fetchAll = async () => {
  loading.value = true
  try {
    const [seatRes, roomRes] = await Promise.all([getAllSeats(), getStudyRooms()])
    seats.value = Array.isArray(seatRes) ? seatRes : []
    rooms.value = Array.isArray(roomRes) ? roomRes : []
  } catch (e) {
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

// =================== 新增弹窗 ===================
const addDialogVisible = ref(false)
const addFormRef = ref(null)
const addForm = ref({ roomId: '', seatNumber: '', status: 'available', cameraEnabled: 1 })

const addRules = {
  roomId: [{ required: true, message: '请选择自习室', trigger: 'change' }],
  seatNumber: [{ required: true, message: '座位号不能为空', trigger: 'blur' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }]
}

const openAddDialog = () => {
  addForm.value = { roomId: '', seatNumber: '', status: 'available', cameraEnabled: 1 }
  addDialogVisible.value = true
}

const submitAdd = async () => {
  const valid = await addFormRef.value?.validate().catch(() => false)
  if (!valid) return
  saving.value = true
  try {
    await createSeat(addForm.value)
    ElMessage.success('新增成功')
    addDialogVisible.value = false
    fetchAll()
  } catch (e) {
    ElMessage.error(e?.message || '新增失败')
  } finally {
    saving.value = false
  }
}

// =================== 详情 / 编辑弹窗 ===================
const detailDialogVisible = ref(false)
const detailLoading = ref(false)
const isEditing = ref(false)
const editFormRef = ref(null)

const detailForm = ref({})
const originalDetail = ref({})
const currentSeatId = ref(null)

const editRules = {
  seatNumber: [{ required: true, message: '座位号不能为空', trigger: 'blur' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }]
}

const openDetailDialog = (row) => {
  currentSeatId.value = row.seatId
  detailForm.value = { ...row }
  originalDetail.value = { ...row }
  isEditing.value = false
  detailDialogVisible.value = true
}

const cancelEdit = () => {
  detailForm.value = { ...originalDetail.value }
  isEditing.value = false
  editFormRef.value?.clearValidate()
}

const submitEdit = async () => {
  const valid = await editFormRef.value?.validate().catch(() => false)
  if (!valid) return
  saving.value = true
  try {
    await updateSeat(currentSeatId.value, {
      roomId: detailForm.value.roomId,        // 后端全量更新，必须携带
      seatNumber: detailForm.value.seatNumber,
      status: detailForm.value.status,
      cameraEnabled: detailForm.value.cameraEnabled
    })
    ElMessage.success('修改成功')
    originalDetail.value = { ...detailForm.value }
    isEditing.value = false
    fetchAll()
  } catch (e) {
    ElMessage.error(e?.message || '修改失败')
  } finally {
    saving.value = false
  }
}

// =================== 删除 ===================
const handleDelete = () => {
  ElMessageBox.confirm('确定要删除该座位吗？此操作不可恢复。', '警告', {
    confirmButtonText: '确定删除',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await deleteSeat(currentSeatId.value)
      ElMessage.success('删除成功')
      detailDialogVisible.value = false
      fetchAll()
    } catch (e) {
      ElMessage.error(e?.message || '删除失败')
    }
  }).catch(() => {})
}

// =================== 区域标定 ===================
const handleCalibrate = () => {
  detailDialogVisible.value = false
  router.push(`/seats/${currentSeatId.value}/calibration`)
}

onMounted(fetchAll)
</script>

<style scoped>
.seat-manage-page {
  background: #f5f6f7;
  padding: 40px 0 48px;
  box-sizing: border-box;
}

/* 标题栏 */
.page-header {
  max-width: 1100px;
  margin: 0 auto 32px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.header-left { flex-shrink: 0; }

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
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

.room-select { width: 160px; }
.search-input { width: 180px; }

.add-btn {
  white-space: nowrap;
  padding: 8px 18px;
  background: #111;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}
.add-btn:hover { background: #333; }

/* 表格容器 */
.table-wrapper {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 24px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  overflow: hidden;
}

/* 状态圆点 */
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
  flex-shrink: 0;
}

.dot-green  { background: #22c55e; }
.dot-yellow { background: #f59e0b; }
.dot-red    { background: #ef4444; }

.status-text { font-size: 13px; }
.text-green  { color: #16a34a; }
.text-yellow { color: #d97706; }
.text-red    { color: #dc2626; }

/* 摄像头 / 标定状态 */
.camera-on  { color: #16a34a; font-size: 13px; font-weight: 500; }
.camera-off { color: #9ca3af; font-size: 13px; }
.calibrated   { color: #16a34a; font-size: 13px; font-weight: 500; }
.uncalibrated { color: #9ca3af; font-size: 13px; }

/* 链接按钮 */
.link-btn {
  background: none;
  border: none;
  color: #111;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
}
.link-btn:hover { color: #555; }

/* 弹窗辅助 */
.w-full { width: 100%; }

.readonly-text {
  font-size: 15px;
  color: #111;
  font-weight: 500;
  display: flex;
  align-items: center;
  min-height: 32px;
}

.switch-label {
  margin-left: 10px;
  font-size: 13px;
  color: #6b7280;
}

.detail-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.left-actions { display: flex; gap: 10px; }
.right-actions { display: flex; gap: 10px; }

/* Loading / Empty */
.state-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 220px;
}

/* 覆盖 el-button 为黑白风格 */
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

/* 表格行悬浮 */
:deep(.el-table__row:hover > td) {
  background: #f9fafb !important;
}
:deep(.el-table th) {
  background: #fafafa;
  font-weight: 600;
  color: #374151;
  font-size: 13px;
}

/* 响应式 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .header-right {
    width: 100%;
  }
  .room-select, .search-input {
    flex: 1;
  }
}
</style>
