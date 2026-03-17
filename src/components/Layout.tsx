import { Outlet, Link, useLocation } from 'react-router-dom';

export default function Layout() {
  const location = useLocation();
  
  const navItem = (path: string, label: string) => {
    const isActive = location.pathname === path;
    return (
      <Link 
        to={path} 
        className={`px-4 py-2 rounded-md font-medium transition-colors ${
          isActive ? 'bg-white text-blue-600 shadow-sm' : 'text-blue-100 hover:bg-blue-700 hover:text-white'
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <nav className="bg-blue-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-white text-blue-600 p-1.5 rounded-lg font-black text-xl">GB</div>
            <span className="text-white text-xl font-bold tracking-tight">GenieBook ATS</span>
          </div>
          <div className="flex gap-2">
            {navItem('/', 'Active Pipeline')}
            {navItem('/add-applicant', 'Add Candidate')}
            {navItem('/calendar', 'Interviews')}
            {navItem('/archive', 'Archive (Quit/Blacklist)')} 
          </div>
        </div>
      </nav>
      <main className="p-8 max-w-7xl mx-auto">
        <Outlet />
      </main>
    </div>
  );
}