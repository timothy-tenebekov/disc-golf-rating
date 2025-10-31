import {Application} from 'express';
import expressLoader from './express';
import knexLoader from './knex';
import logger from './logger';
import RatingService from "../services/rating";
import MetrixService from "../services/metrix";

export default (app: Application): void => {
    const knex = knexLoader();
    logger.info(`DB initialized`);
    const ratingService = new RatingService(knex);
    logger.info(`Rating service initialized`);
    const metrixService = new MetrixService();
    logger.info(`Metrix service initialized`);
    expressLoader(app, ratingService, metrixService);
    logger.info('Express initialized');
}
