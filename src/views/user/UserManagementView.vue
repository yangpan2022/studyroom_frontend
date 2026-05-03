<template>
  <div class="user-manage-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">用户管理</h1>
        <p class="page-subtitle">管理系统用户及查看相关统计</p>
      </div>
      <div class="header-right">
        <!-- 角色筛选 -->
        <el-select
          v-model="query.role"
          placeholder="全部角色"
          class="filter-select"
          clearable
          @change="handleSearch"
        >
          <el-option label="管理员" value="admin" />
          <el-option label="学生" value="student" />
        </el-select>

        <!-- 状态筛选 -->
        <el-select
          v-model="query.status"
          placeholder="全部状态"
          class="filter-select"
          clearable
          @change="handleSearch"
        >
          <el-option label="正常" value="active" />
          <el-option label="封禁" value="banned" />
        </el-select>

        <!-- 搜索框 -->
        <el-input
          v-model="query.keyword"
          placeholder="搜索用户名/联系方式"
          clearable
          class="search-input"
          @input="debouncedSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <button class="icon-btn" @click="handleSearch">查询</button>
        <button class="icon-btn outline" @click="resetQuery">重置</button>
        <!-- 新增按钮 -->
        <button class="add-btn" @click="openAddDialog">新增用户</button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="state-wrap">
      <el-icon class="is-loading" :size="28" color="#909399"><Loading /></el-icon>
    </div>

    <!-- 空状态 -->
    <div v-else-if="users.length === 0" class="state-wrap">
      <el-empty description="暂无用户数据" />
    </div>

    <!-- 表格 -->
    <div v-else class="table-wrapper">
      <el-table
        :data="users"
        row-class-name="table-row"
        style="width: 100%;"
      >
        <el-table-column prop="userId" label="用户ID" min-width="80" align="center">
          <template #default="{ row }">
            <span class="id-cell">{{ row.userId }}</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="username" label="用户名" min-width="120" />
        
        <el-table-column label="角色" min-width="100">
          <template #default="{ row }">
            <span :class="row.role === 'admin' ? 'role-admin' : 'role-student'">
              {{ row.role === 'admin' ? '管理员' : '学生' }}
            </span>
          </template>
        </el-table-column>
        
        <el-table-column prop="contact" label="联系方式" min-width="150" />
        
        <el-table-column label="状态" min-width="100">
          <template #default="{ row }">
            <span :class="['status-tag', row.status === 'active' ? 'tag-green' : 'tag-red']">
              {{ row.status === 'active' ? '启用' : '禁用' }}
            </span>
          </template>
        </el-table-column>
        
        <el-table-column label="操作" min-width="260" fixed="right" align="center">
          <template #default="{ row }">
            <div class="action-group">
              <button class="btn-action btn-edit" @click="openEditDialog(row)">编辑</button>
              <button 
                class="btn-action" 
                :class="row.status === 'active' ? 'btn-warning' : 'btn-success'"
                @click="toggleStatus(row)"
              >
                {{ row.status === 'active' ? '禁用' : '启用' }}
              </button>
              <button class="btn-action btn-stats" @click="openStatsDialog(row)">统计</button>
              <button class="btn-action btn-info" @click="openReservationsDialog(row)">预约</button>
              <button class="btn-action btn-danger" @click="handleDelete(row)">删除</button>
            </div>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="query.page"
          v-model:page-size="query.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          @size-change="handleSearch"
          @current-change="fetchData"
        />
      </div>
    </div>

    <!-- ================== 弹窗区 ================== -->
    
    <!-- 新增用户 -->
    <el-dialog v-model="addDialogVisible" title="新增用户" width="400px" destroy-on-close>
      <el-form ref="addFormRef" :model="addForm" :rules="rules" label-position="top">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="addForm.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="addForm.password" placeholder="为空则后端生成默认密码" type="password" show-password />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="addForm.role" class="w-full">
            <el-option label="学生" value="student" />
            <el-option label="管理员" value="admin" />
          </el-select>
        </el-form-item>
        <el-form-item label="联系方式" prop="contact">
          <el-input v-model="addForm.contact" placeholder="选填" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitAdd">确定</el-button>
      </template>
    </el-dialog>

    <!-- 编辑用户 -->
    <el-dialog v-model="editDialogVisible" :title="isAdmin ? '重置密码' : '修改密码'" width="550px" destroy-on-close>
      <el-form ref="editFormRef" :model="editForm" :rules="editRules" label-position="top">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="editForm.username" />
        </el-form-item>
        <el-form-item v-if="!isAdmin" label="原密码 (需要修改时必填)" prop="oldPassword">
          <el-input v-model="editForm.oldPassword" placeholder="原密码" type="password" show-password />
        </el-form-item>
        <el-form-item :label="isAdmin ? '新密码' : '新密码 (选填)'" prop="newPassword">
          <el-input 
            v-model="editForm.newPassword" 
            :placeholder="isPasswordFocused ? '' : passwordRuleText" 
            type="password" 
            show-password 
            @focus="isPasswordFocused = true"
            @blur="isPasswordFocused = false"
          />
        </el-form-item>
        <el-form-item label="确认新密码" prop="confirmPassword">
          <el-input v-model="editForm.confirmPassword" placeholder="再次输入新密码" type="password" show-password />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="editForm.role" class="w-full">
            <el-option label="学生" value="student" />
            <el-option label="管理员" value="admin" />
          </el-select>
        </el-form-item>
        <el-form-item label="联系方式" prop="contact">
          <el-input v-model="editForm.contact" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="editForm.status" class="w-full">
            <el-option label="启用" value="active" />
            <el-option label="禁用" value="banned" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitEdit">{{ isAdmin ? '确认重置' : '确认修改' }}</el-button>
      </template>
    </el-dialog>

    <!-- 用户统计弹窗 -->
    <el-dialog v-model="statsDialogVisible" title="用户统计" width="500px">
      <div v-if="statsLoading" class="state-wrap" style="min-height: 150px">
        <el-icon class="is-loading" :size="28"><Loading /></el-icon>
      </div>
      <div v-else class="stats-grid">
        <div class="stat-item">
          <div class="stat-label">总预约数</div>
          <div class="stat-val">{{ statsData.totalReservations || 0 }}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">完成预约</div>
          <div class="stat-val text-green">{{ statsData.completedReservations || 0 }}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">取消预约</div>
          <div class="stat-val text-yellow">{{ statsData.cancelledReservations || 0 }}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">学习总时长</div>
          <div class="stat-val">{{ statsData.totalStudyHours ? statsData.totalStudyHours.toFixed(1) : '0.0' }} h</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">手机警告</div>
          <div class="stat-val text-red">{{ statsData.phoneWarningCount || 0 }} 次</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">自动释放</div>
          <div class="stat-val text-orange">{{ statsData.autoReleaseCount || 0 }} 次</div>
        </div>
      </div>
      <template #footer>
        <el-button @click="statsDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 预约记录弹窗 -->
    <el-dialog v-model="reservationsDialogVisible" title="近期预约记录" width="800px">
      <div v-if="resLoading" class="state-wrap" style="min-height: 150px">
        <el-icon class="is-loading" :size="28"><Loading /></el-icon>
      </div>
      <el-table v-else :data="reservationsList" max-height="400">
        <el-table-column prop="reservationId" label="ID" min-width="80" align="center">
          <template #default="{ row }">
            <span class="id-cell">{{ row.reservationId }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="roomName" label="自习室" min-width="120" />
        <el-table-column prop="seatNumber" label="座位" min-width="80" />
        <el-table-column label="时间段" min-width="260">
          <template #default="{ row }">
            {{ formatTime(row.startTime) }} - {{ formatTime(row.endTime) }}
          </template>
        </el-table-column>
        <el-table-column label="状态" min-width="100">
          <template #default="{ row }">
            <el-tag :type="getResStatusTagType(row.status)">{{ getResStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="reservationsDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Loading, Search } from '@element-plus/icons-vue'
import { 
  getUserPage, createUser, updateUserByAdmin, 
  updateUserStatus, deleteUser, getUserStats, getUserReservations, updatePassword, adminResetPassword 
} from '@/api/user'
import { getCurrentUser } from '@/utils/auth'

const router = useRouter()
const currentUser = getCurrentUser()
if (currentUser.role === 'student') {
  ElMessage.warning('无访问权限')
  router.replace('/rooms')
}

const isAdmin = ref(currentUser?.role === 'admin')
const loading = ref(false)
const users = ref([])
const total = ref(0)
const saving = ref(false)

const isPasswordFocused = ref(false)
const passwordRuleText = '密码至少8位，且需包含数字、字母大小写或符号中的至少两类'

const validatePasswordStrength = (rule, value, callback) => {
  if (!value) {
    callback()
    return
  }
  if (value.length < 8) {
    callback(new Error('密码不能少于8位'))
    return
  }
  let types = 0
  if (/[0-9]/.test(value)) types++
  if (/[a-z]/.test(value)) types++
  if (/[A-Z]/.test(value)) types++
  if (/[^0-9a-zA-Z]/.test(value)) types++
  
  if (types < 2) {
    callback(new Error('需包含数字、小写、大写、符号至少两类'))
  } else {
    callback()
  }
}

const query = ref({
  page: 1,
  pageSize: 10,
  role: '',
  status: '',
  keyword: ''
})

const fetchData = async () => {
  loading.value = true
  try {
    const res = await getUserPage(query.value)
    users.value = res.records || []
    total.value = res.total || 0
  } catch (e) {
    ElMessage.error(e?.message || '获取用户列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  query.value.page = 1
  fetchData()
}

let debounceTimer = null
const debouncedSearch = () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    handleSearch()
  }, 300)
}

const resetQuery = () => {
  query.value = { page: 1, pageSize: 10, role: '', status: '', keyword: '' }
  fetchData()
}

// ----------------- 新增/编辑 -----------------
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }]
}

