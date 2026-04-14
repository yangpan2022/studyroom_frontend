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
