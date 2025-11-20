import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import opportunitiesRouter from './api/opportunities';
import { checkIfDataExists, populateInitialData } from './jobs/initialPopulation';
import { startDailyCronJob } from './jobs/dailyCollection';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());

app.use('/api', opportunitiesRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

const startServer = async () => {
  try {
    console.log('Starting DI1 Curve Analyzer Backend...\n');

    app.listen(PORT, () => {
      console.log(`✓ Backend server running on port ${PORT}`);
      console.log(`✓ API available at http://localhost:${PORT}/api`);
      console.log(`✓ Health check: http://localhost:${PORT}/health\n`);
    });

    const dataExists = await checkIfDataExists();
    
    if (!dataExists) {
      console.log('No data found in database. Starting initial population in background...\n');
      populateInitialData(100).then(() => {
        console.log('\nInitial population completed.\n');
      }).catch(err => {
        console.error('Error during initial population:', err);
      });
    } else {
      console.log('Data already exists in database. Skipping initial population.\n');
    }

    startDailyCronJob();

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
