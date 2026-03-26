import request from '@/utils/request'

/**
 * 获取自习室列表
 * GET /studyrooms
 */
export function getStudyRooms() {
  return request.get('/rooms')
}
