import {Knex} from 'knex';
import knexLoader from '../loaders/knex';
import RatingService from "../services/rating";

async function main() {
    let knex : Knex | undefined;
    try {
        knex = knexLoader();
        const ratingService = new RatingService(knex);

        const args = process.argv.slice(2);
        if (args.length !== 1 && args.length !== 2) {
            throw usage();
        }
        const roundId = parseInt(args[0]);
        const force = args.length >= 2 && parseInt(args[1]) != 0;
        if (!roundId) {
            throw usage();
        }

        await ratingService.removeRound(roundId, force);
        console.info(`Round removed`);
    }
    finally {
        if (knex) {
            await knex.destroy();
        }
    }
}

function usage() {
    return 'Invalid params. Usage: node remove-round.js roundId [force]';
}

main()
    .catch(error => {
        console.error(error);
    });
