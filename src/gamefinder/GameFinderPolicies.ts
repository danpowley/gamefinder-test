export default class GameFinderPolicies {
    constructor() {

    }

    public isMatchAllowed(team1, team2): boolean {
        if (!team1 || !team2) {
            return false;
        }

        if (team1.coach == team2.coach) {
            return false;
        }

        if (team1.division != team2.division) {
            return false;
        }

        if (team1.status != "Active" || team2.status != "Active") {
            return false;
        }

        if (!team1.canLfg || !team2.canLfg) {
            return false;
        }

        if (team1.league.valid && team2.league.valid) {
            if (team1.league.ruleset.id != team2.league.ruleset.id) {
                return false;
            }

            if (team1.league.id != team2.league.id) {
                if (!team1.league.ruleset.options['rulesetOptions.crossLeagueMatches'] || !team2.league.ruleset.options['rulesetOptions.crossLeagueMatches']) {

                    return false;
                }
            }
        }

        if (team1.percentageLimit || team2.percentageLimit) {
            let tvDiff = Math.abs(team1.teamValue - team2.teamValue);
            let limit1 = this.getTvLimit(team1);
            let limit2 = this.getTvLimit(team2);

            if (limit1 != 0 && tvDiff > limit1) {
                return false;
            }
            if (limit2 != 0 && tvDiff > limit2) {
                return false;
            }
        }

        return true;
    }

    private getTvLimit(team) {
        let rating = Math.floor(team.teamValue / 10000);
        if (team.gamesPlayed < 3) {
            return Math.round(rating * 0.1) * 10000;
        }
        if (team.gamesPlayed < 10) {
            return Math.round(rating * 0.15) * 10000;
        }
        if (team.gamesPlayed < 30) {
            let limit = Math.round(rating * (0.15 + (team.gamesPlayed - 10) / 100 * 2)) * 10000;
            return limit;
        }

        return 0;        
    }

    public sortTeamByDivisionNameLeagueNameTeamName(teamA, teamB) {
        let d = teamA.division > teamB.division ? -1 : (teamA.division === teamB.division ? 0 : 1);

        if (d === 0 && teamA.division === 'League' && teamA.league.name) {
            d = teamA.league.name > teamB.league.name ? 1 : (teamA.league.name === teamB.league.name ? 0 : -1);
        }

        if (d === 0) {
            d = teamA.name > teamB.name ? 1 : (teamA.name === teamB.name ? 0 : -1);
        }

        return d;
    }
}