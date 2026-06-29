import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const API = 'http://localhost:8888/roles';

// Helper to get token
const getAuthHeaders = (getState) => {
  const token = getState().auth.token;
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
};

export const fetchRoles = createAsyncThunk(
  'roles/fetchRoles',
  async (_, { getState, rejectWithValue }) => {
    try {
      const res = await fetch(API, { headers: getAuthHeaders(getState) });
      const data = await res.json();
      if (!res.ok) return rejectWithValue(data.error || 'Failed to fetch roles');
      return data;
    } catch (err) {
      return rejectWithValue('Network error');
    }
  }
);

export const createRole = createAsyncThunk(
  'roles/createRole',
  async ({ name, permissions }, { getState, rejectWithValue }) => {
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: getAuthHeaders(getState),
        body: JSON.stringify({ name, permissions }),
      });
      const data = await res.json();
      if (!res.ok) return rejectWithValue(data.error || 'Failed to create role');
      return data;
    } catch (err) {
      return rejectWithValue('Network error');
    }
  }
);

export const assignRole = createAsyncThunk(
  'roles/assignRole',
  async ({ userId, roleName }, { getState, rejectWithValue }) => {
    try {
      const res = await fetch(`${API}/assign/${userId}`, {
        method: 'PUT',
        headers: getAuthHeaders(getState),
        body: JSON.stringify({ roleName }),
      });
      const data = await res.json();
      if (!res.ok) return rejectWithValue(data.error || 'Failed to assign role');
      return data;
    } catch (err) {
      return rejectWithValue('Network error');
    }
  }
);

export const editRole = createAsyncThunk(
  'roles/editRole',
  async ({ roleId, name, permissions }, { getState, rejectWithValue }) => {
    try {
      const res = await fetch(`${API}/${roleId}`, {
        method: 'PUT',
        headers: getAuthHeaders(getState),
        body: JSON.stringify({ name, permissions }),
      });
      const data = await res.json();
      if (!res.ok) return rejectWithValue(data.error || 'Failed to update role');
      return data;
    } catch (err) {
      return rejectWithValue('Network error');
    }
  }
);

export const deleteRole = createAsyncThunk(
  'roles/deleteRole',
  async (roleId, { getState, rejectWithValue }) => {
    try {
      const res = await fetch(`${API}/${roleId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(getState),
      });
      const data = await res.json();
      if (!res.ok) return rejectWithValue(data.error || 'Failed to delete role');
      return roleId; // return the deleted id so we can remove it from state
    } catch (err) {
      return rejectWithValue('Network error');
    }
  }
);

const roleSlice = createSlice({
  name: 'roles',
  initialState: {
    roles: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchRoles.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchRoles.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.roles = payload;
      })
      .addCase(fetchRoles.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      });

    builder
      .addCase(createRole.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(createRole.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.roles.push(payload);
      })
      .addCase(createRole.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      });
      
    builder
      .addCase(assignRole.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(assignRole.fulfilled, (state) => { state.loading = false; })
      .addCase(assignRole.rejected, (state, { payload }) => { state.loading = false; state.error = payload; });

    builder
      .addCase(editRole.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(editRole.fulfilled, (state, { payload }) => {
        state.loading = false;
        const idx = state.roles.findIndex(r => r._id === payload._id);
        if (idx !== -1) state.roles[idx] = payload;
      })
      .addCase(editRole.rejected, (state, { payload }) => { state.loading = false; state.error = payload; });

    builder
      .addCase(deleteRole.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(deleteRole.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.roles = state.roles.filter(r => r._id !== payload);
      })
      .addCase(deleteRole.rejected, (state, { payload }) => { state.loading = false; state.error = payload; });
  },
});

export default roleSlice.reducer;
