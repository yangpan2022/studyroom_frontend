import request from '@/utils/request'

/**
 * 查询预约列表
 * GET /reservations?userId=1
 */
export function getReservations(userId) {
  return request.get('/reservations', { params: { userId } })
}

/**
 * 签到
 * PUT /reservations/{id}/checkin
 */
export function checkIn(id) {
  return request.put(`/reservations/${id}/checkin`)
}

/**
 * 完成预约
 * PUT /reservations/{id}/complete
 */
export function completeReservation(id) {
  return request.put(`/reservations/${id}/complete`)
}

/**
 * 取消预约
 * PUT /reservations/{id}/cancel
 */
export function cancelReservation(id) {
  return request.put(`/reservations/${id}/cancel`)
}

/**
 * 创建预约
 * POST /reservations
 */
export function createReservation(data) {
  return request.post('/reservations', data)
}
