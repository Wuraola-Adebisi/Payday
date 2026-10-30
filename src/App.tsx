import { lazy, Suspense } from 'react';

const Planner = lazy(() => import('./Planner'));
const PublicSite = lazy(() => import('./PublicSite'));

export default function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const isPlanner = path === '/app' || path.startsWith('/app/');
  return (
    <Suspense fallback={<div className="route-loading" role="status">Loading…</div>}>
      {isPlanner ? <Planner /> : <PublicSite />}
    </Suspense>
  );
}
