import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const API = 'http://localhost:8888';
const authHeaders = (token) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` });

export const fetchQuestions = createAsyncThunk(
  'questions/fetchAll',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      const res = await fetch(`${API}/question`, { headers: authHeaders(token) });
      const data = await res.json();
      if (!res.ok) return rejectWithValue(data.message || 'Failed to load questions');
      return data;
    } catch {
      return rejectWithValue('Network error — could not load questions.');
    }
  }
);

export const fetchQuestionsAll = createAsyncThunk(
  'questions/fetchAll',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      const res = await fetch(`${API}/question/all`, { headers: authHeaders(token) });
      const data = await res.json();
      if (!res.ok) return rejectWithValue(data.message || 'Failed to load questions');
      return data;
    } catch {
      return rejectWithValue('Network error — could not load questions.');
    }
  }
);

export const addQuestion = createAsyncThunk(
  'questions/add',
  async (payload, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      const res = await fetch(`${API}/question`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) return rejectWithValue(data.message || 'Failed to create question');
      return data;
    } catch {
      return rejectWithValue('Network error — could not create question.');
    }
  }
);

export const updateQuestion = createAsyncThunk(
  'questions/update',
  async ({ id, payload }, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      const res = await fetch(`${API}/question/${id}`, {
        method: 'PUT',
        headers: authHeaders(token),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) return rejectWithValue(data.message || 'Failed to update question');
      return data;
    } catch {
      return rejectWithValue('Network error — could not update question.');
    }
  }
);

export const deleteQuestion = createAsyncThunk(
  'questions/delete',
  async (id, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      const res = await fetch(`${API}/question/${id}`, {
        method: 'DELETE',
        headers: authHeaders(token),
      });
      if (!res.ok) {
        const data = await res.json();
        return rejectWithValue(data.message || 'Failed to delete question');
      }
      return id;
    } catch {
      return rejectWithValue('Network error — could not delete question.');
    }
  }
);

export const bulkDeleteQuestions = createAsyncThunk(
  'questions/bulkDelete',
  async (ids, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      const res = await fetch(`${API}/question/bulk/delete`, {
        method: 'DELETE',
        headers: authHeaders(token),
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        const data = await res.json();
        return rejectWithValue(data.message || 'Bulk deletion failed');
      }
      return ids;
    } catch {
      return rejectWithValue('Network error — could not bulk delete.');
    }
  }
);

const questionSlice = createSlice({
  name: 'questions',
  initialState: {
    questions: [],
    loading: false,
    actionLoading: false,
    error: null,
  },
  reducers: {
    clearQuestionError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchQuestions.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchQuestions.fulfilled, (state, { payload }) => { state.loading = false; state.questions = payload; })
      .addCase(fetchQuestions.rejected, (state, { payload }) => { state.loading = false; state.error = payload; });

    builder
      .addCase(addQuestion.pending, (state) => { state.actionLoading = true; })
      .addCase(addQuestion.fulfilled, (state, { payload }) => {
        state.actionLoading = false;
        state.questions.push(payload);
      })
      .addCase(addQuestion.rejected, (state) => { state.actionLoading = false; });

    builder
      .addCase(updateQuestion.pending, (state) => { state.actionLoading = true; })
      .addCase(updateQuestion.fulfilled, (state, { payload }) => {
        state.actionLoading = false;
        const idx = state.questions.findIndex((q) => q._id === payload._id);
        if (idx !== -1) state.questions[idx] = payload;
      })
      .addCase(updateQuestion.rejected, (state) => { state.actionLoading = false; });

    builder
      .addCase(deleteQuestion.pending, (state) => { state.actionLoading = true; })
      .addCase(deleteQuestion.fulfilled, (state, { payload: id }) => {
        state.actionLoading = false;
        state.questions = state.questions.filter((q) => q._id !== id);
      })
      .addCase(deleteQuestion.rejected, (state) => { state.actionLoading = false; });

    builder
      .addCase(bulkDeleteQuestions.pending, (state) => { state.actionLoading = true; })
      .addCase(bulkDeleteQuestions.fulfilled, (state, { payload: ids }) => {
        state.actionLoading = false;
        state.questions = state.questions.filter((q) => !ids.includes(q._id));
      })
      .addCase(bulkDeleteQuestions.rejected, (state) => { state.actionLoading = false; });
  },
});

export const { clearQuestionError } = questionSlice.actions;
export default questionSlice.reducer;
