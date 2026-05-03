<template>
  <div class="room-list-page">
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">自习室</h1>
        <p class="page-subtitle">选择一个自习室开始学习</p>
      </div>
      <div class="header-right">
        <el-input
          v-model="searchQuery"
          placeholder="搜索自习室名称"
          clearable
          class="search-input"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <button v-if="isAdmin" class="add-btn" @click="openAddDialog">新增自习室</button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="state-wrap">
      <el-icon class="is-loading" :size="28" color="#909399"><Loading /></el-icon>
    </div>

    <!-- 无数据 -->
    <div v-else-if="rooms.length === 0" class="state-wrap">
      <el-empty description="暂无自习室" />
    </div>
    <div v-else-if="filteredRooms.length === 0" class="state-wrap">
      <el-empty description="没有匹配的自习室" />
    </div>

    <!-- 列表 -->
    <div v-else class="room-list">
      <div
        v-for="room in filteredRooms"
        :key="room.roomId"
        class="room-item"
        @click="openDetailDialog(room)"
        style="cursor: pointer;"
      >
        <!-- 左侧信息 -->
        <div class="room-info">
          <span class="room-name">{{ room.roomName }}</span>
          <div class="room-meta">
            <span>容纳 {{ seatCounts[room.roomId] ?? room.capacity }} 人</span>
          </div>
        </div>

        <!-- 中间状态 -->
        <div class="room-status">
          <span :class="['status-dot', room.status === 'open' ? 'dot-open' : 'dot-closed']"></span>
          <span :class="['status-text', room.status === 'open' ? 'text-open' : 'text-closed']">
            {{ room.status === 'open' ? '开放中' : '已关闭' }}
          </span>
        </div>

        <!-- 右侧按钮 -->
        <button
          class="select-btn"
          :disabled="room.status !== 'open'"
          @click.stop="enterRoom(room.roomId)"
        >
          选择
        </button>
      </div>
    </div>

    <!-- 新增自习室弹窗 -->
    <el-dialog v-model="addDialogVisible" title="新增自习室" width="440px" destroy-on-close :close-on-click-modal="false">
      <el-form ref="addFormRef" :model="addForm" :rules="rules" label-position="top">
        <el-form-item label="自习室名称" prop="roomName">
          <el-input v-model="addForm.roomName" placeholder="请输入自习室名称" clearable />
        </el-form-item>
        <el-form-item label="位置" prop="location">
          <el-input v-model="addForm.location" placeholder="请输入位置" clearable />
        </el-form-item>
        <el-form-item label="容量" prop="capacity">
          <el-input-number v-model="addForm.capacity" :min="1" :step="1" placeholder="请输入容量" class="w-full" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="addForm.status" placeholder="请选择状态" class="w-full">
            <el-option label="开放中" value="open" />
            <el-option label="已关闭" value="closed" />
          </el-select>
        </el-form-item>
        <!-- 视频源配置 -->
        <el-form-item label="视频文件">
          <el-upload
            action="#"
            :auto-upload="false"
            accept="video/mp4"
            :show-file-list="false"
            :on-change="(file) => handleVideoChange(file, 'addForm')"
          >
            <el-button plain>选择本地视频文件</el-button>
          </el-upload>
          <div v-if="addForm.videoUrl" class="video-path-tip">{{ addForm.videoUrl }}</div>
        </el-form-item>

      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="addDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="saving" @click="submitAdd">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 详情 / 编辑弹窗 -->
    <el-dialog v-model="detailDialogVisible" title="自习室详情" width="450px" destroy-on-close :close-on-click-modal="false">
      <div v-if="detailLoading" class="state-wrap">
        <el-icon class="is-loading" :size="28"><Loading /></el-icon>
      </div>

      <el-form v-else ref="editFormRef" :model="detailForm" :rules="rules" label-position="top">
        <el-form-item label="自习室名称" prop="roomName">
          <el-input v-if="isEditing" v-model="detailForm.roomName" placeholder="请输入名称" clearable />
          <span v-else class="readonly-text">{{ detailForm.roomName }}</span>
        </el-form-item>
        
        <el-form-item label="位置" prop="location">
          <el-input v-if="isEditing" v-model="detailForm.location" placeholder="请输入位置" clearable />
          <span v-else class="readonly-text">{{ detailForm.location }}</span>
        </el-form-item>

        <el-form-item label="容量" prop="capacity">
          <el-input-number v-if="isEditing" v-model="detailForm.capacity" :min="1" class="w-full" />
          <span v-else class="readonly-text">{{ detailForm.capacity }} 人</span>
        </el-form-item>

        <el-form-item label="状态" prop="status">
          <el-select v-if="isEditing" v-model="detailForm.status" class="w-full">
            <el-option label="开放中" value="open" />
            <el-option label="已关闭" value="closed" />
          </el-select>
          <div v-else class="readonly-text status-display">
            <span :class="['status-dot', detailForm.status === 'open' ? 'dot-open' : 'dot-closed']"></span>
            <span :class="['status-text', detailForm.status === 'open' ? 'text-open' : 'text-closed']">
              {{ detailForm.status === 'open' ? '开放中' : '已关闭' }}
            </span>
          </div>
        </el-form-item>

        <!-- 视频源（编辑/只读） -->
        <el-form-item v-if="isEditing" label="视频文件">
          <el-upload
            action="#"
            :auto-upload="false"
            accept="video/mp4"
            :show-file-list="false"
            :on-change="(file) => handleVideoChange(file, 'detailForm')"
          >
            <el-button plain>选择本地视频文件</el-button>
          </el-upload>
          <div v-if="detailForm.videoUrl" class="video-path-tip">{{ detailForm.videoUrl }}</div>
        </el-form-item>
        <el-form-item v-if="!isEditing && detailForm.videoUrl" label="视频文件">
          <span class="readonly-text video-path-tip">{{ detailForm.videoUrl }}</span>
        </el-form-item>


      </el-form>
      
      <template #footer>
        <div class="dialog-footer detail-actions">
          <div class="left-actions">
            <el-button v-if="isAdmin && !isEditing" type="danger" plain @click="handleDeleteRoom">删除</el-button>
          </div>
          <div class="right-actions">
            <template v-if="!isEditing">
              <el-button @click="detailDialogVisible = false">关闭</el-button>
              <el-button v-if="isAdmin" type="primary" @click="isEditing = true">修改</el-button>
            </template>
            <template v-else>
              <el-button @click="cancelEdit">取消修改</el-button>
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
import { Loading, Search } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getStudyRooms, getRoomById, createRoom, updateRoom, deleteRoom } from '@/api/room'
import { getSeatsByRoom } from '@/api/seat'
import { getCurrentUser } from '@/utils/auth'

