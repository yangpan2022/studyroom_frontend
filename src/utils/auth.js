/**
 * 安全读取 localStorage 中的 currentUser。
 * 兼容 "undefined"（字符串）、null、JSON 损坏等情况。
 * @returns {Object} 用户对象，字段缺失时返回 {}
 */
export function getCurrentUser() {
  try {
    const raw = localStorage.getItem('currentUser')
    if (!raw || raw === 'undefined' || raw === 'null') return {}
    return JSON.parse(raw) || {}
  } catch {
    return {}
  }
}

/**
 * 兼容性 userId 提取（支持 id / userId / user_id 三种字段名）
 */
export function getCurrentUserId() {
  const user = getCurrentUser()
  return user.id || user.userId || user.user_id || null
}
