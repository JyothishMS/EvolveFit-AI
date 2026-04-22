module.exports = {
  apps: [
    {
      // App 1
      name: 'evolvefit-api',
      script: './dist/server.js',
      instances: 'max', // Use all available CPU cores
      exec_mode: 'cluster', // Cluster mode for load balancing
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: 'logs/error.log',
      out_file: 'logs/output.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'dist'],
      max_memory_restart: '500M',
      instance_var: 'INSTANCE_ID',
      
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 3000,
      
      // Restart strategy
      max_restarts: 10,
      min_uptime: '10s',
      
      // Environment variables
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
      },
      
      // Advanced cluster options
      merge_logs: true,
      combination_buffer_timeout: 100,
    },
  ],

  // Deployment configuration (optional)
  deploy: {
    production: {
      user: 'ubuntu',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/evolvefit-ai.git',
      path: '/home/ubuntu/evolvefit-ai',
      'post-deploy': 'npm install && npm run build && pm2 restart ecosystem.config.js --env production',
      'pre-deploy-local': 'echo "Deploying to production"',
    },
  },
};
