import request from '@/utils/request'

/**
 * 获取用户信息
 * GET /users/{id}
 */
export function getUserById(id) {
  return request.get(`/users/${id}`)
}

/**
 * 更新用户信息（avatar / contact）
 * PUT /users/{id}
 */
export function updateUser(id, data) {
  return request.put(`/users/${id}`, data)
}

/**
 * 修改用户密码
 * PUT /users/{id}/password
 */
export function updatePassword(id, data) {
  return request.put(`/users/${id}/password`, data)
}

/**
 * 管理员重置密码
 * PUT /users/{id}/admin_reset_password
 */
export function adminResetPassword(id, data) {
  return request.put(`/users/${id}/admin_reset_password`, data)
}

/**
 * 用户分页列表
 * GET /users/page
 */
export function getUserPage(params) {
  return request.get('/users/page', { params })
}

/**
 * 新增用户 (管理员)
 * POST /users/admin_create
 */
export function createUser(data) {
  return request.post('/users/admin_create', data)
}

/**
 * 编辑用户 (管理员)
 * PUT /users/{id}/admin_update
 */
export function updateUserByAdmin(id, data) {
  return request.put(`/users/${id}/admin_update`, data)
}

/**
 * 启用/禁用用户状态
 * PUT /users/{id}/status
 */
export function updateUserStatus(id, data) {
  return request.put(`/users/${id}/status`, data)
}

/**
 * 删除用户
 * DELETE /users/{id}
 */
export function deleteUser(id) {
  return request.delete(`/users/${id}`)
}

/**
 * 用户统计信息
 * GET /users/{id}/stats
 */
export function getUserStats(id) {
  return request.get(`/users/${id}/stats`)
}

/**
 * 获取用户的预约记录
 * GET /reservations
 */
export function getUserReservations(userId) {
  return request.get('/reservations', { params: { userId } })
}
