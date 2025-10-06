import RatingError from "./error";

export interface PlayerResult {
    id: number | null;
    name: string;
    className: string;
    diff: number;
    dnf: boolean;
}

export interface RoundResult {
    name: string;
    datetime: Date;
    courseId: number;
    courseName: string;
    baskets: number;
    playerResults: PlayerResult[];
}

interface MetrixResult {
    UserID: number;
    Name: string;
    ClassName: string;
    Diff: number;
    DNF: string | undefined;
}

interface MetrixTrack {
    Par: number;
}

interface MetrixCompetition {
    Name: string;
    Date: string;
    Time: string;
    CourseName: string;
    CourseID: number;
    Results: MetrixResult[];
    Tracks: MetrixTrack[];
}

interface MetrixResponse {
    Competition: MetrixCompetition;
}

export default class MetrixService {
    async getRoundResult(roundId: number): Promise<RoundResult> {
        // TODO: add validation
        const res = await fetch(`https://discgolfmetrix.com/api.php?content=result&id=${roundId}`);
        const response = await res.json() as MetrixResponse;
        const competition = response.Competition;
        if (!competition) {
            throw new RatingError(RatingError.METRIX_ROUND_NOT_FOUND);
        }

        const playerResults: PlayerResult[] = [];
        for (const result of competition.Results) {
            playerResults.push({
                id: result.UserID,
                name: result.Name,
                className: result.ClassName,
                diff: result.Diff,
                dnf: result.DNF != null && result.DNF !== '0'
            });
        }

        return {
            name: competition.Name,
            datetime: new Date(competition.Date + ' ' + competition.Time),
            courseId: competition.CourseID,
            courseName: competition.CourseName,
            baskets: competition.Tracks.length,
            playerResults: playerResults
        }
    }
}
