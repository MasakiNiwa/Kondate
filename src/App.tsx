import { lazy, Suspense } from 'react';
import { Toaster } from 'sonner';
import { Route, Router, Switch } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { AppLayout } from '@/app/AppLayout';
import { useTheme } from '@/app/useTheme';
import HomePage from '@/pages/HomePage';
import { useSettings } from '@/features/settings/settingsStore';

// ホーム以外のページは必要になってから読み込む
const CalendarPage = lazy(() => import('@/pages/CalendarPage'));
const ShoppingPage = lazy(() => import('@/pages/ShoppingPage'));
const DishesPage = lazy(() => import('@/pages/DishesPage'));
const AnalysisPage = lazy(() => import('@/pages/AnalysisPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const HelpPage = lazy(() => import('@/pages/HelpPage'));
const ChatPage = lazy(() => import('@/pages/ChatPage'));

export default function App() {
  useTheme();
  const theme = useSettings((s) => s.theme);
  return (
    // GitHub Pages ではサーバー側のルーティングができないためハッシュルーティングを使う
    <Router hook={useHashLocation}>
      <AppLayout>
        <Suspense fallback={null}>
          <Switch>
            <Route path="/calendar" component={CalendarPage} />
            <Route path="/shopping" component={ShoppingPage} />
            <Route path="/dishes/:tab?" component={DishesPage} />
            <Route path="/analysis" component={AnalysisPage} />
            <Route path="/settings" component={SettingsPage} />
            <Route path="/help" component={HelpPage} />
            <Route path="/chat" component={ChatPage} />
            <Route component={HomePage} />
          </Switch>
        </Suspense>
      </AppLayout>
      <Toaster
        theme={theme}
        position="top-center"
        richColors
        closeButton
        duration={3000}
        toastOptions={{ className: 'text-sm' }}
      />
    </Router>
  );
}
