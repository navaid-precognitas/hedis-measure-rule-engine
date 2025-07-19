# Backend Implementation Recommendation

## Technology Stack
- **Runtime:** Node.js with TypeScript
- **Framework:** Express.js or Fastify
- **Database:** PostgreSQL with Prisma ORM
- **File Storage:** AWS S3 or local filesystem
- **Cache:** Redis
- **Authentication:** JWT tokens

## File Handling Enhancements

### Large File Processing
```typescript
// Server-side streaming CSV processor
import { Transform } from 'stream';
import csv from 'csv-parser';

export class ServerCSVProcessor {
  async processLargeCSV(filePath: string) {
    return new Promise((resolve, reject) => {
      const results = [];
      const batchSize = 10000;
      let batch = [];
      
      fs.createReadStream(filePath)
        .pipe(csv())
        .pipe(new Transform({
          objectMode: true,
          transform(chunk, encoding, callback) {
            batch.push(chunk);
            if (batch.length >= batchSize) {
              // Process batch
              this.processBatch(batch);
              batch = [];
            }
            callback();
          }
        }))
        .on('end', () => resolve(results))
        .on('error', reject);
    });
  }
}
```

### API Endpoints
```typescript
// File upload with validation
app.post('/api/v1/files/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    
    // Validate file type and size
    if (!file || !file.originalname.endsWith('.csv')) {
      return res.status(400).json({ error: 'Invalid file type' });
    }
    
    if (file.size > 100 * 1024 * 1024) { // 100MB limit
      return res.status(400).json({ error: 'File too large' });
    }
    
    // Process file asynchronously
    const jobId = await queueFileProcessing(file.path);
    
    res.json({ jobId, status: 'processing' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// AI rule generation (secure)
app.post('/api/v1/ai/generate-rules', authenticateToken, async (req, res) => {
  try {
    const { prompt, columns, model } = req.body;
    
    // Use server-side AWS credentials
    const rules = await aiService.generateRules({
      prompt,
      columns,
      model,
      credentials: process.env.AWS_CREDENTIALS
    });
    
    res.json({ rules });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Database Schema
```sql
-- Workflows table
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  rules JSONB NOT NULL,
  reference_files JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  user_id UUID REFERENCES users(id)
);

-- File processing jobs
CREATE TABLE file_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  error_message TEXT,
  result JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Security Enhancements
- Environment-based AWS credentials
- Rate limiting for API endpoints
- Input validation and sanitization
- CORS configuration
- Request logging and monitoring
