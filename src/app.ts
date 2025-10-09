import express from 'express';
import config from './config';
import loaders from './loaders';
import logger from './loaders/logger';

function startServer() {
    const app: express.Application = express();

    loaders(app);

    app.listen(config.port, config.host, (): void => {
        logger.info(`Server started`);
    });
}

try {
    startServer()
} catch (error) {
    logger.error(error);
}
