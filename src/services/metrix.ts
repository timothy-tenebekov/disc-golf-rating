import he from "he";
import RatingError from "./error";

export interface MetrixPlayerResult {
    id: number | null;
    name: string;
    className: string;
    diff: number;
    dnf: boolean;
}

export interface MetrixRoundResult {
    name: string;
    datetime: Date;
    courseId: number;
    courseName: string;
    baskets: number;
    playerResults: MetrixPlayerResult[];
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
    async getRoundResult(roundId: number): Promise<MetrixRoundResult> {
        // TODO: add validation
        const res = await fetch(`https://discgolfmetrix.com/api.php?content=result&id=${roundId}`);
        const response = await res.json() as MetrixResponse;
        const competition = response.Competition;
        if (!competition) {
            throw new RatingError(RatingError.METRIX_ROUND_NOT_FOUND);
        }

        const playerResults: MetrixPlayerResult[] = [];
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
            name: MetrixService.decodeHtml(competition.Name),
            datetime: new Date(competition.Date + ' ' + competition.Time),
            courseId: competition.CourseID,
            courseName: MetrixService.decodeHtml(competition.CourseName),
            baskets: competition.Tracks.length,
            playerResults: playerResults
        }
    }

    private static decodeHtml(str: string): string {
        return he.decode(str);
    }
}
