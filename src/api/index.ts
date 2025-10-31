import Express from 'express';
import RatingService from "../services/rating";
import RatingError from "../services/error";
import MetrixService from "../services/metrix";

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

        this.router.get('/rating{/:date}', this.rating);
        this.router.get('/rounds', this.rounds);
        this.router.get('/round/:id', this.round);
        this.router.get('/player/:id', this.player);

        this.router.get('/admin/process-round{/:id}', this.adminProcessRound);
    }

    private readonly rating: RouterCallback = async (req, res) => {
        const dateStr = req.params['date'];
        const date = new Date(dateStr ? Date.parse(dateStr) : Date.now());
        const ratingsData = await this.ratingService.getRatings(date);
        const dates = await this.ratingService.getRatingDates();
        const formattedDates = dates.map(date => Router.formatDate(date));

        res.render('rating', {
            date: ratingsData ? Router.formatDate(ratingsData.date) : null,
            ratings: ratingsData ? ratingsData.ratings : null,
            dates: formattedDates
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

        res.render('player', {
            player: player,
            rounds: rounds
        });
    };

    private readonly adminProcessRound: RouterCallback = async (req, res) => {
        const roundIdStr = req.params['id'];
        if (roundIdStr) {
            const roundId = parseInt(roundIdStr);
            if (isNaN(roundId)) {
                throw new RatingError(RatingError.INVALID_PARAMS);
            }

            const roundResult = await this.metrixService.getRoundResult(roundId);
            await this.ratingService.processRound(roundId, roundResult, true);

            res.redirect('/round/' + roundId);
        } else {
            const rounds = await this.ratingService.getRounds(true);
            res.render('process-round', {
                rounds: rounds
            });
        }
    };

    private static formatDate(date: Date): string {
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    }
}
