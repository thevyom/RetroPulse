import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ErrorBoundary } from './shared/components/ErrorBoundary';
import { HomePage } from './features/home/components/HomePage';
import { RetroBoardPage } from './features/board/components/RetroBoardPage';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/boards/:boardId" element={<RetroBoardPage />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="bottom-right" richColors closeButton />
    </ErrorBoundary>
  );
}

export default App;
