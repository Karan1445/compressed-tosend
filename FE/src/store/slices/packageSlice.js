import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const fetchPackages = createAsyncThunk(
  'package/fetchPackages',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { auth: { token } } = getState();
      const response = await fetch('http://localhost:8888/api/lawyer/packages', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch packages');
      return await response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createPackage = createAsyncThunk(
  'package/createPackage',
  async (packageData, { getState, rejectWithValue }) => {
    try {
      const { auth: { token } } = getState();
      const response = await fetch('http://localhost:8888/api/lawyer/packages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(packageData)
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to create package');
      }
      return await response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updatePackage = createAsyncThunk(
  'package/updatePackage',
  async ({ id, data }, { getState, rejectWithValue }) => {
    try {
      const { auth: { token } } = getState();
      const response = await fetch(`http://localhost:8888/api/lawyer/packages/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to update package');
      }
      return await response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deletePackage = createAsyncThunk(
  'package/deletePackage',
  async (id, { getState, rejectWithValue }) => {
    try {
      const { auth: { token } } = getState();
      const response = await fetch(`http://localhost:8888/api/lawyer/packages/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to delete package');
      return id;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const packageSlice = createSlice({
  name: 'package',
  initialState: {
    packages: [],
    loading: false,
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPackages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPackages.fulfilled, (state, action) => {
        state.loading = false;
        state.packages = action.payload;
      })
      .addCase(fetchPackages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createPackage.fulfilled, (state, action) => {
        state.packages.push(action.payload);
      })
      .addCase(updatePackage.fulfilled, (state, action) => {
        const index = state.packages.findIndex(p => p._id === action.payload._id);
        if (index !== -1) {
          state.packages[index] = action.payload;
        }
      })
      .addCase(deletePackage.fulfilled, (state, action) => {
        state.packages = state.packages.filter(p => p._id !== action.payload);
      });
  }
});

export default packageSlice.reducer;
