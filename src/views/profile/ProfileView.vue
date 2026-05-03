<template>
  <div class="profile-page">

    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-text">
        <h1 class="page-title">个人信息</h1>
        <p class="page-subtitle">查看并修改你的账号资料</p>
      </div>
      <button class="logout-btn" @click="handleLogout">退出登录</button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="state-wrap">
      <el-icon class="is-loading" :size="28" color="#909399"><Loading /></el-icon>
    </div>

    <div v-else class="profile-card">

      <!-- 头像区域（仅显示圆形头像，无表单输入框，使用 stable computed url避免闪烁） -->
      <div class="avatar-section">
        <img
          class="avatar-img"
          :src="avatarUrl"
          alt="头像"
        />
        <div class="avatar-info">
          <span class="avatar-name">{{ userInfo.username || '用户' }}</span>
          <span class="avatar-role">{{ roleLabel(userInfo.role) }}</span>
        </div>
        <div class="action-group">
          <button class="edit-trigger-btn" @click="openEditDialog">修改个人信息</button>
          <button class="edit-trigger-btn" @click="openPasswordDialog">修改密码</button>
        </div>
      </div>

      <div class="divider" />

      <!-- 只读展示信息 -->
      <div class="profile-readonly">
        <div class="info-row">
          <span class="info-label">用户名</span>
          <span class="info-value">{{ userInfo.username || '-' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">角色</span>
          <span class="info-value">{{ roleLabel(userInfo.role) || '-' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">账号状态</span>
          <span class="info-value">{{ statusLabel(userInfo.status) || '-' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">密码</span>
          <span class="info-value info-value-mask">••••••••</span>
        </div>
        <div class="info-row">
          <span class="info-label">联系方式</span>
          <span class="info-value">{{ userInfo.contact || '未填写' }}</span>
        </div>
      </div>
    </div>

    <!-- 编辑信息弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      title="修改个人信息"
      width="400px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form 
        ref="editFormRef"
        :model="editForm"
        :rules="editRules"
        label-position="top"
        class="edit-dialog-form"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="editForm.username" placeholder="请输入用户名" clearable />
        </el-form-item>

        <el-form-item label="账号状态" prop="status">
          <el-select v-model="editForm.status" placeholder="请选择状态" class="w-full">
            <el-option label="正常" value="active" />
            <el-option label="禁用" value="inactive" />
          </el-select>
        </el-form-item>

        <el-form-item label="联系方式" prop="contact">
          <el-input v-model="editForm.contact" placeholder="请输入联系方式" clearable />
        </el-form-item>

      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="saving" @click="handleSave">确认修改</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 修改密码弹窗 -->
    <el-dialog
      v-model="passwordDialogVisible"
      title="修改密码"
      width="550px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form 
        ref="passwordFormRef"
        :model="passwordForm"
        :rules="passwordRules"
        label-position="top"
        class="edit-dialog-form"
      >
        <el-form-item label="原密码" prop="oldPassword">
          <el-input v-model="passwordForm.oldPassword" placeholder="请输入原密码" type="password" show-password clearable />
        </el-form-item>

        <el-form-item label="新密码" prop="newPassword">
          <el-input 
            v-model="passwordForm.newPassword" 
            :placeholder="isPasswordFocused ? '' : passwordRuleText" 
            type="password" 
            show-password 
            clearable 
            @focus="isPasswordFocused = true"
            @blur="isPasswordFocused = false"
          />
        </el-form-item>

        <el-form-item label="确认新密码" prop="confirmPassword">
          <el-input v-model="passwordForm.confirmPassword" placeholder="请再次输入新密码" type="password" show-password clearable />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="passwordDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="passwordSaving" @click="handleChangePassword">确认修改</el-button>
        </span>
      </template>
    </el-dialog>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import { getUserById, updateUser, updatePassword } from '@/api/user'

import { getCurrentUser } from '@/utils/auth'

// 兼容 id / userId 两种字段名
const currentUser = getCurrentUser()
const userId = currentUser.userId || currentUser.id

const loading = ref(false)
const router = useRouter()

// ===== 退出登录 =====
const handleLogout = () => {
  sessionStorage.removeItem('token')
  sessionStorage.removeItem('currentUser')
  router.replace('/login')
  ElMessage.success('已退出登录')
}

// 稳定头像地址：根据角色判断
const avatarUrl = computed(() => {
  if (currentUser.role === 'student') {
    return '/avatars/student.png'
  }
  return '/avatars/user1.png'
})

// 本地展示数据
const userInfo = ref({
  username: '',
  role:     '',
  status:   '',
  avatar:   '',
  contact:  ''
})

// ===== 弹窗及编辑状态 =====
const dialogVisible = ref(false)
const saving  = ref(false)
const editFormRef = ref(null)

const editForm = ref({
  username: '',
  status: '',
  contact: ''
})

const editRules = {
  username: [
    { required: true, message: '用户名不能为空', trigger: 'blur' }
  ]
}

// ===== 密码修改弹窗及状态 =====
const passwordDialogVisible = ref(false)
const passwordSaving = ref(false)
const passwordFormRef = ref(null)

const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const isPasswordFocused = ref(false)
const passwordRuleText = '密码至少8位，且需包含数字、字母大小写或符号中的至少两类'

const validatePasswordStrength = (rule, value, callback) => {
  if (!value) {
    callback(new Error('新密码不能为空'))
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

const checkNewPasswordMatch = (rule, value, callback) => {
  if (value === '') {
    callback(new Error('请再次输入新密码'))
  } else if (value !== passwordForm.value.newPassword) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const passwordRules = {
  oldPassword: [{ required: true, message: '原密码不能为空', trigger: 'blur' }],
  newPassword: [
    { validator: validatePasswordStrength, trigger: 'blur' }
  ],
  confirmPassword: [{ validator: checkNewPasswordMatch, trigger: 'blur' }]
}

// ===== 标签映射 =====
const roleLabel = (role) => ({ admin: '管理员', student: '学生' }[role] ?? role)
const statusLabel = (status) => ({ active: '正常', inactive: '禁用' }[status] ?? status)

// ===== 拉取用户信息 =====
const fetchUser = async () => {
  if (!userId) {
    ElMessage.error('未检测到登录用户，请重新登录')
    return
  }
  loading.value = true
  try {
    const data = await getUserById(userId)
    userInfo.value = {
      username: data.username ?? '',
      role:     data.role     ?? '',
      status:   data.status   ?? '',
      avatar:   data.avatar   ?? '',
      contact:  data.contact  ?? ''
    }
  } catch {
    ElMessage.error('加载用户信息失败')
  } finally {
    loading.value = false
  }
}

const openEditDialog = () => {
  editForm.value = {
    username: userInfo.value.username,
    status: userInfo.value.status,
    contact: userInfo.value.contact
  }
  dialogVisible.value = true
}

const openPasswordDialog = () => {
  passwordForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
  passwordDialogVisible.value = true
}

// ===== 密码提交修改 =====
const handleChangePassword = async () => {
  const valid = await passwordFormRef.value?.validate().catch(() => false)
  if (!valid) return

  passwordSaving.value = true
  try {
    await updatePassword(userId, {
      oldPassword: passwordForm.value.oldPassword,
      newPassword: passwordForm.value.newPassword
    })
    ElMessage.success('修改密码成功')
    passwordDialogVisible.value = false
    passwordFormRef.value?.resetFields()
  } catch (e) {
    ElMessage.error(e?.message || '修改密码失败')
  } finally {
    passwordSaving.value = false
  }
}

// ===== 保存修改 =====
const handleSave = async () => {
  if (!userId) return

  // 校验表单
  const valid = await editFormRef.value?.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  try {
    const payload = {
      username: editForm.value.username,
      status: editForm.value.status,
      contact: editForm.value.contact
    }

    await updateUser(userId, payload)
    
    // 方案 A：重新获取更新后的数据
    await fetchUser()

    // 方案 A 步骤2：重新获取最新的用户信息结构后，同步维护当前的强缓存
    const stored = JSON.parse(sessionStorage.getItem('currentUser') || '{}')
    const updated = { ...stored, ...res.data }
    
    // 强制触发响应式依赖
    userInfo.value = updated
    sessionStorage.setItem('currentUser', JSON.stringify(updated))
    
    ElMessage.success('修改成功')
    dialogVisible.value = false

  } catch (e) {
    ElMessage.error(e?.message || '保存失败，请稍后重试')
  } finally {
    saving.value = false
  }
}

onMounted(fetchUser)
</script>

<style scoped>
.profile-page {
  background: #f5f6f7;
  padding: 40px 0 48px;
  box-sizing: border-box;
}

/* 标题区域：Flex 布局实现两端对齐 */
.page-header {
  max-width: 600px;
  margin: 0 auto 28px;
  padding: 0 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-text {
  display: flex;
  flex-direction: column;
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

/* 退出登录按钮 */
.logout-btn {
  padding: 8px 16px;
  background: #111;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}

.logout-btn:hover {
  background: #333;
}

/* 卡片 */
.profile-card {
  max-width: 600px;
  margin: 0 auto;
  padding: 0 24px;
  background: #fff;
  border-radius: 12px;
  padding: 32px 36px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

/* 头像区域 */
.avatar-section {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
}

.avatar-img {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  object-fit: cover;
  background: #f3f4f6;
  border: 2px solid #e5e7eb;
  flex-shrink: 0;
}

.avatar-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.avatar-name {
  font-size: 18px;
  font-weight: 700;
  color: #111;
}

.avatar-role {
  font-size: 13px;
  color: #9ca3af;
}

/* 分割线 */
.divider {
  height: 1px;
  background: #f3f4f6;
  margin-bottom: 24px;
}

/* 表单 */
.profile-form {
  width: 100%;
}

/* 输入框覆盖 */
:deep(.el-input__wrapper) {
  border-radius: 8px;
  box-shadow: 0 0 0 1px #e5e7eb inset;
}

:deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #9ca3af inset;
}

:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1.5px #111 inset;
}

:deep(.el-input.is-disabled .el-input__wrapper) {
  background: #f9fafb;
  box-shadow: none;
}

:deep(.el-form-item__label) {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  padding-bottom: 6px;
}

:deep(.el-form-item) {
  margin-bottom: 18px;
}

/* 字段提示 */
.field-tip {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 5px;
}

/* 保存按钮 */
.form-actions {
  margin-top: 24px;
}

.save-btn {
  padding: 11px 32px;
  background: #111;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.save-btn:hover:not(:disabled) {
  background: #333;
}

.save-btn:disabled {
  background: #d1d5db;
  cursor: not-allowed;
}

/* Loading / state */
.state-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

/* 响应式 */
@media (max-width: 640px) {
  .profile-card { padding: 24px 20px; }
  .page-header  { padding: 0 16px; }
  .avatar-section { flex-wrap: wrap; }
  .edit-trigger-btn { margin-left: 0; margin-top: 10px; width: 100%; justify-content: center; }
}

/* ===== 新增：只读信息展示与弹窗样式 ===== */

/* 动作按钮组 */
.action-group {
  margin-left: auto;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
}

/* 顶部编辑按钮 */
.edit-trigger-btn {
  padding: 8px 20px;
  background: #111;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}

.edit-trigger-btn:hover {
  background: #333;
}

/* 只读信息列表 */
.profile-readonly {
  display: flex;
  flex-direction: column;
}

.info-row {
  display: flex;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid #f9fafb;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  width: 120px;
  font-size: 14px;
  font-weight: 500;
  color: #6b7280; /* 浅灰标签 */
}

.info-value {
  flex: 1;
  font-size: 15px;
  color: #111;
  font-weight: 500;
}

.info-value-mask {
  font-family: monospace;
  letter-spacing: 2px;
  color: #4b5563;
}

/* 弹窗及表单微调 */
.w-full {
  width: 100%;
}

.mb-3 {
  margin-bottom: 12px;
}

.dialog-divider {
  height: 1px;
  background: #f3f4f6;
  margin: 20px 0;
}

/* 覆盖 Element 弹窗按钮样式以贴合黑白极简风格 */
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
</style>
