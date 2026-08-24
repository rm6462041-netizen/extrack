const fs = require('fs');
const path = require('path');
const util = require('util');

const LOGS_DIR = path.resolve(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOGS_DIR, 'feed-service.log');
const MAX_LOG_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB max file size before rotation
const MAX_BACKUP_FILES = 5;

// Ensure logs directory exists
if (!fs.existsSync(LOGS_DIR)) {
  try {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  } catch (err) {
    console.error(`[Logger] Failed to create logs dir: ${err.message}`);
  }
}

let writeStream = null;

function getWriteStream() {
  if (writeStream) return writeStream;
  try {
    writeStream = fs.createWriteStream(LOG_FILE, { flags: 'a', encoding: 'utf8' });
    writeStream.on('error', (err) => {
      console.error(`[Logger] Stream error: ${err.message}`);
      writeStream = null;
    });
  } catch (err) {
    console.error(`[Logger] Failed to open write stream: ${err.message}`);
  }
  return writeStream;
}

function rotateLogsIfNeeded() {
  try {
    if (!fs.existsSync(LOG_FILE)) return;
    const stats = fs.statSync(LOG_FILE);
    if (stats.size < MAX_LOG_SIZE_BYTES) return;

    if (writeStream) {
      writeStream.end();
      writeStream = null;
    }

    // Shift old backups: .4 -> .5, .3 -> .4, etc.
    for (let i = MAX_BACKUP_FILES - 1; i >= 1; i--) {
      const oldPath = path.join(LOGS_DIR, `feed-service.${i}.log`);
      const newPath = path.join(LOGS_DIR, `feed-service.${i + 1}.log`);
      if (fs.existsSync(oldPath)) {
        if (i === MAX_BACKUP_FILES - 1) {
          try { fs.unlinkSync(newPath); } catch {}
        }
        try { fs.renameSync(oldPath, newPath); } catch {}
      }
    }

    // Rename current log to .1
    const backup1 = path.join(LOGS_DIR, 'feed-service.1.log');
    try { fs.renameSync(LOG_FILE, backup1); } catch {}
  } catch (err) {
    console.error(`[Logger] Rotation error: ${err.message}`);
  }
}

function formatLogLine(level, tag, message, meta) {
  const timestamp = new Date().toISOString();
  let metaStr = '';
  if (meta !== undefined && meta !== null) {
    if (typeof meta === 'object') {
      try {
        metaStr = ` | ${JSON.stringify(meta)}`;
      } catch {
        metaStr = ` | ${util.inspect(meta, { depth: 2, breakLength: Infinity })}`;
      }
    } else {
      metaStr = ` | ${meta}`;
    }
  }
  return `[${timestamp}] [${level.toUpperCase()}] [${tag}] ${message}${metaStr}\n`;
}

function appendToFile(line) {
  try {
    rotateLogsIfNeeded();
    const stream = getWriteStream();
    if (stream && stream.writable) {
      stream.write(line);
    } else {
      fs.appendFileSync(LOG_FILE, line, 'utf8');
    }
  } catch (err) {
    console.error(`[Logger] Failed to write to file: ${err.message}`);
  }
}

const logger = {
  info(tag, message, meta) {
    const line = formatLogLine('INFO', tag, message, meta);
    appendToFile(line);
  },

  warn(tag, message, meta) {
    const line = formatLogLine('WARN', tag, message, meta);
    appendToFile(line);
  },

  error(tag, message, meta) {
    let errorDetails = meta;
    let errMsg = message;
    if (message instanceof Error) {
      errorDetails = { message: message.message, stack: message.stack, ...(meta || {}) };
      errMsg = message.message;
    } else if (meta instanceof Error) {
      errorDetails = { message: meta.message, stack: meta.stack };
    }
    const stackStr = errorDetails?.stack ? `\n\x1b[90m${errorDetails.stack}\x1b[0m` : '';
    console.error(`\x1b[91m[ERROR - ${tag}]\x1b[0m \x1b[1m\x1b[31m${errMsg}\x1b[0m${stackStr}`);
    const line = formatLogLine('ERROR', tag, errMsg, errorDetails);
    appendToFile(line);
  },

  http(req, res, durationMs, details = {}) {
    const method = req.method;
    const url = req.originalUrl || req.url;
    const statusCode = res.statusCode;
    const isError = statusCode >= 400;
    const ms = Math.round(durationMs);

    if (isError) {
      const reason = details.errorReason || res.statusMessage || 'Request failed';
      console.error(
        `\x1b[91m[BACKEND REQUEST FAILED ${statusCode}]\x1b[0m \x1b[1m${method} ${url}\x1b[0m \x1b[90m(${ms}ms)\x1b[0m \x1b[91m--> REASON: ${reason}\x1b[0m`
      );
      const line = formatLogLine('ERROR', 'HTTP', `${method} ${url} -> ${statusCode} (${ms}ms)`, { ...details, reason });
      appendToFile(line);
    } else {
      const extra = details.source ? `\x1b[33m[${details.source} | ${details.candlesCount || 0} candles]\x1b[0m` : '';
      console.log(
        `\x1b[32m[BACKEND REQUEST 200 OK]\x1b[0m ${method} ${url} \x1b[90m(${ms}ms)\x1b[0m ${extra}`
      );
      const line = formatLogLine('INFO', 'HTTP', `${method} ${url} -> ${statusCode} (${ms}ms)`, details);
      appendToFile(line);
    }
  },

  getRecentLogs(lineCount = 200) {
    try {
      if (!fs.existsSync(LOG_FILE)) return [];
      const content = fs.readFileSync(LOG_FILE, 'utf8');
      const lines = content.trim().split('\n');
      return lines.slice(-lineCount);
    } catch (err) {
      logger.error('Logger', `Failed to read log file: ${err.message}`);
      return [`[ERROR] Could not read logs: ${err.message}`];
    }
  },

  getLogFilePath() {
    return LOG_FILE;
  },
};

module.exports = logger;
