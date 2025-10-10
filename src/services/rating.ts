import {Knex, QueryBuilder} from 'knex';
import RatingError from './error';
import {
    PlayerRow, RatingJoinedPlayerRow, RatingRow,
    ResultJoinedPlayerRow, ResultJoinedRoundRow, ResultRow, RoundRow, SettingRow
} from "./row";
import {MetrixRoundResult} from "./metrix";

export interface RatingPlayerData {
    id: number;
    metrixName: string;
    rating: number;
}

export interface RatingsData {
    date: Date;
    ratings: RatingPlayerData[];
}

export interface RoundShortData {
    id: number;
    name: string;
    datetime: Date;
    courseId: number;
    courseName: string;
}

export interface RoundPlayerResultData {
    id: number;
    metrixName: string;
    result: number;
    playerRating: number;
    roundRating: number;
}

export interface RoundFullData {
    id: number;
    name: string;
    datetime: Date;
    courseId: number;
    courseName: string;
    parRating: number;
    pointRating: number;
    results: RoundPlayerResultData[];
}

export interface PlayerRoundData {
    id: number;
    name: string;
    datetime: Date;
    courseId: number;
    courseName: string;
    result: number;
    rating: number;
}

export interface PlayerFullData {
    id: number;
    metrixName: string;
    rating: number | null;
    rounds: PlayerRoundData[];
}

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

    async processRound(roundId: number, roundResult: MetrixRoundResult, force: boolean): Promise<void> {
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
                    name: roundResult.name,
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

    async getRatings(date: Date): Promise<RatingsData | null> {
        const ratingRow = await this.knex('ratings')
            .max({max_date: 'date'})
            .where('date', '<=', date)
            .first() as { max_date: Date | null };
        const ratingDate = ratingRow.max_date;
        if (!ratingDate) {
            return null;
        }
        const ratingRows = await this.knex({r: 'ratings'})
            .select()
            .leftJoin({p: 'players'}, {'r.player_id': 'p.id'})
            .where({'r.date': ratingDate})
            .orderBy('r.rating', 'desc') as RatingJoinedPlayerRow[];
        const ratings = ratingRows.map(row => ({
            id: row.player_id,
            metrixName: row.metrix_name,
            rating: row.rating
        } as RatingPlayerData));
        return {date: ratingDate, ratings: ratings};
    }

    async getRatingDates(): Promise<Date[]> {
        const ratingRows = await this.knex<RatingRow>('ratings')
            .distinct('date')
            .orderBy('date', 'desc');
        return ratingRows.map(row => row.date);
    }

    async getRoundIdsForProcess(force: boolean): Promise<number[]> {
        const roundRows = await this.knex<RoundRow>('rounds')
            .select()
            .orderBy('datetime', 'asc');
        const ids: number[] = [];
        for (const roundRow of roundRows) {
            if (!roundRow.processed || force) {
                ids.push(roundRow.id);
            }
        }
        return ids;
    }

    async getRounds(): Promise<RoundShortData[]> {
        const roundRows = await this.knex<RoundRow>('rounds')
            .select()
            .where({processed: true})
            .orderBy('datetime', 'desc');
        return roundRows.map(row => ({
            id: row.id,
            name: row.name,
            datetime: row.datetime,
            courseId: row.course_id,
            courseName: row.course_name
        } as RoundShortData));
    }

    async getRound(roundId: number): Promise<RoundFullData> {
        const roundRow = await this.knex<RoundRow>('rounds')
            .first()
            .where({id: roundId})
            .andWhere({processed: true});
        if (!roundRow || !roundRow.name || !roundRow.datetime || !roundRow.course_id || !roundRow.course_name || !roundRow.par_rating || !roundRow.point_rating) {
            throw new RatingError(RatingError.ROUND_NOT_FOUND);
        }
        const resultRows = await this.knex<ResultJoinedPlayerRow>({r: 'results'})
            .select()
            .leftJoin({p: 'players'}, {'r.player_id': 'p.id'})
            .where({'r.round_id': roundId})
            .orderBy('r.result');
        const results = resultRows.map(row => ({
            id: row.player_id,
            metrixName: row.metrix_name,
            result: row.result,
            playerRating: row.player_rating,
            roundRating: row.round_rating
        } as RoundPlayerResultData));
        return {
            id: roundRow.id,
            name: roundRow.name,
            datetime: roundRow.datetime,
            courseId: roundRow.course_id,
            courseName: roundRow.course_name,
            parRating: roundRow.par_rating,
            pointRating: roundRow.point_rating,
            results: results
        };
    }

    async getPlayer(playerId: number): Promise<PlayerFullData> {
        const playerRow = await this.knex<PlayerRow>('players')
            .where({id: playerId})
            .first();
        if (!playerRow) {
            throw new RatingError(RatingError.PLAYER_NOT_FOUND);
        }
        const rating = await this.getPlayerRating(this.knex, playerId, new Date(Date.now()));
        const resultRows = await this.knex({a: 'results'})
            .select()
            .leftJoin({b: 'rounds'}, {'a.round_id': 'b.id'})
            .where({'a.player_id': playerId})
            .orderBy('b.datetime', 'desc') as ResultJoinedRoundRow[];
        const rounds = resultRows.map(row => ({
            id: row.round_id,
            name: row.name,
            datetime: row.datetime,
            courseId: row.course_id,
            courseName: row.course_name,
            result: row.result,
            rating: row.round_rating
        } as PlayerRoundData));
        return {id: playerId, metrixName: playerRow.metrix_name, rating: rating, rounds: rounds};
    }

    private async getPlayerRating(builder: Knex, playerId: number, date: Date): Promise<number | null> {
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

        const resultRows = await builder({a: 'results'})
            .select('a.*', 'b.datetime', 'b.baskets')
            .leftJoin({b: 'rounds'}, {'a.round_id': 'b.id'})
            .where('b.datetime', '>', minDate)
            .andWhere('b.datetime', '<', maxDate)
            .orderBy([{column: 'a.player_id'}, {column: 'b.datetime', order: 'desc'}]) as ResultJoinedRoundRow[];
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
