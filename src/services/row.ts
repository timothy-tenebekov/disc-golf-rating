export interface SettingRow {
    name: string;
    date: Date;
    value: number;
}

export interface PlayerRow {
    id: number;
    metrix_name: string;
    first_name: string | null;
    last_name: string | null;
    initial_rating: number | null;
}

export interface RoundRow {
    id: number;
    processed: boolean;
    name: string;
    date: Date;
    time: string;
    baskets: number | null;
    course_id: number | null;
    course_name: string | null;
    par_rating: number | null;
    point_rating: number | null;
}

export interface ResultRow {
    round_id: number;
    player_id: number;
    result: number;
    player_rating: number | null;
    round_rating: number | null;
}

export interface ResultJoinedRoundRow extends ResultRow {
    date: Date;
    name: string;
    baskets: number | null;
    course_id: number | null;
    course_name: string | null;
}

export interface ResultJoinedPlayerRow extends ResultRow {
    metrix_name: string;
}

export interface RatingRow {
    player_id: number;
    date: Date;
    rating: number;
}

export interface RatingJoinedPlayerRow {
    player_id: number;
    date: Date;
    rating: number;
    metrix_name: string;
}