import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import paystackRouter from './routes/paystack';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Mount Paystack API Routes
app.use('/api/billing', paystackRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`OmniStudio Server running on port ${PORT}`));