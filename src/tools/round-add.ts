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
        if (args.length !== 1) {
            throw usage();
        }
        const roundId = parseInt(args[0]);
        if (!roundId) {
            throw usage();
        }

        const roundResult = await metrixService.getRoundResult(roundId);
        console.info(`Round: ${roundResult.name} ${roundResult.date.toLocaleDateString()} ${roundResult.time}`);

        await ratingService.addRound(roundId, roundResult);
        console.info(`Round added`);
    }
    finally {
        if (knex) {
            await knex.destroy();
        }
    }
}

function usage() {
    return 'Invalid params. Usage: node round-add.js roundId';
}

main()
    .catch(error => {
        console.error(error);
    });
