/**
 * CDN Configuration for Cloudflare
 * Handles image/video delivery through CDN
 * Reduces server load and improves response times
 */

export interface CDNConfig {
  zoneId: string;
  accountId: string;
  apiToken: string;
  domain: string;
  cname: string;
}

export class CloudflareCDN {
  private config: CDNConfig;
  private baseUrl: string;

  constructor(config: CDNConfig) {
    this.config = config;
    this.baseUrl = `https://api.cloudflare.com/client/v4`;
  }

  /**
   * Upload image to Cloudflare Images (Batch upload not available in free tier)
   * For production, use R2 (S3-compatible) storage
   */
  async uploadImage(imageData: Buffer, filename: string): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('file', new Blob([imageData]), filename);
      formData.append('requireSignedURLs', 'true');

      const response = await fetch(
        `${this.baseUrl}/accounts/${this.config.accountId}/images/v1`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.config.apiToken}`,
          },
          body: formData,
        }
      );

      const result = await response.json() as any;
      if (result.success) {
        console.log(`✅ Image uploaded to Cloudflare: ${result.result.id}`);
        return result.result.variants[0];
      }
      throw new Error(result.errors?.[0]?.message || 'Upload failed');
    } catch (error) {
      console.error('❌ Cloudflare upload error:', error);
      throw error;
    }
  }

  /**
   * Generate image transformation URL
   * Example: fit, quality, format optimization
   */
  getOptimizedImageUrl(imageId: string, options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'avif' | 'jpeg';
    fit?: 'contain' | 'cover' | 'crop';
  } = {}): string {
    const params = new URLSearchParams();
    
    if (options.width) params.append('width', options.width.toString());
    if (options.height) params.append('height', options.height.toString());
    if (options.quality) params.append('quality', options.quality.toString());
    if (options.format) params.append('format', options.format);
    if (options.fit) params.append('fit', options.fit);

    return `https://${this.config.domain}/cdn-cgi/image/${params}/${imageId}`;
  }

  /**
   * Create page rules for caching optimization
   */
  async createPageRule(pattern: string, cacheLevel: 'cache_everything' | 'bypass' | 'aggressive'): Promise<boolean> {
    try {
      const actions = {
        cache_everything: [{ id: 'cache_level', value: 'cache_everything' }],
        bypass: [{ id: 'cache_level', value: 'bypass' }],
        aggressive: [
          { id: 'cache_level', value: 'aggressive' },
          { id: 'browser_cache_ttl', value: '14400' },
        ],
      };

      const response = await fetch(
        `${this.baseUrl}/zones/${this.config.zoneId}/pagerules`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.config.apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            targets: [{ target: 'url', constraint: { operator: 'matches', value: pattern } }],
            actions: actions[cacheLevel],
            priority: 1,
            status: 'active',
          }),
        }
      );

      const result = await response.json() as any;
      if (result.success) {
        console.log(`✅ Page rule created: ${pattern}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Page rule creation error:', error);
      return false;
    }
  }

  /**
   * Purge cache for specific patterns
   */
  async purgeCache(patterns: string[]): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/zones/${this.config.zoneId}/purge_cache`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.config.apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ files: patterns }),
        }
      );

      const result = await response.json() as any;
      if (result.success) {
        console.log(`✅ Cache purged: ${patterns.join(', ')}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Cache purge error:', error);
      return false;
    }
  }
}

// Initialize CDN client
export function initCloudflare(): CloudflareCDN | null {
  if (!process.env.CLOUDFLARE_API_TOKEN) {
    console.warn('⚠️ Cloudflare API token not configured');
    return null;
  }

  return new CloudflareCDN({
    apiToken: process.env.CLOUDFLARE_API_TOKEN,
    zoneId: process.env.CLOUDFLARE_ZONE_ID || '',
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID || '',
    domain: process.env.CLOUDFLARE_DOMAIN || 'evolvefit.com',
    cname: process.env.CLOUDFLARE_CNAME || '',
  });
}

// CDN middleware for Express
export function cdnMiddleware(cdn: CloudflareCDN | null) {
  return (req: any, res: any, next: any) => {
    // Attach CDN helper to request
    req.cdn = {
      getImageUrl: (imageId: string, options?: any) => {
        return cdn?.getOptimizedImageUrl(imageId, options) || imageId;
      },
      uploadImage: (data: Buffer, filename: string) => {
        return cdn?.uploadImage(data, filename) || Promise.reject(new Error('CDN not configured'));
      },
    };
    next();
  };
}
