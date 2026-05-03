import request from '@/utils/request'

/**
 * 查询预约列表
 * GET /reservations?userId=1
 */
export function getReservations(userId) {
  const params = {}
  if (userId) {
    params.userId = userId
  }
  return request.get('/reservations', { params })
}

/**
 * 获取预约详情
 * GET /reservations/{id}
 */
export function getReservationById(id) {
  return request.get(`/reservations/${id}`)
}
/**
 * 签到
 * PUT /reservations/{id}/checkin
 */
export function checkIn(id) {
  return request.put(`/reservations/${id}/checkin`)
}

/**
 * 签退
 * PUT /reservations/{id}/checkout
 */
export function checkOut(id) {
  return request.put(`/reservations/${id}/checkout`)
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

/**
 * 修改预约
 * PUT /reservations/{id}
 */
export function updateReservation(id, data) {
  return request.put(`/reservations/${id}`, data)
}
