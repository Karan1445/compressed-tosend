import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import questionsReducer from './slices/questionSlice';
import usersReducer from './slices/usersSlice';
import docxReducer from './slices/docxSlice';
import lawyerDocxReducer from './slices/lawyerDocxSlice';
import roleReducer from './slices/roleSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    questions: questionsReducer,
    users: usersReducer,
    docx: docxReducer,
    lawyerDocx: lawyerDocxReducer,
    roles: roleReducer,
  },
});
