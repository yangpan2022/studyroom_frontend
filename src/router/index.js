import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '@/layout/MainLayout.vue'
import LoginView from '@/views/login/LoginView.vue'
import RegisterView from '@/views/login/RegisterView.vue'
import RoomListView from '@/views/room/RoomListView.vue'
import SeatListView from '@/views/seat/SeatListView.vue'
import SeatManageView from '@/views/seat/SeatManageView.vue'
import CalibrationView from '@/views/seat/CalibrationView.vue'
import DetectionTestView from '@/views/seat/DetectionTestView.vue'
import RealTimeView from '@/views/monitor/RealTimeView.vue'
import ReservationView from '@/views/reservation/ReservationView.vue'
import NotificationView from '@/views/notification/NotificationView.vue'
import DashboardView from '@/views/analysis/DashboardView.vue'
import ProfileView from '@/views/profile/ProfileView.vue'
import UserManagementView from '@/views/user/UserManagementView.vue'

const routes = [
  // 独立页面（不使用 MainLayout）
  {
    path: '/login',
    name: 'Login',
    component: LoginView
  },
  {
    path: '/register',
    name: 'Register',
    component: RegisterView
  },
  // 主框架下的页面
  {
    path: '/',
    component: MainLayout,
    redirect: '/rooms',
    children: [
      {
        path: '/rooms',
        name: 'RoomList',
        component: RoomListView
      },
      {
        path: '/rooms/:roomId/seats',
        name: 'SeatList',
        component: SeatListView
      },
      {
        path: '/reservations',
        name: 'Reservations',
        component: ReservationView
      },
      {
        path: '/notifications',
        name: 'Notifications',
        component: NotificationView
      },
      {
        path: '/analysis',
        name: 'Dashboard',
        component: DashboardView
      },
      {
        path: '/profile',
        name: 'Profile',
        component: ProfileView
      },
      {
        path: '/seats/manage',
        name: 'SeatManage',
        component: SeatManageView
      },
      {
        path: '/users/manage',
        name: 'UserManage',
        component: UserManagementView
      },
      {
        path: '/seats/:id/calibration',
        name: 'Calibration',
        component: CalibrationView
      },
      {
        path: '/detection-test',
        name: 'DetectionTest',
        component: DetectionTestView
      },
      {
        path: '/monitor',
        name: 'RealTimeView',
        component: RealTimeView
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
