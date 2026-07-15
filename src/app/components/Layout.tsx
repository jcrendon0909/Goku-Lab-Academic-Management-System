import { Outlet } from 'react-router-dom';
import { Header } from './Header';

export function Layout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#26AAA3]/20 via-[#67A934]/10 to-[#F8B50E]/5">
      <Header />
      <main className="pt-12 max-w-7xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}