const currentUser = getCurrentUser()
const isAdmin = ref(currentUser?.role === 'admin')
const router = useRouter()
const rooms = ref([])
const loading = ref(false)
const seatCounts = ref({})
const searchQuery = ref('')

const filteredRooms = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return rooms.value
  return rooms.value.filter(r =>
    (r.roomName || '').toLowerCase().includes(q)
  )
})

const fetchRooms = async () => {
  loading.value = true
  try {
    rooms.value = await getStudyRooms()
    // 并行获取每个自习室的座位数
    const results = await Promise.allSettled(
      rooms.value.map(r => getSeatsByRoom(r.roomId))
    )
    results.forEach((result, i) => {
      const roomId = rooms.value[i].roomId
      if (result.status === 'fulfilled' && Array.isArray(result.value)) {
        seatCounts.value[roomId] = result.value.length
      }
    })
  } catch (e) {
    console.error('获取自习室列表失败', e)
  } finally {
    loading.value = false
  }
}

const enterRoom = (roomId) => {
  router.push(`/rooms/${roomId}/seats`)
}

// ================= [CRUD 状态及方法] =================
const saving = ref(false)
const rules = {
  roomName: [{ required: true, message: '名称不能为空', trigger: 'blur' }],
  location: [{ required: true, message: '位置不能为空', trigger: 'blur' }],
  capacity: [
    { required: true, message: '容量不能为空', trigger: 'blur' },
    { type: 'number', min: 1, message: '容量需为大于0的整数', trigger: 'blur' }
  ],
  status: [{ required: true, message: '状态不能为空', trigger: 'change' }]
}

// === 新增自习室 ===
const addDialogVisible = ref(false)
const addFormRef = ref(null)


const addForm = ref({ roomName: '', location: '', capacity: 1, status: 'open', videoUrl: '' })

// 处理本地视频文件选择
const handleVideoChange = (uploadFile, formName) => {
  if (uploadFile && uploadFile.raw) {
    const fileName = uploadFile.raw.name
    // 构建静态目录访问的媒体路径
    const targetUrl = `/media/videos/${fileName}`
    if (formName === 'addForm') {
      addForm.value.videoUrl = targetUrl
    } else {
      detailForm.value.videoUrl = targetUrl
    }
  }
}

const openAddDialog = () => {
  addForm.value = { roomName: '', location: '', capacity: 1, status: 'open', videoUrl: '' }
  addDialogVisible.value = true
}

