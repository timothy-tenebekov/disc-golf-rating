import {Knex} from 'knex';
import knexLoader from '../loaders/knex';
import RatingService from "../services/rating";

async function main() {
    let knex : Knex | undefined;
    try {
        knex = knexLoader();
        const ratingService = new RatingService(knex);

        const args = process.argv.slice(2);
        if (args.length !== 1) {
            throw usage();
        }
        const roundId = parseInt(args[0]);
        if (!roundId) {
            throw usage();
        }

        await ratingService.cancelRound(roundId);
        console.info(`Round removed`);
    }
    finally {
        if (knex) {
            await knex.destroy();
        }
    }
}

function usage() {
    return 'Invalid params. Usage: node round-cancel.js roundId';
}

main()
    .catch(error => {
        console.error(error);
    });
