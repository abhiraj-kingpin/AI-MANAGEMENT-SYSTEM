import { Outlet } from 'react-router-dom';
import { Atmosphere } from './Atmosphere';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppShell() {
  return (
    <div className="relative flex min-h-screen">
      <Atmosphere />
      <Sidebar />
      <div className="relative flex flex-1 flex-col">
        <Topbar />
        <main className="flex-1 p-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
