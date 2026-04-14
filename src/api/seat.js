import request from '@/utils/request'

/**
 * 获取指定自习室的座位列表
 * GET /rooms/{roomId}/seats
 */
export function getSeatsByRoom(roomId) {
  return request.get(`/rooms/${roomId}/seats`)
}

/**
 * 获取所有座位
 * GET /seats
 */
export function getAllSeats() {
  return request.get('/seats')
}

/**
 * 新增座位
 * POST /seats
 */
export function createSeat(data) {
  return request.post('/seats', data)
}

/**
 * 更新座位
 * PUT /seats/{id}
 */
export function updateSeat(id, data) {
  return request.put(`/seats/${id}`, data)
}

/**
 * 删除座位
 * DELETE /seats/{id}
 */
export function deleteSeat(id) {
  return request.delete(`/seats/${id}`)
}

/**
 * 获取座位标定区域
 * GET /seats/{id}/region
 */
export function getSeatRegion(id) {
  return request.get(`/seats/${id}/region`)
}

/**
 * 保存座位标定区域
 * PUT /seats/{id}/region
 */
export function saveSeatRegion(id, data) {
  return request.put(`/seats/${id}/region`, data)
}

/**
 * 清除座位标定区域
 * DELETE /seats/{id}/region
 */
export function clearSeatRegion(id) {
  return request.delete(`/seats/${id}/region`)
}
