export default class GameFinderPolicies {
    // @christer this is set to 10 seconds to get quick feedback while testing
    private static readonly hiddenMatchDurationSeconds = 10;

    public static isMatchAllowed(myTeam, opponentTeam): boolean {
        if (!myTeam || !opponentTeam) {
            return false;
        }

        for (const hiddenMatchDetails of myTeam.hiddenMatches) {
            if (hiddenMatchDetails.opponentTeamId === opponentTeam.id) {
                return false;
            }
        }

        if (myTeam.coach == opponentTeam.coach) {
            return false;
        }

        if (myTeam.division != opponentTeam.division) {
            return false;
        }

        if (myTeam.status != "Active" || opponentTeam.status != "Active") {
            return false;
        }

        if (!myTeam.canLfg || !opponentTeam.canLfg) {
            return false;
        }

        if (myTeam.league.valid && opponentTeam.league.valid) {
            if (myTeam.league.ruleset.id != opponentTeam.league.ruleset.id) {
                return false;
            }

            if (myTeam.league.id != opponentTeam.league.id) {
                if (!myTeam.league.ruleset.options['rulesetOptions.crossLeagueMatches'] || !opponentTeam.league.ruleset.options['rulesetOptions.crossLeagueMatches']) {

                    return false;
                }
            }
        }

        if (myTeam.percentageLimit || opponentTeam.percentageLimit) {
            let tvDiff = Math.abs(myTeam.teamValue - opponentTeam.teamValue);
            let limit1 = this.getTvLimit(myTeam);
            let limit2 = this.getTvLimit(opponentTeam);

            if (limit1 != 0 && tvDiff > limit1) {
                return false;
            }
            if (limit2 != 0 && tvDiff > limit2) {
                return false;
            }
        }

        return true;
    }

    private static getTvLimit(team) {
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

    public static sortTeamByDivisionNameLeagueNameTeamName(teamA, teamB) {
        let d = teamA.division > teamB.division ? -1 : (teamA.division === teamB.division ? 0 : 1);

        if (d === 0 && teamA.division === 'League' && teamA.league.name) {
            d = teamA.league.name > teamB.league.name ? 1 : (teamA.league.name === teamB.league.name ? 0 : -1);
        }

        if (d === 0) {
            d = teamA.name > teamB.name ? 1 : (teamA.name === teamB.name ? 0 : -1);
        }

        return d;
    }

    public static teamCanLfg(team: any): boolean {
        return team.canLfg === 'Yes' && team.status === 'Active';
    }

    public static teamIsLfg(team: any): boolean {
        return team.isLfg === 'Yes';
    }

    public static teamIsCompetitiveDivision(team: any): boolean {
        return team.division === 'Competitive';
    }

    public static getHiddenMatchesExpiry(): number {
        return Date.now() - this.hiddenMatchDurationSeconds * 1000;
    }
}