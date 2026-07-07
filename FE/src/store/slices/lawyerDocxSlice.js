import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const uploadDocx = createAsyncThunk(
  'lawyerDocx/upload',
  async ({ file, name }, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const formData = new FormData();
      formData.append('document', file);
      formData.append('name', name);

      const response = await fetch('http://localhost:8888/api/lawyer/docx/upload', {
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
      const response = await fetch('http://localhost:8888/api/lawyer/docx/list', {
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
  async ({ docxId, placeholderMappings, clauseConfigs, repeatingConfigs }, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const response = await fetch(`http://localhost:8888/api/lawyer/docx/${docxId}/mappings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ placeholderMappings, clauseConfigs, repeatingConfigs }),
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
      const response = await fetch(`http://localhost:8888/api/lawyer/docx/${docxId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete document');
      }

      return docxId;
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
      const response = await fetch(`http://localhost:8888/api/lawyer/docx/${docxId}/assign`, {
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

export const fetchAssignedDocx = createAsyncThunk(
  'docx/fetchAssigned',
  async (_, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const response = await fetch('http://localhost:8888/api/lawyer/docx/assigned', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch assigned documents');
      }

      return await response.json();
    } catch (error) {
      return rejectWithValue(error.message || 'An error occurred fetching assigned documents');
    }
  }
);

export const submitDocx = createAsyncThunk(
  'docx/submit',
  async ({ docxId, answers }, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const response = await fetch(`http://localhost:8888/api/lawyer/docx/${docxId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ answers }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.msg || 'Failed to submit document');
      }

      return docxId;
    } catch (error) {
      return rejectWithValue(error.message || 'An error occurred submitting document');
    }
  }
);

export const fetchSubmissions = createAsyncThunk(
  'docx/fetchSubmissions',
  async (docxId, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const response = await fetch(`http://localhost:8888/api/lawyer/docx/${docxId}/submissions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch submissions');
      }

      return await response.json();
    } catch (error) {
      return rejectWithValue(error.message || 'An error occurred fetching submissions');
    }
  }
);

const initialState = {
  documents: [],
  assignedDocuments: [],
  loading: false,
  uploading: false,
  savingMappings: false,
  submitting: false,
  submissions: [],
  loadingSubmissions: false,
  error: null,
};

const lawyerDocxSlice = createSlice({
  name: 'lawyerDocx',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
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
      .addCase(fetchAssignedDocx.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAssignedDocx.fulfilled, (state, action) => {
        state.loading = false;
        state.assignedDocuments = action.payload;
      })
      .addCase(fetchAssignedDocx.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(submitDocx.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(submitDocx.fulfilled, (state, action) => {
        state.submitting = false;
        state.assignedDocuments = state.assignedDocuments.filter(doc => doc._id !== action.payload);
      })
      .addCase(submitDocx.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      })
      .addCase(uploadDocx.pending, (state) => {
        state.uploading = true;
        state.error = null;
      })
      .addCase(uploadDocx.fulfilled, (state, action) => {
        state.uploading = false;
        state.documents.unshift(action.payload);
      })
      .addCase(uploadDocx.rejected, (state, action) => {
        state.uploading = false;
        state.error = action.payload;
      })
      .addCase(saveDocxMappings.pending, (state) => {
        state.savingMappings = true;
      })
      .addCase(saveDocxMappings.fulfilled, (state, action) => {
        state.savingMappings = false;
        const index = state.documents.findIndex(d => d._id === action.payload._id);
        if (index !== -1) {
          state.documents[index] = action.payload;
        }
      })
      .addCase(saveDocxMappings.rejected, (state, action) => {
        state.savingMappings = false;
        state.error = action.payload;
      })
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
      .addCase(assignDocx.fulfilled, (state, action) => {
        const index = state.documents.findIndex(d => d._id === action.payload._id);
        if (index !== -1) {
          state.documents[index] = action.payload;
        }
      })
      .addCase(fetchSubmissions.pending, (state) => {
        state.loadingSubmissions = true;
        state.error = null;
      })
      .addCase(fetchSubmissions.fulfilled, (state, action) => {
        state.loadingSubmissions = false;
        state.submissions = action.payload;
      })
      .addCase(fetchSubmissions.rejected, (state, action) => {
        state.loadingSubmissions = false;
        state.error = action.payload;
      });
  },
});

export default lawyerDocxSlice.reducer;