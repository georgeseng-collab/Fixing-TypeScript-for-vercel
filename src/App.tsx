// @ts-nocheck
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ApplicantForm from './pages/ApplicantForm';
import CalendarView from './pages/CalendarView';
import Archive from './pages/Archive';
import CandidateSearch from './pages/CandidateSearch'; // NEW IMPORT

export default function App() {
  const navLink = "flex items-center gap-2 text-slate-600 hover:text-blue-600 font-bold text-sm transition-colors";

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
        <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link to="/" className="text-xl font-black tracking-tighter text-blue-600 flex items-center gap-2">
                <span className="bg-blue-600 text-white p-1 rounded">GB</span> GenieBook ATS
              </Link>
              <div className="hidden md:flex items-center gap-6">
                <Link to="/" className={navLink}>📊 Pipeline</Link>
                <Link to="/search" className={navLink}>🔍 Search</Link> {/* NEW LINK */}
                <Link to="/calendar" className={navLink}>📅 Calendar</Link>
                <Link to="/archive" className={navLink}>🗄️ Archive</Link>
              </div>
            </div>
            <Link to="/add" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 shadow-md shadow-blue-100 transition-all">
              + Add Candidate
            </Link>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-6 py-10">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/add" element={<ApplicantForm />} />
            <Route path="/calendar" element={<CalendarView />} />
            <Route path="/archive" element={<Archive />} />
            <Route path="/search" element={<CandidateSearch />} /> {/* NEW ROUTE */}
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}