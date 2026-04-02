import { createBrowserRouter } from 'react-router';
import { Dashboard } from './components/Dashboard';
import { ReschedulingFlow } from './components/ReschedulingFlow';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Dashboard,
  },
  {
    path: '/reschedule',
    Component: ReschedulingFlow,
  },
]);
