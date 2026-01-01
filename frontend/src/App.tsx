import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { RetroBoardPage } from './features/board/components/RetroBoardPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/boards/:boardId" element={<RetroBoardPage />} />
        <Route path="*" element={<Navigate to="/boards/demo" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
