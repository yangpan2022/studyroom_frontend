<template>
  <div class="login-page">

    <!-- 左侧预留区域（可后续填充图片/宣传内容） -->
    <div class="login-left">
      <div class="left-placeholder">
        <div class="brand-name">智能自习室管理系统</div>
        <p class="brand-sub">专注学习，智慧管理</p>
      </div>
    </div>

    <!-- 右侧表单区域 -->
    <div class="login-right">
      <div class="form-box">

        <!-- 标题 -->
        <h2 class="form-title">系统登录</h2>
        <p class="form-subtitle">欢迎回来，请登录您的账号</p>

        <!-- 表单 -->
        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          label-position="top"
          @keyup.enter="handleLogin"
        >
          <!-- 用户名 -->
          <el-form-item prop="username">
            <el-input
              v-model="form.username"
              placeholder="请输入用户名"
              size="large"
              :prefix-icon="User"
              clearable
            />
          </el-form-item>

          <!-- 密码 -->
          <el-form-item prop="password">
            <el-input
              v-model="form.password"
              placeholder="请输入密码"
              type="password"
              size="large"
              :prefix-icon="Lock"
              show-password
            />
          </el-form-item>

          <!-- 登录按钮 -->
          <el-form-item>
            <button
              class="login-btn"
              :disabled="loading"
              @click="handleLogin"
            >
              <span v-if="loading" class="btn-loading">
                <el-icon class="is-loading"><Loading /></el-icon>
                登录中...
              </span>
              <span v-else>登录</span>
            </button>
          </el-form-item>
        </el-form>

        <!-- 注册跳转 -->
        <div class="form-footer">
          没有账号？
          <span class="link" @click="router.push('/register')">去注册</span>
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

// ===== 表单状态 =====
const formRef = ref(null)
const loading = ref(false)

const form = reactive({
  username: '',
  password: ''
})

// ===== 校验规则 =====
const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    // 不设置 trigger，只在点击登录按钮时手动触发校验
    { required: true, message: '请输入密码' }
  ]
}

// ===== 登录逻辑 =====
const handleLogin = async () => {
  // 表单校验
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    // 调用登录接口
    const data = await request.post('/users/login', {
      username: form.username,
      password: form.password
    })

    // 存储 token 和用户信息（兼容 data.user 和直接返回的平层格式）
    const userInfo = data.user ?? data
    sessionStorage.setItem('token', data.token ?? userInfo.token)
    sessionStorage.setItem('currentUser', JSON.stringify(userInfo))

    ElMessage.success('登录成功')

    // 根据角色跳转
    // 登录成功后统一跳转到 /rooms（项目无独立 admin 路由）
    router.push('/rooms')
  } catch (e) {
    ElMessage.error(e?.message || '用户名或密码错误，请重试')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* ===== 整体布局：左右分栏 ===== */
.login-page {
  display: flex;
  height: 100vh;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}

/* ===== 左侧预留区域（40%）===== */
.login-left {
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

/* ===== 右侧表单区域（60%）===== */
.login-right {
  flex: 1;
  background: #f5f6f7;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
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

/* 移除 el-form-item 默认 label 空间 */
:deep(.el-form-item__label) {
  display: none;
}

:deep(.el-form-item) {
  margin-bottom: 16px;
}

/* 登录按钮 */
.login-btn {
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

.login-btn:hover:not(:disabled) {
  background: #333;
}

.login-btn:disabled {
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
  .login-left {
    display: none;  /* 小屏隐藏左侧 */
  }

  .login-right {
    width: 100%;
  }

  .form-box {
    padding: 32px 24px;
    box-shadow: none;
    border-radius: 0;
  }
}
</style>