const submitAdd = async () => {
  const valid = await addFormRef.value?.validate().catch(() => false)
  if (!valid) return
  saving.value = true
  try {
    await createRoom(addForm.value)
    ElMessage.success('新增自习室成功')
    addDialogVisible.value = false
    fetchRooms()
  } catch (e) {
    ElMessage.error(e?.message || '新增失败')
  } finally {
    saving.value = false
  }
}

// === 详情与编辑自习室 ===
const detailDialogVisible = ref(false)
const detailLoading = ref(false)
const isEditing = ref(false)
const editFormRef = ref(null)
const currentRoomId = ref(null)

const originalDetail = ref({})
const detailForm = ref({ roomName: '', location: '', capacity: 1, status: 'open', videoUrl: '' })

const openDetailDialog = async (room) => {
  currentRoomId.value = room.roomId
  isEditing.value = false
  detailDialogVisible.value = true
  detailLoading.value = true
  try {
    const data = await getRoomById(currentRoomId.value)
    originalDetail.value = {
      roomName: data.roomName || data.name || room.roomName,
      location: data.location,
      capacity: data.capacity,
      status: data.status,
      videoUrl:  data.videoUrl  || '',
    }
    detailForm.value = { ...originalDetail.value }
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

const submitEdit = async () => {
  const valid = await editFormRef.value?.validate().catch(() => false)
  if (!valid) return
  saving.value = true
  try {
    await updateRoom(currentRoomId.value, detailForm.value)
    ElMessage.success('修改成功')
    originalDetail.value = { ...detailForm.value }
    isEditing.value = false
    fetchRooms()
  } catch (e) {
    ElMessage.error(e?.message || '修改失败')
  } finally {
    saving.value = false
  }
}

// === 删除自习室 ===
const handleDeleteRoom = () => {
  ElMessageBox.confirm('确定要删除该自习室吗？此操作不可恢复。', '警告', {
    confirmButtonText: '确定删除',
    cancelButtonText: '取消',
    type: 'warning',
    confirmButtonClass: 'el-button--danger'
  }).then(async () => {
    try {
      await deleteRoom(currentRoomId.value)
      ElMessage.success('删除成功')
      detailDialogVisible.value = false
      fetchRooms()
    } catch (e) {
      ElMessage.error(e?.message || '删除失败')
    }
  }).catch(() => {})
}

onMounted(fetchRooms)
</script>

<style scoped>
.room-list-page {
  background: #f5f6f7;
  padding: 40px 0 48px;
  box-sizing: border-box;
}

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

.add-btn:hover {
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

/* 列表容器 */
.room-list {
  max-width: 860px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* 每一行 */
.room-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border-radius: 10px;
  background: #fff;
  transition: background 0.15s;
}

.room-item:hover {
  background: #f0f0f0;
}

/* 左侧信息 */
.room-info {
  flex: 1;
  min-width: 0;
}

.room-name {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #111;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.room-meta {
  font-size: 13px;
  color: #999;
  display: flex;
  align-items: center;
  gap: 4px;
}

.divider {
  color: #ccc;
}

/* 状态 */
.room-status {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.dot-open  { background: #22c55e; }
.dot-closed { background: #ef4444; }

.status-text {
  font-size: 13px;
}

.text-open   { color: #16a34a; }
.text-closed { color: #dc2626; }

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

/* ===== 响应式 ===== */

/* 平板：< 768px */
@media (max-width: 768px) {
  .room-list-page {
    padding: 32px 0;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 20px;
  }

  .header-right {
    width: 100%;
  }

  .search-input {
    flex: 1;
    width: auto;
  }

  .room-item {
    flex-wrap: wrap;
    gap: 10px;
    padding: 14px 16px;
  }

  .room-status {
    order: 3;
  }

  .select-btn {
    order: 4;
    margin-left: auto;
  }
}

/* 手机：< 480px */
@media (max-width: 480px) {
  .room-list-page {
    padding: 20px 0;
  }

  .page-title {
    font-size: 20px;
  }

  .page-header,
  .room-list {
    padding: 0 16px;
  }

  .room-item {
    padding: 12px 14px;
    border-radius: 8px;
  }

  .room-name {
    font-size: 14px;
  }

  .status-text {
    display: none;  /* 只保留圆点，节省空间 */
  }

  .select-btn {
    padding: 7px 14px;
    font-size: 13px;
  }

  .add-btn {
    padding: 7px 12px;
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

.video-path-tip {
  margin-top: 6px;
  font-size: 11px;
  color: #9ca3af;
  word-break: break-all;
  line-height: 1.4;
}

.status-display {
  display: flex;
  align-items: center;
  gap: 6px;
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

/* 覆盖黑底样式按钮 */
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