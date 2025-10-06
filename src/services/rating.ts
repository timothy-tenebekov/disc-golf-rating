import {Knex} from 'knex';
import RatingError from './error';
import {PlayerRow, RatingRow, ResultJoinedRow, ResultRow, RoundRow, SettingRow} from "./row";
import {RoundResult} from "./metrix";

interface PlayerResult {
    id: number;
    result: number;
    playerRating: number | null;
    roundRating: number | null;
}

export default class RatingService {
    private readonly knex: Knex;

    constructor(knex: Knex) {
        this.knex = knex;
    }

    async getSetting(name: string, date: Date): Promise<number> {
        const settingRow = await this.knex<SettingRow>('settings')
            .first()
            .where({name: name})
            .andWhere("date", "<=", date)
            .orderBy('date', 'desc');
        if (!settingRow) {
            throw new RatingError(RatingError.SETTING_NOT_FOUND);
        }
        return settingRow.value;
    }

    async addRound(roundId: number): Promise<void> {
        try {
            await this.knex<RoundRow>('rounds')
                .insert({id: roundId})
        } catch (err) {
            throw new RatingError(RatingError.ROUND_ALREADY_EXISTS);
        }
    }

    async processRound(roundId: number, roundResult: RoundResult, force: boolean): Promise<void> {
        return this.knex.transaction(async trx => {
            const roundRow = await trx<RoundRow>('rounds')
                .first()
                .where({id: roundId});
            if (!roundRow) {
                throw new RatingError(RatingError.ROUND_NOT_FOUND);
            }
            if (roundRow.processed && !force) {
                throw new RatingError(RatingError.ROUND_ALREADY_PROCESSED);
            }

            await trx<RoundRow>('rounds')
                .update({
                    datetime: roundResult.datetime,
                    course_id: roundResult.courseId,
                    course_name: roundResult.courseName,
                    baskets: roundResult.baskets,
                    par_rating: undefined,
                    point_rating: undefined,
                    processed: true
                })
                .where({id: roundId});

            await trx<ResultRow>('results')
                .delete()
                .where({round_id: roundId});

            for (const playerResult of roundResult.playerResults) {
                if (playerResult.id == null || playerResult.className === 'Тренировка' || playerResult.dnf) {
                    continue;
                }
                await trx<PlayerRow>('players')
                    .insert({id: playerResult.id, metrix_name: playerResult.name})
                    .onConflict('id')
                    .merge();
                await trx<ResultRow>('results')
                    .insert({round_id: roundId, player_id: playerResult.id, result: playerResult.diff});
            }

            await this.calculateRating(trx, roundId);

            const date = RatingService.truncateTime(roundResult.datetime);
            const futureRoundsIds = await this.getFutureRounds(trx, date);

            for (const futureRoundId of futureRoundsIds) {
                await this.calculateRating(trx, futureRoundId);
            }
        });
    }

    async removeRound(roundId: number, force: boolean): Promise<void> {
        return this.knex.transaction(async trx => {
            const roundRow = await this.knex<RoundRow>('rounds')
                .first()
                .where({id: roundId});
            if (!roundRow) {
                throw new RatingError(RatingError.ROUND_NOT_FOUND);
            }

            if (roundRow.processed && !force) {
                throw new RatingError(RatingError.ROUND_ALREADY_PROCESSED);
            }

            await trx<RoundRow>('rounds')
                .delete()
                .where({id: roundId});

            if (!roundRow.processed) {
                return;
            }

            if (!roundRow.datetime) {
                throw new RatingError(RatingError.UNKNOWN);
            }

            const date = RatingService.truncateTime(roundRow.datetime);

            await trx<ResultRow>('results')
                .delete()
                .where({round_id: roundId});

            const futureRoundsIds = await this.getFutureRounds(trx, date);

            for (const futureRoundId of futureRoundsIds) {
                await this.calculateRating(trx, futureRoundId);
            }
        });
    }

    async getPlayerRating(builder: Knex, playerId: number, date: Date): Promise<number | null> {
        const ratingRow = await builder<RatingRow>('ratings')
            .first()
            .where({player_id: playerId})
            .andWhere("date", "<", date)
            .orderBy('date', 'desc');
        if (ratingRow) {
            return ratingRow.rating;
        }

        const playerRow = await builder<PlayerRow>('players')
            .first()
            .where({id: playerId});
        return playerRow ? playerRow.initial_rating : null;
    }

