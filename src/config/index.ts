import dotenv from 'dotenv';

// Set the NODE_ENV to 'development' by default
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const envFound = dotenv.config();
if (envFound.error) {
    // This error should crash whole process
    throw new Error("Fatal error. Couldn't find .env file️");
}

export default {
    host: process.env.HOST || 'localhost',
    port: parseInt(process.env.PORT || '') || 3000,

    db: {
        client: process.env.DB_CLIENT || "pg",
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '') || 5433,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
    },

    logs: {
        level: process.env.LOG_LEVEL || 'silly',
        console: process.env.LOG_CONSOLE === 'true',
        filename: process.env.LOG_FILENAME,
    },
};
