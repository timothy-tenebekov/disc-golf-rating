import {Knex} from 'knex';
import knexLoader from '../loaders/knex';
import MetrixService from "../services/metrix";
import RatingService from "../services/rating";

async function main() {
    let knex : Knex | undefined;
    try {
        knex = knexLoader();
        const ratingService = new RatingService(knex);
        const metrixService = new MetrixService();

        const args = process.argv.slice(2);
        if (args.length !== 1 && args.length !== 2) {
            throw usage();
        }
        const roundId = parseInt(args[0]);
        const force = args.length >= 2 && parseInt(args[1]) != 0;
        if (!roundId) {
            throw usage();
        }

        const roundResult = await metrixService.getRoundResult(roundId);
        console.info(`Round: ${roundResult.name} ${roundResult.datetime.toISOString()}`);

        await ratingService.processRound(roundId, roundResult, force);
        console.info(`Round processed`);
    }
    finally {
        if (knex) {
            await knex.destroy();
        }
    }
}

function usage() {
    return 'Invalid params. Usage: node process-round.js roundId [force]';
}

main()
    .catch(error => {
        console.error(error);
    });