    private async getFutureRounds(builder: Knex, date: Date): Promise<number[]> {
        const roundRows = await builder<RoundRow>('rounds')
            .select()
            .where('datetime', '>', date);
        return roundRows.map(row => row.id);
    }

    private async calculateRating(builder: Knex, roundId: number): Promise<void> {
        const roundRow = await builder<RoundRow>('rounds')
            .first()
            .where({id: roundId});
        const resultRows = await builder<ResultRow>('results')
            .select()
            .where({round_id: roundId});

        if (!roundRow || roundRow.datetime == undefined || roundRow.baskets == undefined) {
            throw new RatingError(RatingError.UNKNOWN);
        }
        const date = RatingService.truncateTime(roundRow.datetime);
        const minPointRating = await this.getSetting("MinBirdieDiff", date) / roundRow.baskets;

        const results: PlayerResult[] = [];
        for (const resultRow of resultRows) {
            const playerId = resultRow.player_id;
            const playerRating = await this.getPlayerRating(builder, playerId, date);
            results.push({id: playerId, result: resultRow.result, playerRating: playerRating, roundRating: null});
        }

        const roundRating = RatingService.calcRatingAux(results, minPointRating);
        const parRating = roundRating ? Math.round(roundRating[1]) : null;
        const pointRating = roundRating ? roundRating[0] : null;

        await builder<RoundRow>('rounds')
            .update({par_rating: parRating, point_rating: pointRating})
            .where({id: roundId});

        for (const result of results) {
            await builder<ResultRow>('results')
                .update({player_rating: result.playerRating, round_rating: result.roundRating})
                .where({player_id: result.id, round_id: roundId});
        }

        await this.updatePlayerRating(builder, date);
    }

    private async updatePlayerRating(builder: Knex, date: Date): Promise<void> {
        await builder<RatingRow>('ratings')
            .delete()
            .where({date: date});

        const minBaskets = await this.getSetting('MinBaskets', date);
        const maxBaskets = await this.getSetting('MaxBaskets', date);
        const minDate = new Date(date.getFullYear() - 1, date.getMonth(), date.getDate());
        const maxDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

        // TODO: limit date to 1 year to the past
        const resultRows = await builder({a: 'results'})
            .select('a.*', 'b.datetime', 'b.baskets')
            .leftJoin({b: 'rounds'}, {'a.round_id': 'b.id'})
            .where('b.datetime', '>', minDate)
            .andWhere('b.datetime', '<', maxDate)
            .orderBy([{column: 'a.player_id'}, {column: 'b.datetime', order: 'desc'}]) as ResultJoinedRow[];
        const ratings: Map<number, number> = new Map();
        let playerId = 0;
        let sum = 0;
        let baskets = 0;
        for (const resultRow of resultRows) {
            if (!resultRow.round_rating || !resultRow.baskets) {
                continue;
            }
            if (resultRow.player_id != playerId) {
                if (baskets >= minBaskets) {
                    ratings.set(playerId, Math.round(sum / baskets));
                }
                playerId = resultRow.player_id;
                sum = 0;
                baskets = 0;
            }
            if (baskets < maxBaskets) {
                sum += resultRow.round_rating * resultRow.baskets;
                baskets += resultRow.baskets;
            }
        }
        if (baskets >= minBaskets) {
            ratings.set(playerId, Math.round(sum / baskets));
        }

        for (const rating of ratings) {
            await builder<RatingRow>('ratings')
                .insert({player_id: rating[0], date: date, rating: rating[1]});
        }
    }

    private static calcRatingAux(results: PlayerResult[], minPointRating: number): [number, number] | null {
        let n = 0;
        let x = 0;
        let x2 = 0;
        let xy = 0;
        let y = 0;
        for (const result of results) {
            if (result.playerRating) {
                ++n;
                x += result.result;
                x2 += result.result * result.result;
                xy += result.result * result.playerRating;
                y += result.playerRating;
            }
        }

        if (n < 3) {
            return null;
        }

        const d = n * x2 - x * x;
        let a = 0;
        let b = y / n;
        if (d != 0) {
            a = (x * y - n * xy) / d;
            b = (x2 * y - x * xy) / d;
        }
        if (a < minPointRating) {
            a = minPointRating;
            b = (y + a * x) / n;
        }

        for (const result of results) {
            result.roundRating = Math.max(Math.round(b - a * result.result), 0);
        }

        return [a, b];
    }

    private static truncateTime(datetime: Date): Date {
        return new Date(datetime.getFullYear(), datetime.getMonth(), datetime.getDate());
    }
}
