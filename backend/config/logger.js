const winston = require('winston');
const path = require('path');

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

// Define custom format for console output
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        if (stack) {
            msg += `\n${stack}`;
        }
        if (Object.keys(meta).length > 0) {
            msg += `\n${JSON.stringify(meta, null, 2)}`;
        }
        return msg;
    })
);

// Create logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: 'worktrack-backend' },
    transports: [
        // Write all logs to console
        new winston.transports.Console({
            format: consoleFormat,
        }),
        // Write all logs with level 'error' and below to error.log
        new winston.transports.File({ 
            filename: path.join(__dirname, '../logs/error.log'), 
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        // Write all logs with level 'info' and below to combined.log
        new winston.transports.File({ 
            filename: path.join(__dirname, '../logs/combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
    ],
    exceptionHandlers: [
        new winston.transports.File({ 
            filename: path.join(__dirname, '../logs/exceptions.log') 
        })
    ],
    rejectionHandlers: [
        new winston.transports.File({ 
            filename: path.join(__dirname, '../logs/rejections.log') 
        })
    ],
});

// If we're not in production, also log to console with simpler format
if (process.env.NODE_ENV !== 'production') {
    logger.level = 'debug';
}

module.exports = logger;
