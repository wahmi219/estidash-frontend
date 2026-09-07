import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiService } from '@/services/api';
import { logger } from '@/utils/logger';
import { ExamplesState, ExampleQuestion, ApiError } from '@/types';

const initialState: ExamplesState = {
    examples: [],
    isLoading: false,
    error: null,
    selectedCategory: null,
};

// Async thunk for fetching examples
export const fetchExamples = createAsyncThunk<
    ExampleQuestion[],
    void,
    { rejectValue: ApiError }
>('examples/fetchExamples', async (_, { rejectWithValue }) => {
    try {
        logger.info('Fetching example questions', undefined, 'Examples');
        const response = await apiService.getExamples();
        logger.info('Examples fetched successfully', { count: response.examples.length }, 'Examples');
        return response.examples;
    } catch (error: any) {
        logger.error('Failed to fetch examples', error, 'Examples');
        return rejectWithValue(error as ApiError);
    }
});

const examplesSlice = createSlice({
    name: 'examples',
    initialState,
    reducers: {
        setSelectedCategory: (state, action: PayloadAction<string | null>) => {
            state.selectedCategory = action.payload;
            logger.debug('Category selected', { category: action.payload }, 'Examples');
        },
        clearExamplesError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchExamples.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchExamples.fulfilled, (state, action) => {
                state.isLoading = false;
                state.examples = action.payload;
            })
            .addCase(fetchExamples.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload?.message || 'Failed to fetch examples';
            });
    },
});

export const { setSelectedCategory, clearExamplesError } = examplesSlice.actions;
export default examplesSlice.reducer;
