import { RouterProvider } from 'react-router';
import { router } from './routes';
import { Toaster } from './components/ui/sonner';
import { ClassProvider } from './context/ClassContext';

export default function App() {
  return (
    <ClassProvider>
      <RouterProvider router={router} />
      <Toaster />
    </ClassProvider>
  );
}