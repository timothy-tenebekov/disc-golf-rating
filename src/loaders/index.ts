import {Application} from 'express';
import expressLoader from './express';
import knexLoader from './knex';
import logger from './logger';
import RatingService from "../services/rating";

export default (app: Application): void => {
    const knex = knexLoader();
    logger.info(`DB initialized`);
    const ratingService = new RatingService(knex);
    logger.info(`Rating service initialized`);
    expressLoader(app, ratingService);
    logger.info('Express initialized');
}
