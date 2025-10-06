import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import config from '../config';

const transports = [];
if (config.logs.console) {
    transports.push(new winston.transports.Console());
}
if (config.logs.filename) {
    let filename = config.logs.filename;
    const dotIndex = filename.lastIndexOf('.');
    if (dotIndex >= 0) {
        filename = filename.substring(0, dotIndex) + '-%DATE%' + filename.substring(dotIndex);
    }
    transports.push(new DailyRotateFile({
        filename: filename,
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '10m',
        maxFiles: '14d'
    }));
}

const format = winston.format.combine(
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss.SSS'
    }),
    winston.format.align(),
    winston.format.splat(),
    winston.format.printf((info: winston.Logform.TransformableInfo) => `${info.timestamp as string} [${info.level}]: ${info.message}`)
);

const logger = winston.createLogger({
    level: config.logs.level,
    levels: winston.config.npm.levels,
    format: format,
    transports
});

export class LoggerStream {
    write(message: string): void {
        if (message.endsWith('\n')) {
            message = message.substr(0, message.length - 1);
        }
        logger.info(message);
    }
}

export default logger;
