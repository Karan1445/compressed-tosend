import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Async Thunks
export const uploadDocx = createAsyncThunk(
  'docx/upload',
  async (file, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const formData = new FormData();
      formData.append('document', file);

      const response = await fetch('http://localhost:8888/docx/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.msg || 'Failed to upload document');
      }

      const data = await response.json();
      return data.doc;
    } catch (error) {
      return rejectWithValue(error.message || 'An error occurred during upload');
    }
  }
);

export const fetchUploadedDocx = createAsyncThunk(
  'docx/fetchList',
  async (_, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const response = await fetch('http://localhost:8888/docx/list', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch document history');
      }

      return await response.json();
    } catch (error) {
      return rejectWithValue(error.message || 'An error occurred fetching history');
    }
  }
);

export const saveDocxMappings = createAsyncThunk(
  'docx/saveMappings',
  async ({ docxId, mappings, draggedFields }, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const response = await fetch(`http://localhost:8888/docx/${docxId}/mappings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ mappings, draggedFields }),
      });

      if (!response.ok) {
        throw new Error('Failed to save mappings');
      }

      return await response.json();
    } catch (error) {
      return rejectWithValue(error.message || 'An error occurred saving mappings');
    }
  }
);

export const deleteDocx = createAsyncThunk(
  'docx/delete',
  async (docxId, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const response = await fetch(`http://localhost:8888/docx/${docxId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete document');
      }

      return docxId; // Return the ID so we can remove it from state
    } catch (error) {
      return rejectWithValue(error.message || 'An error occurred deleting document');
    }
  }
);

export const assignDocx = createAsyncThunk(
  'docx/assign',
  async ({ docxId, assigneeIds }, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const response = await fetch(`http://localhost:8888/docx/${docxId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ assigneeIds }),
      });

      if (!response.ok) {
        throw new Error('Failed to assign document');
      }

      return await response.json();
    } catch (error) {
      return rejectWithValue(error.message || 'An error occurred assigning document');
    }
  }
);

const initialState = {
  documents: [],
  loading: false,
  uploading: false,
  savingMappings: false,
  error: null,
};

const docxSlice = createSlice({
  name: 'docx',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch List
      .addCase(fetchUploadedDocx.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUploadedDocx.fulfilled, (state, action) => {
        state.loading = false;
        state.documents = action.payload;
      })
      .addCase(fetchUploadedDocx.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Upload Docx
      .addCase(uploadDocx.pending, (state) => {
        state.uploading = true;
        state.error = null;
      })
      .addCase(uploadDocx.fulfilled, (state, action) => {
        state.uploading = false;
        state.documents.unshift(action.payload); // Add new doc to the beginning
      })
      .addCase(uploadDocx.rejected, (state, action) => {
        state.uploading = false;
        state.error = action.payload;
      })
      // Save Mappings
      .addCase(saveDocxMappings.pending, (state) => {
        state.savingMappings = true;
      })
      .addCase(saveDocxMappings.fulfilled, (state, action) => {
        state.savingMappings = false;
        // Update the document in the list with the new mappings
        const index = state.documents.findIndex(d => d._id === action.payload._id);
        if (index !== -1) {
          state.documents[index] = action.payload;
        }
      })
      .addCase(saveDocxMappings.rejected, (state, action) => {
        state.savingMappings = false;
        state.error = action.payload;
      })
      // Delete Docx
      .addCase(deleteDocx.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteDocx.fulfilled, (state, action) => {
        state.loading = false;
        state.documents = state.documents.filter(doc => doc._id !== action.payload);
      })
      .addCase(deleteDocx.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Assign Docx
      .addCase(assignDocx.fulfilled, (state, action) => {
        const index = state.documents.findIndex(d => d._id === action.payload._id);
        if (index !== -1) {
          state.documents[index] = action.payload;
        }
      });
  },
});

export default docxSlice.reducer;
