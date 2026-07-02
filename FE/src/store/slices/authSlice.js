import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const API = 'http://localhost:8888';

const persist = (token, user) => {
  localStorage.setItem('auth_token', token);
  localStorage.setItem('auth_user', JSON.stringify(user));
};
const clearPersist = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
};
const loadPersisted = () => {
  try {
    const token = localStorage.getItem('auth_token');
    const raw = localStorage.getItem('auth_user');
    return { token: token || null, user: raw ? JSON.parse(raw) : null };
  } catch {
    return { token: null, user: null };
  }
};

export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const res = await fetch(`${API}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return rejectWithValue(data.error || (data.errors ? data.errors.join(', ') : 'Login failed'));
      return data;
    } catch {
      return rejectWithValue('Network error — check your connection.');
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async ({ name, email, password, role }, { rejectWithValue }) => {
    try {
      const res = await fetch(`${API}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json();
      if (!res.ok) return rejectWithValue(data.error || (data.errors ? data.errors.join(', ') : 'Registration failed'));
      return data;
    } catch {
      return rejectWithValue('Network error — check your connection.');
    }
  }
);

export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async (email, { rejectWithValue }) => {
    try {
      const res = await fetch(`${API}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) return rejectWithValue(data.error || 'Failed to send temporary password');
      return data;
    } catch {
      return rejectWithValue('Network error — check your connection.');
    }
  }
);

export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async ({ email, oldPassword, newPassword }, { rejectWithValue }) => {
    try {
      const res = await fetch(`${API}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, oldPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) return rejectWithValue(data.error || data.message || 'Failed to reset password');
      return data;
    } catch {
      return rejectWithValue('Network error — check your connection.');
    }
  }
);

export const resetPasswordWithToken = createAsyncThunk(
  'auth/resetPasswordWithToken',
  async ({ token, newPassword }, { rejectWithValue }) => {
    try {
      const res = await fetch(`${API}/reset-password/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok) return rejectWithValue(data.error || data.message || 'Failed to reset password');
      return data;
    } catch {
      return rejectWithValue('Network error — check your connection.');
    }
  }
);

export const refreshMe = createAsyncThunk(
  'auth/refreshMe',
  async (_, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      if (!token) return rejectWithValue('No token');
      const res = await fetch(`${API}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) return rejectWithValue(data.error || 'Failed to refresh session');
      return data;
    } catch {
      return rejectWithValue('Network error');
    }
  }
);

const { token: initToken, user: initUser } = loadPersisted();

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    token: initToken,
    user: initUser,
    loading: false,
    error: null,
  },
  reducers: {
    logout(state) {
      state.token = null;
      state.user = null;
      state.error = null;
      clearPersist();
    },
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(loginUser.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.token = payload.token;
        state.user = payload.user;
        persist(payload.token, payload.user);
      })
      .addCase(loginUser.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      });

    builder
      .addCase(registerUser.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(registerUser.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.token = payload.token;
        state.user = payload.user;
        persist(payload.token, payload.user);
      })
      .addCase(registerUser.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      });

    builder
      .addCase(forgotPassword.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(forgotPassword.fulfilled, (state) => { state.loading = false; })
      .addCase(forgotPassword.rejected, (state, { payload }) => { state.loading = false; state.error = payload; });

    builder
      .addCase(resetPassword.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(resetPassword.fulfilled, (state) => { state.loading = false; })
      .addCase(resetPassword.rejected, (state, { payload }) => { state.loading = false; state.error = payload; });

    builder
      .addCase(refreshMe.fulfilled, (state, { payload }) => {
        state.user = payload.user;
        persist(state.token, payload.user);
      });
  },
});

export const { logout, clearAuthError } = authSlice.actions;
export default authSlice.reducer;
