import bodyParser from 'body-parser';
import compression from 'compression';
import express, {Application} from "express";
import morgan from 'morgan';
import api from '../api';
import {LoggerStream} from './logger';
import RatingService from "../services/rating";

export default (app: Application, ratingService: RatingService): void => {
    app.set('trust proxy', true);
    app.set('views', './views');
    app.set('view engine', 'pug');

    app.use(compression());
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({extended: true}));
    app.use(morgan('short', {stream: new LoggerStream()}));

    app.use(express.static('public'));
    app.use('/', api(ratingService));
}
