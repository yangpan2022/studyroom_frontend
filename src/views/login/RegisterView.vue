<template>
  <div class="register-page">

    <!-- 左侧预留区域 -->
    <div class="register-left">
      <div class="left-placeholder">
        <div class="brand-name">智能自习室管理系统</div>
        <p class="brand-sub">专注学习，智慧管理</p>
      </div>
    </div>

    <!-- 右侧表单区域 -->
    <div class="register-right">
      <div class="form-box">

        <!-- 标题 -->
        <h2 class="form-title">用户注册</h2>
        <p class="form-subtitle">创建您的自习室系统账号</p>

        <!-- 表单 -->
        <el-form
          ref="formRef"
          :model="registerForm"
          :rules="registerRules"
          label-position="top"
          @keyup.enter="handleRegister"
        >
          <!-- 用户名 -->
          <el-form-item prop="username">
            <el-input
              v-model="registerForm.username"
              placeholder="请输入用户名"
              size="large"
              :prefix-icon="User"
              clearable
            />
          </el-form-item>

          <!-- 密码 -->
          <el-form-item prop="password">
            <el-input
              v-model="registerForm.password"
              placeholder="请输入密码"
              type="password"
              size="large"
              :prefix-icon="Lock"
              show-password
            />
          </el-form-item>

          <!-- 确认密码 -->
          <el-form-item prop="confirmPassword">
            <el-input
              v-model="registerForm.confirmPassword"
              placeholder="请再次输入密码"
              type="password"
              size="large"
              :prefix-icon="Lock"
              show-password
            />
          </el-form-item>


          <!-- 注册按钮 -->
          <el-form-item>
            <button
              class="register-btn"
              :disabled="loading"
              @click="handleRegister"
            >
              <span v-if="loading" class="btn-loading">
                <el-icon class="is-loading"><Loading /></el-icon>
                注册中...
              </span>
              <span v-else>注册</span>
            </button>
          </el-form-item>
        </el-form>

        <!-- 去登录 -->
        <div class="form-footer">
          已有账号？
          <span class="link" @click="router.push('/login')">去登录</span>
        </div>

      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock, Loading } from '@element-plus/icons-vue'
import request from '@/utils/request'

const router = useRouter()

// ===== 表单数据 =====
const formRef = ref(null)
const loading = ref(false)

const registerForm = reactive({
  username:        '',
  password:        '',
  confirmPassword: '',
  role:            'student',  // 固定为学生，后端也会强制设置
  status:          'active'
})

// ===== 确认密码校验器 =====
const validateConfirm = (rule, value, callback) => {
  if (!value) {
    callback(new Error('请再次输入密码'))
  } else if (value !== registerForm.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

// ===== 校验规则 =====
const registerRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于 6 位', trigger: 'blur' }
  ],
  confirmPassword: [
    { validator: validateConfirm, trigger: 'blur' }
  ]
}

// ===== 注册逻辑 =====
const handleRegister = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    // POST /users
    await request.post('/users', {
      username: registerForm.username,
      password: registerForm.password,
      role:     registerForm.role,
      status:   registerForm.status
    })

    ElMessage.success('注册成功，即将跳转到登录页...')
    // 短暂延迟后跳转登录页
    setTimeout(() => router.push('/login'), 1200)
  } catch (e) {
    ElMessage.error(e?.message || '注册失败，请稍后重试')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* ===== 整体布局 ===== */
.register-page {
  display: flex;
  height: 100vh;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}

/* ===== 左侧预留（40%）===== */
.register-left {
  width: 40%;
  flex-shrink: 0;
  background: linear-gradient(145deg, #1e1e2e 0%, #2d3748 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.left-placeholder {
  text-align: center;
  user-select: none;
}

.brand-name {
  font-size: 22px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  letter-spacing: 0.04em;
  margin-bottom: 10px;
}

.brand-sub {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.45);
  margin: 0;
}

/* ===== 右侧表单（60%）===== */
.register-right {
  flex: 1;
  background: #f5f6f7;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  overflow-y: auto;
}

/* 表单卡片 */
.form-box {
  width: 100%;
  max-width: 360px;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.07);
  padding: 40px 36px 32px;
}

/* 标题 */
.form-title {
  font-size: 22px;
  font-weight: 700;
  color: #111;
  text-align: center;
  margin: 0 0 6px;
}

.form-subtitle {
  font-size: 13px;
  color: #9ca3af;
  text-align: center;
  margin: 0 0 28px;
}

/* 输入框样式覆盖 */
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

/* Select 样式覆盖 */
:deep(.el-select .el-input__wrapper) {
  border-radius: 8px;
}

/* 隐藏 label */
:deep(.el-form-item__label) {
  display: none;
}

:deep(.el-form-item) {
  margin-bottom: 16px;
}

/* 注册按钮 */
.register-btn {
  width: 100%;
  padding: 12px 0;
  background: #111;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 4px;
}

.register-btn:hover:not(:disabled) {
  background: #333;
}

.register-btn:disabled {
  background: #d1d5db;
  cursor: not-allowed;
}

.btn-loading {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 底部跳转 */
.form-footer {
  text-align: center;
  font-size: 13px;
  color: #9ca3af;
  margin-top: 20px;
}

.link {
  color: #111;
  font-weight: 500;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* ===== 响应式 ===== */
@media (max-width: 768px) {
  .register-left {
    display: none;
  }

  .register-right {
    width: 100%;
  }

  .form-box {
    padding: 32px 24px;
    box-shadow: none;
    border-radius: 0;
  }
}
</style>
