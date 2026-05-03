import axios from 'axios'

const request = axios.create({
  baseURL: 'http://localhost:8088',
  timeout: 10000
})

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    // 从 sessionStorage 获取 token
    const token = sessionStorage.getItem('token')
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  error => Promise.reject(error)
)

// 响应拦截器：自动解包 data 层
request.interceptors.response.use(
  response => {
    const res = response.data
    if (res.code === 200) {
      return res.data
    }
    return Promise.reject(new Error(res.message || '请求失败'))
  },
  error => {
    return Promise.reject(error)
  }
)

export default request
