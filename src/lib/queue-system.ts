import { Queue, Worker, QueueEvents } from 'bullmq';
import Redis from 'redis';

// Queue connection
const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
};

// Define job types
export interface AnalysisJob {
  userId: string;
  imageBase64: string;
  timestamp: string;
}

export interface PlanGenerationJob {
  userId: string;
  profile: any;
  timestamp: string;
}

export interface CoachingJob {
  userId: string;
  message: string;
  context: any;
  timestamp: string;
}

// Create queues
export const analysisQueue = new Queue<AnalysisJob>('image-analysis', {
  connection: redisConnection as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 3600, // Keep completed jobs for 1 hour
    },
  },
});

export const planQueue = new Queue<PlanGenerationJob>('plan-generation', {
  connection: redisConnection as any,
  defaultJobOptions: {
    attempts: 2,
    removeOnComplete: {
      age: 3600,
    },
  },
});

export const coachQueue = new Queue<CoachingJob>('coaching', {
  connection: redisConnection as any,
  defaultJobOptions: {
    attempts: 2,
    removeOnComplete: {
      age: 1800,
    },
  },
});

// Queue events monitoring
export function setupQueueMonitoring() {
  const analysisEvents = new QueueEvents('image-analysis', {
    connection: redisConnection as any,
  });
  const planEvents = new QueueEvents('plan-generation', {
    connection: redisConnection as any,
  });

  analysisEvents.on('completed', ({ jobId }) => {
    console.log(`✅ Analysis job ${jobId} completed`);
  });
  analysisEvents.on('failed', ({ jobId, failedReason }) => {
    console.error(`❌ Analysis job ${jobId} failed: ${failedReason}`);
  });

  planEvents.on('completed', ({ jobId }) => {
    console.log(`✅ Plan generation job ${jobId} completed`);
  });
  planEvents.on('failed', ({ jobId, failedReason }) => {
    console.error(`❌ Plan generation job ${jobId} failed: ${failedReason}`);
  });
}

// Job submission helpers
export async function addAnalysisJob(data: AnalysisJob) {
  try {
    const job = await analysisQueue.add(data, {
      priority: 10,
      jobId: `analysis-${data.userId}-${Date.now()}`,
    });
    console.log(`📤 Analysis job queued: ${job.id}`);
    return job;
  } catch (error) {
    console.error('❌ Failed to queue analysis job:', error);
    throw error;
  }
}

export async function addPlanJob(data: PlanGenerationJob) {
  try {
    const job = await planQueue.add(data, {
      priority: 5,
      jobId: `plan-${data.userId}-${Date.now()}`,
    });
    console.log(`📤 Plan generation job queued: ${job.id}`);
    return job;
  } catch (error) {
    console.error('❌ Failed to queue plan job:', error);
    throw error;
  }
}

export async function addCoachingJob(data: CoachingJob) {
  try {
    const job = await coachQueue.add(data, {
      priority: 1,
      jobId: `coach-${data.userId}-${Date.now()}`,
    });
    console.log(`📤 Coaching job queued: ${job.id}`);
    return job;
  } catch (error) {
    console.error('❌ Failed to queue coaching job:', error);
    throw error;
  }
}

// Get job status
export async function getJobStatus(queueName: string, jobId: string) {
  const queue = queueName === 'analysis' ? analysisQueue : planQueue;
  const job = await queue.getJob(jobId);
  if (!job) return null;
  
  return {
    id: job.id,
    progress: job.progress(),
    state: await job.getState(),
    attempts: job.attemptsMade,
    failedReason: job.failedReason,
    data: job.data,
  };
}

export async function closeQueues() {
  await analysisQueue.close();
  await planQueue.close();
  await coachQueue.close();
  console.log('✅ All queues closed');
}
