import { createBrowserRouter } from 'react-router';
import { Dashboard } from './components/Dashboard';
import { ReschedulingFlow } from './components/ReschedulingFlow';
import { PagosPage } from './components/PagosPage';
import { LoginPage } from './components/LoginPage'; 

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Dashboard,
  },
  {
    path: '/reschedule',
    Component: ReschedulingFlow,
  },
  {
    path: '/pagos',
    Component: PagosPage,
  },
  {
    path: '/login',
    Component: LoginPage,
  },
]);