import bodyParser from 'body-parser';
import compression from 'compression';
import express, {Application, Request, Response, NextFunction} from "express";
import morgan from 'morgan';
import api from '../api';
import logger, {LoggerStream} from './logger';
import RatingService from "../services/rating";
import MetrixService from "../services/metrix";

export default (app: Application, ratingService: RatingService, metrixService: MetrixService): void => {
    app.set('trust proxy', true);
    app.set('views', './views');
    app.set('view engine', 'pug');

    app.use(compression());
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({extended: true}));
    app.use(morgan('short', {stream: new LoggerStream()}));

    app.use(express.static('public'));
    app.use('/', api(ratingService, metrixService));

    app.use(errorHandler);
}

const errorHandler = (
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
): void => {
    const statusCode = 500;
    const message = err.message || 'Internal Server Error';

    logger.error('[ERROR]', err);

    res.status(statusCode).json({
        success: false,
        error: {
            message,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
        },
    });
};