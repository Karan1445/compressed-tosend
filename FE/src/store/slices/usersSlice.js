import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const API = 'http://localhost:8888';

export const fetchUsers = createAsyncThunk(
  'users/fetchAll',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      const res = await fetch(`${API}/`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) return rejectWithValue('Failed to load users');
      return data;
    } catch {
      return rejectWithValue('Network error — could not load users.');
    }
  }
);

const usersSlice = createSlice({
  name: 'users',
  initialState: { users: [], loading: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchUsers.fulfilled, (state, { payload }) => { state.loading = false; state.users = payload; })
      .addCase(fetchUsers.rejected, (state, { payload }) => { state.loading = false; state.error = payload; });
  },
});

export default usersSlice.reducer;
