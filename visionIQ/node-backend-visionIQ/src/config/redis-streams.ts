import Redis from 'ioredis';

// =============================================================================
// Stream Topic Constants
// =============================================================================

export const STREAM_TOPICS = {
  VIDEO_UPLOADED: 'video.uploaded',
  FRAMES_EXTRACTED: 'frames.extracted',
  FRAMES_MOTION: 'frames.motion',
  FRAME_DESCRIBED: 'frame.described',
  SESSION_EVALUATE: 'session.evaluate',
  SESSION_RULES_READY: 'session.rules_ready',
  EVENT_CREATED: 'event.created',
  EVENT_WRITTEN: 'event.written',
} as const;

export type StreamTopic = (typeof STREAM_TOPICS)[keyof typeof STREAM_TOPICS];

// =============================================================================
// Redis Streams Client
// =============================================================================

let streamsClient: Redis | null = null;

export function getStreamsClient(): Redis {
  if (!streamsClient) {
    streamsClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null, // Required for blocking reads
      retryStrategy: (times) => {
        if (times > 5) return null;
        return Math.min(times * 500, 3000);
      },
    });
  }
  return streamsClient;
}

// =============================================================================
// Publish
// =============================================================================

/**
 * Publish an event to a Redis Stream via XADD.
 * Returns the message ID assigned by Redis.
 */
export async function publishEvent(
  stream: string,
  data: Record<string, string | number | boolean>,
): Promise<string> {
  const client = getStreamsClient();
  const fields: string[] = [];
  for (const [key, value] of Object.entries(data)) {
    fields.push(key, String(value));
  }
  const messageId = await client.xadd(stream, '*', ...fields);
  return messageId;
}

// =============================================================================
// Consumer Groups
// =============================================================================

/**
 * Create a consumer group for a stream.
 * Uses MKSTREAM so the stream is created automatically if it doesn't exist.
 * Silently succeeds if the group already exists (BUSYGROUP).
 */
export async function createConsumerGroup(
  stream: string,
  group: string,
  startId: string = '0',
): Promise<void> {
  const client = getStreamsClient();
  try {
    await client.xgroup('CREATE', stream, group, startId, 'MKSTREAM');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes('BUSYGROUP')) {
      throw err;
    }
  }
}

// =============================================================================
// Consume
// =============================================================================

export interface StreamMessage {
  id: string;
  data: Record<string, string>;
}

type MessageHandler = (message: StreamMessage) => Promise<void>;

/**
 * Blocking consumer loop using XREADGROUP.
 * Reads messages from a consumer group, invokes handler, then ACKs.
 *
 * @param stream   - Stream name (use STREAM_TOPICS constants)
 * @param group    - Consumer group name
 * @param consumer - Consumer name within the group
 * @param handler  - Async callback invoked per message
 * @param options  - count: max messages per read (default 10), blockMs: block timeout (default 5000)
 */
export async function consumeEvents(
  stream: string,
  group: string,
  consumer: string,
  handler: MessageHandler,
  options: { count?: number; blockMs?: number } = {},
): Promise<void> {
  const { count = 10, blockMs = 5000 } = options;
  const client = getStreamsClient();

  await createConsumerGroup(stream, group);

  // Process any pending messages first (id = "0"), then switch to new (">" )
  let startId = '0';

  while (true) {
    const results = await client.xreadgroup(
      'GROUP', group, consumer,
      'COUNT', count,
      'BLOCK', blockMs,
      'STREAMS', stream,
      startId,
    );

    if (!results || results.length === 0) {
      if (startId === '0') {
        // No more pending — switch to reading new messages
        startId = '>';
      }
      continue;
    }

    for (const [, messages] of results) {
      for (const [msgId, fields] of messages) {
        const data: Record<string, string> = {};
        for (let i = 0; i < fields.length; i += 2) {
          data[fields[i]] = fields[i + 1];
        }

        try {
          await handler({ id: msgId, data });
          await client.xack(stream, group, msgId);
        } catch (err) {
          // Message stays pending — will be retried on next loop
          console.error(`[redis-streams] Error processing ${msgId} on ${stream}:`, err);
        }
      }
    }

    if (startId === '0') {
      startId = '>';
    }
  }
}

// =============================================================================
// Cleanup
// =============================================================================

export async function disconnectStreams(): Promise<void> {
  if (streamsClient) {
    await streamsClient.quit();
    streamsClient = null;
  }
}
