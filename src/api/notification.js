import request from '@/utils/request'

/**
 * 查询当前用户通知列表
 * GET /notifications/user/{userId}
 */
export function getNotificationsByUser(userId) {
  return request.get(`/notifications/user/${userId}`)
}

/**
 * 查询单条通知详情
 * GET /notifications/{id}
 */
export function getNotificationById(id) {
  return request.get(`/notifications/${id}`)
}

/**
 * 标记通知为已读
 * PUT /notifications/{id}/read
 */
export function markNotificationRead(id) {
  return request.put(`/notifications/${id}/read`)
}

/**
 * 删除通知
 * DELETE /notifications/{id}
 */
export function deleteNotification(id) {
  return request.delete(`/notifications/${id}`)
}
