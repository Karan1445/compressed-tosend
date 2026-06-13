import logo from './logo.svg';
import './App.css';

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LoginForm } from './pages/login';
import { SignupForm } from './pages/register';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/authContext';
import Layout from './pages/layout';
import HomePage from './pages/home';
import { QuestionPage } from './pages/question';
import './index.css'
function App() {
  return (<>
    <Toaster position="top-right" richColors />
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path='/login' element={<LoginForm />} />
          <Route path='/register' element={<SignupForm />} />
          <Route path='/' element={<Layout><HomePage/></Layout>} />
          <Route path="/question" element={<Layout><QuestionPage/></Layout>}/>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </>
  );
}

export default App;
