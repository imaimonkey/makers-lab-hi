import { createBrowserRouter } from 'react-router-dom'
import { RootLayout } from './layouts/RootLayout'
import { HomePage } from '../pages/home/HomePage'
import { RoomOnePage } from '../pages/room-one/RoomOnePage'
import { RoomTwoPage } from '../pages/room-two/RoomTwoPage'
import { RoomThreePage } from '../pages/room-three/RoomThreePage'
import { RoomFourPage } from '../pages/room-four/RoomFourPage'
import { NotFoundPage } from '../pages/not-found/NotFoundPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <NotFoundPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'rooms/one', element: <RoomOnePage /> },
      { path: 'rooms/two', element: <RoomTwoPage /> },
      { path: 'rooms/three', element: <RoomThreePage /> },
      { path: 'rooms/four', element: <RoomFourPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
