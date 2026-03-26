import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '@/layout/MainLayout.vue'
import RoomListView from '@/views/room/RoomListView.vue'
import SeatListView from '@/views/seat/SeatListView.vue'
import ReservationView from '@/views/reservation/ReservationView.vue'
import NotificationView from '@/views/notification/NotificationView.vue'
import DashboardView from '@/views/analysis/DashboardView.vue'

const routes = [
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
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
