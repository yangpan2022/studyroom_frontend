import request from '@/utils/request'

/**
 * 获取系统总览数据
 * GET /analysis/dashboard
 */
export function getDashboard() {
  return request.get('/analysis/dashboard')
}

/**
 * 获取指定自习室当前状态
 * GET /analysis/room/{roomId}/current
 */
export function getRoomCurrent(roomId) {
  return request.get(`/analysis/room/${roomId}/current`)
}

/**
 * 获取指定自习室按小时占用率
 * GET /analysis/room/{roomId}/hourly
 */
export function getRoomHourly(roomId) {
  return request.get(`/analysis/room/${roomId}/hourly`)
}
