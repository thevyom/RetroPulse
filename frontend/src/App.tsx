import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ErrorBoundary } from './shared/components/ErrorBoundary';
import { RetroBoardPage } from './features/board/components/RetroBoardPage';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/boards/:boardId" element={<RetroBoardPage />} />
          <Route path="*" element={<Navigate to="/boards/demo" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="bottom-right" richColors closeButton />
    </ErrorBoundary>
  );
}

export default App;
