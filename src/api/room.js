import request from '@/utils/request'

/**
 * 获取自习室列表
 * GET /rooms
 */
export function getStudyRooms() {
  return request.get('/rooms')
}

/**
 * 获取自习室详情
 * GET /rooms/{id}
 */
export function getRoomById(id) {
  return request.get(`/rooms/${id}`)
}

/**
 * 新增自习室
 * POST /rooms
 */
export function createRoom(data) {
  return request.post('/rooms', data)
}

/**
 * 更新自习室
 * PUT /rooms/{id}
 */
export function updateRoom(id, data) {
  return request.put(`/rooms/${id}`, data)
}

/**
 * 删除自习室
 * DELETE /rooms/{id}
 */
export function deleteRoom(id) {
  return request.delete(`/rooms/${id}`)
}
