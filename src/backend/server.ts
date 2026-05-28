import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import simplexRouter from './routes/simplex.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());
app.use('/api/simplex', simplexRouter);

app.get('/', (_req, res) => {
  res.send('Simplex API is running');
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

export default app; // for tests
