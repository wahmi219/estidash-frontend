import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiService } from '@/services/api';
import { logger } from '@/utils/logger';
import { UploadState, UploadResponse, ApiError } from '@/types';

const initialState: UploadState = {
    isUploading: false,
    progress: 0,
    error: null,
    lastUpload: null,
};

// Async thunk for file upload
export const uploadExcelFile = createAsyncThunk<
    UploadResponse,
    File,
    { rejectValue: ApiError }
>('upload/uploadExcelFile', async (file, { rejectWithValue }) => {
    try {
        logger.info('File upload started', { fileName: file.name, size: file.size }, 'Upload');
        const response = await apiService.uploadExcel(file);
        logger.info('File upload completed', response, 'Upload');
        return response;
    } catch (error: any) {
        logger.error('File upload failed', error, 'Upload');
        return rejectWithValue(error as ApiError);
    }
});

const uploadSlice = createSlice({
    name: 'upload',
    initialState,
    reducers: {
        setProgress: (state, action: PayloadAction<number>) => {
            state.progress = action.payload;
        },
        clearUploadError: (state) => {
            state.error = null;
        },
        resetUpload: (state) => {
            state.isUploading = false;
            state.progress = 0;
            state.error = null;
            state.lastUpload = null;
            logger.debug('Upload state reset', undefined, 'Upload');
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(uploadExcelFile.pending, (state) => {
                state.isUploading = true;
                state.progress = 0;
                state.error = null;
            })
            .addCase(uploadExcelFile.fulfilled, (state, action) => {
                state.isUploading = false;
                state.progress = 100;
                state.lastUpload = action.payload;
            })
            .addCase(uploadExcelFile.rejected, (state, action) => {
                state.isUploading = false;
                state.progress = 0;
                state.error = action.payload?.message || 'Upload failed';
            });
    },
});

export const { setProgress, clearUploadError, resetUpload } = uploadSlice.actions;
export default uploadSlice.reducer;
