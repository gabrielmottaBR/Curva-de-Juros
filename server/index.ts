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

    app.listen(Number(PORT), '0.0.0.0', () => {
      const publicUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN.replace('00-1', '00-3000')}`
        : `http://localhost:${PORT}`;
      
      console.log(`✓ Backend server running on port ${PORT}`);
      console.log(`✓ Public URL: ${publicUrl}`);
      console.log(`✓ API available at ${publicUrl}/api`);
      console.log(`✓ Health check: ${publicUrl}/health\n`);
    });

    const dataExists = await checkIfDataExists();
    
    if (!dataExists) {
      console.log('No data found in database.');
      console.log('IMPORTANT: Make sure you have executed the SQL schema in Supabase first!');
      console.log('See SETUP_INSTRUCTIONS.md for details.\n');
      
      console.log('Seeding database with simulated data for immediate functionality...\n');
      
      const { seedDatabaseWithSimulatedData } = await import('./jobs/seedDatabase');
      seedDatabaseWithSimulatedData(100).then(() => {
        console.log('✓ Database ready with simulated data\n');
        console.log('Note: Real B3 data collection will run daily at 21:00 Brasília time.\n');
      }).catch(err => {
        console.error('Error seeding database:', err);
        console.log('\nPlease check that you have:');
        console.log('1. Created the tables in Supabase (run schema.sql)');
        console.log('2. Set SUPABASE_URL and SUPABASE_SERVICE_KEY correctly\n');
      });
    } else {
      console.log('Data already exists in database.\n');
    }

    startDailyCronJob();

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
