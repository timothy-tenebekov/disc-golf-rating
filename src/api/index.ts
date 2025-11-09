import Express from 'express';
import RatingService from "../services/rating";
import RatingError from "../services/error";
import MetrixService from "../services/metrix";
import {Gender} from "../services/row";

export default (ratingService: RatingService, metrixService: MetrixService): Express.Router => {
    const router = new Router(ratingService, metrixService);
    return router.router;
}

type RouterCallback = (req: Express.Request, res: Express.Response) => void;

class Router {
    readonly router: Express.Router;
    readonly ratingService: RatingService;
    readonly metrixService: MetrixService;

    constructor(ratingService: RatingService, metrixService: MetrixService) {
        this.router = Express.Router({mergeParams: true});
        this.ratingService = ratingService;
        this.metrixService = metrixService;

        this.router.get('/rating{-:gender}{/:date}', this.rating);
        this.router.get('/rounds', this.rounds);
        this.router.get('/round/:id', this.round);
        this.router.get('/player/:id', this.player);

        this.router.get('/admin/rounds', this.adminRounds);
        this.router.get('/admin/round/add/:id', this.adminRoundAdd);
        this.router.get('/admin/round/remove/:id', this.adminRoundRemove);
        this.router.get('/admin/round/process/:id', this.adminRoundProcess);
        this.router.get('/admin/round/cancel/:id', this.adminRoundCancel);
    }

    private readonly rating: RouterCallback = async (req, res) => {
        const genderStr = req.params['gender'];
        const dateStr = req.params['date'];
        const gender = genderStr ? Router.parseGender(genderStr) : null;
        const date = new Date(dateStr ? Date.parse(dateStr) : Date.now());
        const ratings = await this.ratingService.getRatings(date, gender);
        const dates = await this.ratingService.getRatingDates();

        res.render('rating', {
            gender: gender?.toString(),
            date: ratings ? ratings.date : null,
            ratings: ratings ? ratings.ratings : null,
            dates: dates
        });
    };

    private readonly rounds: RouterCallback = async (req, res) => {
        const rounds = await this.ratingService.getRounds();

        res.render('rounds', {
            rounds: rounds
        });
    };

    private readonly round: RouterCallback = async (req, res) => {
        const roundId = parseInt(req.params['id']);
        if (isNaN(roundId)) {
            throw new RatingError(RatingError.INVALID_PARAMS);
        }
        const round = await this.ratingService.getRound(roundId);
        const results = await this.ratingService.getRoundResults(roundId);

        res.render('round', {
            round: round,
            results: results
        });
    }

    private readonly player: RouterCallback = async (req, res) => {
        const playerId = parseInt(req.params['id']);
        if (isNaN(playerId)) {
            throw new RatingError(RatingError.INVALID_PARAMS);
        }
        const player = await this.ratingService.getPlayer(playerId);
        const rounds = await this.ratingService.getPlayerRounds(playerId);
        const ratings = await this.ratingService.getPlayerRatings(playerId);

        res.render('player', {
            player: player,
            rounds: rounds,
            ratings: ratings
        });
    };

    private readonly adminRounds: RouterCallback = async (req, res) => {
        const rounds = await this.ratingService.getRounds(true);

        res.render('admin-rounds', {
            rounds: rounds
        });
    };

    private readonly adminRoundAdd: RouterCallback = async (req, res) => {
        const roundId = parseInt(req.params['id']);
        if (isNaN(roundId)) {
            throw new RatingError(RatingError.INVALID_PARAMS);
        }

        const roundResult = await this.metrixService.getRoundResult(roundId);
        await this.ratingService.addRound(roundId, roundResult);

        res.redirect('/admin/rounds');
    };

    private readonly adminRoundRemove: RouterCallback = async (req, res) => {
        const roundId = parseInt(req.params['id']);
        if (isNaN(roundId)) {
            throw new RatingError(RatingError.INVALID_PARAMS);
        }

        await this.ratingService.removeRound(roundId);

        res.redirect('/admin/rounds');
    };

    private readonly adminRoundProcess: RouterCallback = async (req, res) => {
        const roundId = parseInt(req.params['id']);
        if (isNaN(roundId)) {
            throw new RatingError(RatingError.INVALID_PARAMS);
        }

        const roundResult = await this.metrixService.getRoundResult(roundId);
        await this.ratingService.processRound(roundId, roundResult, true);

        res.redirect('/admin/rounds');
    };

    private readonly adminRoundCancel: RouterCallback = async (req, res) => {
        const roundId = parseInt(req.params['id']);
        if (isNaN(roundId)) {
            throw new RatingError(RatingError.INVALID_PARAMS);
        }

        await this.ratingService.cancelRound(roundId);

        res.redirect('/admin/rounds');
    };

    private static parseGender(str: string): Gender {
        const key = Object.keys(Gender).find(k => Gender[k as keyof typeof Gender] === str);
        if (!key) {
            throw new RatingError(RatingError.INVALID_PARAMS);
        }
        return Gender[key as keyof typeof Gender];
    }
}
