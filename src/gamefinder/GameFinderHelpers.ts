export default class GameFinderHelpers {
    public static getTeamLogoId(team: any, size: number = 32): number | false {
        for (let l of team.raceLogos) {
            if (l.size === size) {
                return l.logo;
            }
        }
        return false;
    }

    public static getTeamLogoUrl(team: any): string {
        const teamLogoId = this.getTeamLogoId(team);
        // @christer using absolute url here, as I don't have the icons locally.
        return 'https://fumbbl.com/i/' + teamLogoId;
    }
}