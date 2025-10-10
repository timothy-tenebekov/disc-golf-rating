import Express from 'express';
import RatingService from "../services/rating";

export default (ratingService: RatingService): Express.Router => {
    const router = new Router(ratingService);
    return router.router;
}

type RouterCallback = (req: Express.Request, res: Express.Response) => void;

class Router {
    readonly router: Express.Router;
    readonly ratingService: RatingService;

    constructor(ratingService: RatingService) {
        this.router = Express.Router({mergeParams: true});
        this.ratingService = ratingService;

        this.router.get('/rating{/:date}', this.rating);
        this.router.get('/rounds', this.rounds);
        this.router.get('/round{/:id}', this.round);
        this.router.get('/player{/:id}', this.player);
    }

    private readonly rating: RouterCallback = async (req, res) => {
        //Router.logRequest(req);
        try {
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
        } catch (e) {
            //Router.logError(e);
            res.status(500);
        }
    };

    private readonly rounds: RouterCallback = async (req, res) => {
        //Router.logRequest(req);
        try {
            const rounds = await this.ratingService.getRounds();

            res.render('rounds', {
                rounds: rounds
            });
        } catch (e) {
            //Router.logError(e);
            res.status(500);
        }
    };

    private readonly round: RouterCallback = async (req, res) => {
        //Router.logRequest(req);
        try {
            const roundId = parseInt(req.params['id']);
            const round = await this.ratingService.getRound(roundId);

            res.render('round', {
                round: round
            });
        } catch (e) {
            //Router.logError(e);
            res.status(500);
        }
    };

    private readonly player: RouterCallback = async (req, res) => {
        //Router.logRequest(req);
        try {
            const playerId = parseInt(req.params['id']);
            const player = await this.ratingService.getPlayer(playerId);

            res.render('player', {
                player: player
            });
        } catch (e) {
            //Router.logError(e);
            res.status(500);
        }
    };

    private static formatDate(date: Date): string {
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    }
}

