import { Routes, Route, Navigate } from 'react-router-dom';
import Shell from './components/Shell.jsx';
import RequireAuth, { GuestOnly } from './components/RequireAuth.jsx';
import Landing from './screens/Landing.jsx';
import Login from './screens/Login.jsx';
import Register from './screens/Register.jsx';
import Overview from './screens/Overview.jsx';
import Progress from './screens/Progress.jsx';
import Result from './screens/Result.jsx';
import ModuleScreen from './screens/ModuleScreen.jsx';
import ModuleQuiz from './screens/ModuleQuiz.jsx';
import ModuleLanding from './screens/ModuleLanding.jsx';
import PathOverview from './screens/PathOverview.jsx';
import Assessment from './screens/Assessment.jsx';
import Puzzle from './screens/Puzzle.jsx';

export default function App() {
  return (
    <Routes>
      {/* Guest-only: a signed-in user is sent on to /overview. */}
      <Route element={<GuestOnly />}>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>
      <Route element={<RequireAuth />}>
        {/* The assessment screen replaces the whole shell with a focused header. */}
        <Route path="/assessment" element={<Assessment />} />
        <Route element={<Shell />}>
          <Route path="/overview" element={<Overview />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/result" element={<Result />} />
          <Route path="/modules" element={<ModuleLanding />} />
          <Route path="/paths/:level" element={<PathOverview />} />
          <Route path="/modules/:id" element={<ModuleScreen />} />
          <Route path="/modules/:id/quiz" element={<ModuleQuiz />} />
          <Route path="/puzzle" element={<Puzzle />} />
          <Route path="*" element={<Navigate to="/overview" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