const addDialogVisible = ref(false)
const addFormRef = ref(null)
const addForm = ref({ username: '', password: '', role: 'student', contact: '' })

const openAddDialog = () => {
  addForm.value = { username: '', password: '', role: 'student', contact: '' }
  addDialogVisible.value = true
  nextTick(() => addFormRef.value?.clearValidate())
}

const submitAdd = async () => {
  const valid = await addFormRef.value?.validate().catch(() => false)
  if (!valid) return
  
  try {
    await ElMessageBox.confirm('确定要创建此新用户吗？', '确认操作', {
      confirmButtonText: '创建',
      cancelButtonText: '取消',
      type: 'info'
    })
  } catch {
    return
  }

  saving.value = true
  try {
    await createUser(addForm.value)
    ElMessage.success('新增用户成功')
    addDialogVisible.value = false
    handleSearch()
  } catch (e) {
    ElMessage.error(e?.message || '新增失败')
  } finally {
    saving.value = false
  }
}

const editDialogVisible = ref(false)
const editFormRef = ref(null)
const editForm = ref({})
let currentUserId = null

const editRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
  newPassword: [
    { validator: validatePasswordStrength, trigger: 'blur' }
  ],
  oldPassword: [
    {
      validator: (rule, value, callback) => {
        if (!isAdmin.value && editForm.value.newPassword && !value) {
          callback(new Error('修改密码必须提供原密码!'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  confirmPassword: [
    {
      validator: (rule, value, callback) => {
        if (isAdmin.value && !value && editForm.value.newPassword) {
            callback(new Error('请确认新密码!'))
        } else if (editForm.value.newPassword && value !== editForm.value.newPassword) {
          callback(new Error('两次输入的密码不一致!'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

const openEditDialog = (row) => {
  currentUserId = row.userId
  editForm.value = { 
    username: row.username, 
    role: row.role, 
    contact: row.contact, 
    status: row.status,
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  }
  editDialogVisible.value = true
  nextTick(() => editFormRef.value?.clearValidate())
}

const submitEdit = async () => {
  const valid = await editFormRef.value?.validate().catch(() => false)
  if (!valid) return
  
  try {
    await ElMessageBox.confirm(`确定要${isAdmin.value ? '重置' : '修改'}吗？`, '确认操作', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }

  saving.value = true
  try {
    // 1. 修改基本信息
    await updateUserByAdmin(currentUserId, editForm.value)
    // 2. 如果填写了密码，则额外请求修改密码
    if (editForm.value.newPassword) {
      if (isAdmin.value) {
        await adminResetPassword(currentUserId, { newPassword: editForm.value.newPassword })
        ElMessage.success('密码重置成功')
      } else {
        await updatePassword(currentUserId, { 
          oldPassword: editForm.value.oldPassword,
          newPassword: editForm.value.newPassword
        })
        ElMessage.success('密码修改成功')
      }
      
      editForm.value.oldPassword = ''
      editForm.value.newPassword = ''
      editForm.value.confirmPassword = ''
    } else {
      ElMessage.success('更新成功')
    }
    
    editDialogVisible.value = false
    fetchData()
  } catch (e) {
    ElMessage.error(e?.message || '更新失败')
  } finally {
    saving.value = false
  }
}

// ----------------- 状态 & 删除 -----------------
const toggleStatus = async (row) => {
  const targetStatus = row.status === 'active' ? 'banned' : 'active'
  const actionText = targetStatus === 'active' ? '启用' : '禁用'
  
  try {
    await ElMessageBox.confirm(`确定要${actionText}用户 "${row.username}" 吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }
  
  try {
    await updateUserStatus(row.userId, { status: targetStatus })
    ElMessage.success(`用户已成功${actionText}`)
    fetchData()
  } catch (e) {
    ElMessage.error(e?.message || `切换状态失败`)
  }
}

const handleDelete = (row) => {
  ElMessageBox.confirm(`确定要删除用户 "${row.username}" 吗？此操作不可恢复。`, '危险操作', {
    confirmButtonText: '确定删除',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await deleteUser(row.userId)
      ElMessage.success('成功删除用户')
      fetchData()
    } catch (e) {
      ElMessage.error(e?.message || '删除用户失败')
    }
  }).catch(() => {})
}

// ----------------- 统计弹窗 -----------------
const statsDialogVisible = ref(false)
const statsLoading = ref(false)
const statsData = ref({})

const openStatsDialog = async (row) => {
  statsDialogVisible.value = true
  statsLoading.value = true
  statsData.value = {}
  try {
    statsData.value = await getUserStats(row.userId)
  } catch (e) {
    ElMessage.error(e?.message || '获取用户统计失败')
  } finally {
    statsLoading.value = false
  }
}

// ----------------- 预约记录 -----------------
const reservationsDialogVisible = ref(false)
const resLoading = ref(false)
const reservationsList = ref([])

const formatTime = (isoString) => {
  if (!isoString) return ''
  const date = new Date(isoString)
  return date.toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  }).replace(/\//g, '-')
}

const getResStatusText = (status) => {
  const map = { reserved: '已预约', occupied: '进行中', completed: '已完成', cancelled: '已取消' }
  return map[status] || status
}
const getResStatusTagType = (status) => {
  if (status === 'completed') return 'success'
  if (status === 'cancelled') return 'warning'
  if (status === 'occupied') return 'primary'
  if (status === 'reserved') return 'info'
  return ''
}

const openReservationsDialog = async (row) => {
  reservationsDialogVisible.value = true
  resLoading.value = true
  reservationsList.value = []
  try {
    reservationsList.value = await getUserReservations(row.userId)
  } catch (e) {
    ElMessage.error(e?.message || '获取预约记录失败')
  } finally {
    resLoading.value = false
  }
}

onMounted(fetchData)
</script>

<style scoped>
.user-manage-page {
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

.filter-select { width: 120px; }
.search-input { width: 220px; }

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

.icon-btn {
  padding: 8px 16px;
  background: #fff;
  border: 1px solid #d1d5db;
  color: #374151;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}
.icon-btn.outline { background: #f9fafb; }
.icon-btn:hover { border-color: #9ca3af; }

/* 表格容器 */
.table-wrapper {
  max-width: 1100px;
  margin: 0 auto;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  overflow: hidden;
}

.pagination-container {
  padding: 16px 20px;
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid #f3f4f6;
}

/* 标签样式 */
.role-admin { color: #3b82f6; font-size: 13px; font-weight: 500; }
.role-student { color: #6b7280; font-size: 13px; }

.status-tag {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}
.tag-green { background: #dcfce7; color: #16a34a; }
.tag-red { background: #fee2e2; color: #dc2626; }

/* 操作按钮 (新版语义颜色半透明风格) */
.action-group {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex-wrap: nowrap;
  white-space: nowrap;
}
.btn-action {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  background: rgba(0,0,0,0.04);
  border: none;
  transition: all 0.2s;
  white-space: nowrap;
  word-break: keep-all;
  flex-shrink: 0;
}

.btn-action:hover {
  opacity: 0.8;
  transform: translateY(-1px);
}

.btn-edit { color: #409EFF; background: rgba(64,158,255,0.1); }
.btn-warning { color: #E6A23C; background: rgba(230,162,60,0.1); }
.btn-success { color: #67C23A; background: rgba(103,194,58,0.1); }
.btn-stats { color: #9C27B0; background: rgba(156,39,176,0.1); }
.btn-info { color: #17a2b8; background: rgba(23,162,184,0.1); }
.btn-danger { color: #F56C6C; background: rgba(245,108,108,0.1); }
/* 统计网格 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  padding: 10px;
}

.stat-item {
  background: #f9fafb;
  padding: 16px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stat-label {
  font-size: 13px;
  color: #6b7280;
}

.stat-val {
  font-size: 20px;
  font-weight: 700;
  color: #111;
}

.w-full { width: 100%; }
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

/* 自定义表格样式 */
.id-cell {
  white-space: nowrap;
  word-break: keep-all;
  font-weight: 500;
}

:deep(.el-table th.el-table__cell) {
  background-color: #f5f5f5;
  font-weight: 600;
  color: #374151;
  font-size: 13px;
  padding-left: 20px;
  padding-right: 20px;
  word-break: keep-all;
}
:deep(.el-table td.el-table__cell) {
  padding-left: 20px;
  padding-right: 20px;
  word-break: keep-all;
}
:deep(.el-table__row:hover > td) {
  background: #f9fafb !important;
}

@media (max-width: 768px) {
  .page-header { flex-direction: column; align-items: flex-start; }
  .header-right { width: 100%; }
}
</style>
