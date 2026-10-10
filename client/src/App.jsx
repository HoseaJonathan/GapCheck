import { Routes, Route, Navigate } from 'react-router-dom';
import Shell from './components/Shell.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import Login from './screens/Login.jsx';
import Overview from './screens/Overview.jsx';
import Progress from './screens/Progress.jsx';
import Result from './screens/Result.jsx';
import ModuleScreen from './screens/ModuleScreen.jsx';
import Assessment from './screens/Assessment.jsx';
import Puzzle from './screens/Puzzle.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth />}>
        {/* The assessment screen replaces the whole shell with a focused header. */}
        <Route path="/assessment" element={<Assessment />} />
        <Route element={<Shell />}>
          <Route path="/" element={<Overview />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/result" element={<Result />} />
          <Route path="/modules" element={<ModuleScreen />} />
          <Route path="/modules/:id" element={<ModuleScreen />} />
          <Route path="/puzzle" element={<Puzzle />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
