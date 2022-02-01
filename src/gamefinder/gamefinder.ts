import Vue from "vue"
import Component from "vue-class-component"
import { Util } from "../core/util"
import Axios from "axios"

@Component
export default class App extends Vue {
    coachName:string|null = null;

    public hoverBlock: 'OFFERS' | 'OPPONENTS' | null = null;
    public featureFlags = {blackbox: true};

    public selectedOwnTeam:any = false;
    public selectedOpponentTeam:any = false;
    public me:any = { teams: [] };

    private opponentsNeedUpdate: boolean;
    public pendingOpponents: any = [];
    public opponentMap:Map<string,any> = new Map<string,any>();
    public opponents:any = {};
    public expandedForAllOpponents: number[] = [];
    private readHistory:Map<number,number[]> = new Map<number,number[]>();

    public pendingOffers:any = [];
    public offers:any = [];

    public additionalOffers: number = 0;

    public display: string = 'lfg';
    public modalDisplayed: 'ROSTER' | 'SETTINGS' | 'TEAM_SETTINGS' | null = null;
    public lfgTeams: any[] = [];
    public checked: boolean[] = [];
    public rosterdata = null;
    public rosterCache:any = {};

    public get showOfferButton() {
        return this.selectedOwnTeam && this.selectedOpponentTeam;
    }

    private async getOpponents() {
        const result = await Axios.post('/api/gamefinder/teams')

        const data = result.data;

        Util.applyDeepDefaults(data, [{
            visibleTeams: 0,
            expanded: false,
            showAll: false,
            url: (opp: any) => '/~' + encodeURIComponent(opp.name),
            teams: [{
                visible: false,
                selected: false,
                isOwn: false
            }]
        }], this.$set);

        for(let i = data.length - 1; i >= 0; i--) {
            if (data[i].name === this.coachName) {
                data.splice(i, 1);
            }
        }

        this.pendingOpponents = data;
        this.opponentsNeedUpdate = true;
        this.tick();
    }

    private async getOffers() {
        const pre = Date.now();
        const offers: any = await Axios.post('/api/gamefinder/getoffers', {cheatingCoachName: this.coachName});
        const now = Date.now();

        const avgTime = now / 2 + pre / 2;

        for (const offer of offers.data) {
            offer.expiry = avgTime + offer.timeRemaining;
            offer.external = offer.team1.coach.name !== this.coachName
            // Swap teams if the first team is the opponent's
            if (offer.team2.coach.name === this.coachName) {
                const x = offer.team1;
                offer.team1 = offer.team2;
                offer.team2 = x;
            }
            this.createOffer(offer);
        }
    }

    async mounted() {
        this.coachName = document.getElementsByClassName('gamefinder')[0].getAttribute('coach');

        await this.activate();
        await this.getOpponents();
        await this.reloadTeams();

        this.updateAllowed();
        this.refreshSelection();

        setInterval(this.tick, 100);
        setInterval(this.getOpponents, 5000);
        setInterval(this.getOffers, 1000);

        document.addEventListener('click', this.onOuterModalClick)
    }

    public async activate() {
        await Axios.post('/api/gamefinder/activate', {cheatingCoachName: this.coachName})
        const result = await Axios.post('/api/gamefinder/coachteams', {cheatingCoachName: this.coachName});
        const activeTeams = result.data.teams;

        Util.applyDeepDefaults(activeTeams, [{
            selected: false,
            isOwn: true,
            allow: [],
            hasUnreadItems: false,
            seen: [],
        }], this.$set);

        activeTeams.sort((a, b) => {
            let d = a.division > b.division ? -1 : (a.division === b.division ? 0 : 1);

            if (d === 0 && a.division === 'League') {
                d = a.league > b.league ? 1 : (a.league === b.league ? 0 : -1);
            }

            if (d === 0) {
                d = a.name > b.name ? 1 : (a.name === b.name ? 0 : -1);
            }

            return d;
        });
        this.me.teams = activeTeams;        
    }

    public tick() {
        this.updateTimeRemaining();
        this.processOffers();
        this.processOpponents();
    }

    private updateTimeRemaining() {
        const now = Date.now();
        for (const o of this.offers) {
            o.timeRemaining = o.expiry - now;
        }
    }

    private processOffers() {
        const now = Date.now();

        // Process match offers
        for (let i = this.offers.length - 1; i>=0; i--) {
            if (this.offers[i].expiry < now) {
                this.offers.splice(i, 1);
            }
        }

        if (this.hoverBlock !== 'OFFERS') {
            while(this.pendingOffers.length > 0) {
                const newOffer = this.pendingOffers.pop();

                let processed = false;
                for (const o of this.offers) {
                    if (newOffer.id == o.id) {
                        processed = true;
                        // Update expiry time just to be sure.
                        o.timeRemaining = newOffer.expiry - now;
                        o.expiry = newOffer.expiry;
                    }
                }

                if (!processed) {
                    this.offers.unshift(newOffer);
                }
            }
            this.additionalOffers = 0;
        } else {
            let num = 0;
            for (const pending of this.pendingOffers) {
                let found = false;
                for (const o of this.offers) {
                    if (pending.id == o.id) {
                        found = true;
                    }
                }
                if (!found) {
                    num++;
                }
            }
            this.additionalOffers = num;
        }
    }

    public setHoverBlock(uiToBlock: 'OFFERS' | 'OPPONENTS' | null) {
        this.hoverBlock = uiToBlock;
    }

    private processOpponents() {
        // Process updated opponent list
        if (this.opponentsNeedUpdate) {
            this.opponentsNeedUpdate = false;
            if (this.hoverBlock !== 'OPPONENTS') {
                // Mark all current opponents as dirty
                this.opponentMap.forEach((o, k) => {
                    this.opponentMap.get(k).dirty = true;
                });

                let r = {};
                for (let p of this.pendingOpponents) {
                    r[p.name] = p;
                }

                for (let k in r) {
                    if (!this.opponentMap.has(k)) {
                        // New coach
                        r[k].dirty = false;
                        this.opponentMap.set(k, r[k]);
                    } else {
                        // Coach is already on the list, so make sure it's kept there.
                        let opp = this.opponentMap.get(k)
                        opp.dirty = false;

                        // Update teams

                        // Generate map and mark as dirty
                        let teamMap = {};
                        for (let t in opp.teams) {
                            let team = opp.teams[t];
                            team.dirty = true;
                            teamMap[team.id] = team;
                        }

                        r[k].teams.forEach(t => {
                            if (teamMap[t.id] == undefined) {
                                // new team, add it
                                teamMap[t.id] = t;
                                t.dirty = false;
                            } else {
                                // Existing team, mark it as clean
                                teamMap[t.id].dirty = false;
                            }
                        });

                        // Remove teams that are no longer on the list
                        for (let i=opp.teams.length - 1; i>=0; i--) {
                            if (opp.teams[i].dirty) {
                                delete teamMap[opp.teams[i].id];
                                opp.teams.splice(i, 1);
                            } else {
                                // Need to update the stats.. Might have changed
                                let existingTeam = opp.teams[i];
                                existingTeam.teamValue = teamMap[existingTeam.id].teamValue;
                                existingTeam.gamesPlayed = teamMap[existingTeam.id].gamesPlayed;

                                // Remove team from pending list
                                delete teamMap[existingTeam.id];
                            }
                        }

                        // Add new teams.
                        for (let k in teamMap) {
                            opp.teams.push(teamMap[k]);
                        }
                    }
                }

                // Remove opponent coaches that aren't present anymore
                this.opponentMap.forEach((o, key) => {
                    if (o.dirty) {
                        this.opponentMap.delete(key);
                    }
                });

                // Store collapsed state of coaches
                const collapsed: Array<string> = [];
                for (let o of this.opponents) {
                    if (! o.expanded) {
                        collapsed.push(o.name);
                    }
                }

                // Generate new opponents structure
                let newOpponents = [];
                this.opponentMap.forEach(o => {
                    newOpponents.push(o);
                    // Expand unless the coach was explicitly collapsed (allow new coaches to be expanded by default)
                    o.expanded = collapsed.indexOf(o.name) === -1;
                });

                this.opponents = newOpponents;
                this.pendingOpponents = [];
                this.sortOpponents();
                this.refreshSelection();
                this.updateAllowed();
            }
        }        
    }

    private sortOpponents() {
        this.opponents.sort((a,b) => a.name.localeCompare(b.name));
    }

    private isMatchAllowed(team1, team2): boolean {
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

    public updateAllowed() {
        for (let team of this.me.teams) {
            team.allow = [];
            this.opponentMap.forEach(opponent => {
                for (let oppTeam of opponent.teams) {
                    if (this.isMatchAllowed(team, oppTeam)) {
                        team.allow.push(oppTeam.id);
                    }
                }
            });
        }
        this.updateUnread();
    }

    public updateUnread() {
        for (const team of this.me.teams) {
            if (this.selectedOwnTeam && team.id === this.selectedOwnTeam.id) {
                team.hasUnreadItems = false;
                continue;
            }
            if (team.allow.length === 0) {
                team.hasUnreadItems = false;
                continue;
            }

            if (! this.readHistory.has(team.id)) {
                team.hasUnreadItems = true;
                continue;
            }

            let newEntriesFound = false;
            const teamReadHistory = this.readHistory.get(team.id);
            for (const oppTeamId of team.allow) {
                if (! teamReadHistory.includes(oppTeamId)) {
                    newEntriesFound = true;
                    break;
                }
            }
            team.hasUnreadItems = newEntriesFound;
        }
    }

    public applyTeamFilters() {
        this.opponentMap.forEach(opponent => {
            let numVisibleTeams = 0;
            for (let oppTeam of opponent.teams) {
                if (this.selectedOwnTeam) {
                    oppTeam.visible = this.selectedOwnTeam.allow.includes(oppTeam.id);
                } else {
                    oppTeam.visible = true;
                }

                if (oppTeam.visible) {
                    numVisibleTeams++;
                }
            }
            opponent.visibleTeams = numVisibleTeams;
        });
    }

    public isExpanded(opponent) {
        if (this.selectedOwnTeam) {
            return opponent.expanded;
        } else {
            return this.expandedForAllOpponents.includes(opponent.id);
        }
    }

    public expandOpponent(opponent) {
        if (this.selectedOwnTeam) {
            // We have selected a team, so we can use the property directly on the opponent.
            opponent.expanded = !opponent.expanded;
        } else {
            // No team selected, so we store the expanded state separately.
            let index = this.expandedForAllOpponents.indexOf(opponent.id);
            if (index !== -1) {
                this.expandedForAllOpponents.splice(index, 1);
            } else {
                this.expandedForAllOpponents.push(opponent.id);
            }
        }

        this.refreshSelection();
    }

    public expandAllOpponents() {
        if (this.selectedOwnTeam) {
            for (const visibleOpponent of this.visibleOpponents) {
                visibleOpponent.expanded = true;
            }
        } else {
             this.expandedForAllOpponents = Array.from(this.opponentMap.values()).map((o) => o.id);
        }
    }

    public collapseAllOpponents() {
        if (this.selectedOwnTeam) {
            for (const visibleOpponent of this.visibleOpponents) {
                visibleOpponent.expanded = false;
            }
        } else {
             this.expandedForAllOpponents = [];
        }
    }

    public selectTeam(team) {
        for (let myTeam of this.me.teams) {
            myTeam.selected = false;
        }

        team.hasUnreadItems = false;

        if (team.id === this.selectedOwnTeam.id) {
            this.selectedOwnTeam = null;
            team.selected = false;

        } else {
            this.selectedOwnTeam = team;
            team.selected = true;

            // update the read history for the selected team
            if (! this.readHistory.has(this.selectedOwnTeam.id)) {
                this.readHistory.set(this.selectedOwnTeam.id, []);
            }
            const teamReadHistory = this.readHistory.get(this.selectedOwnTeam.id);
            for (const oppTeamId of team.allow) {
                if (! teamReadHistory.includes(oppTeamId))
                teamReadHistory.push(oppTeamId);
            }
        }

        this.refreshSelection();
    }

    private onOuterModalClick(e) {
        const clickTarget = e.target;
        const modals = [
            document.querySelector('.rosterouter, .settingsouter, .teamsettingsouter'),
        ];
        for (const modal of modals) {
            if (clickTarget == modal) {
                this.modalDisplayed = null;
            }
        }
    }

    public async openModalRosterForTeamId(teamId) {
        const rosterData = await this.getRoster(teamId);
        this.rosterdata = rosterData;
        this.modalDisplayed = 'ROSTER';
    }

    public async openModalRoster() {
        this.openModalRosterForTeamId(this.selectedOwnTeam.id);
    }

    public closeModalRoster() {
        this.rosterdata = null;
        this.modalDisplayed = null;
    }

    public openModalSettings() {
        this.modalDisplayed = 'SETTINGS';
    }

    public closeModalSettings() {
        this.modalDisplayed = null;
    }

    public openModalTeamSettings() {
        this.modalDisplayed = 'TEAM_SETTINGS';
    }

    public closeModalTeamSettings() {
        this.modalDisplayed = null;
    }

    public abbreviate(stringValue: string, maxCharacters: number) {
        if (stringValue.length <= maxCharacters) {
            return stringValue;
        }
        return stringValue.substring(0, maxCharacters-1) + '…';
    }

    public teamLogo(team: any): number | false {
        for (let l of team.raceLogos) {
            if (l.size === 32) {
                return l.logo;
            }
        }
        return false;
    }

    public get availableBlackboxTeams(): number {
        let available = 0;
        for (const team of this.lfgTeams) {
            if (team.division === 'Competitive') {
                available++;
            }
        }

        return available;
    }

    public get chosenBlackboxTeams(): number {
        let chosen = 0;
        for (const team of this.me.teams) {
            if (team.division === 'Competitive') {
                chosen++;
            }
        }

        return chosen;
    }

    private refreshSelection() {
        let ownTeamSelected = false;

        // Update own team selection
        for (let myTeam of this.me.teams) {
            myTeam.selected = this.selectedOwnTeam && (myTeam.id == this.selectedOwnTeam.id);
            if (myTeam.selected) {
                ownTeamSelected = true;
            }
        }

        // No visible own team selected, so we make sure the state reflects that
        if (!ownTeamSelected) {
            this.selectedOwnTeam = false;
        }

        this.applyTeamFilters();
    }

    private offerIsAlreadyPending(offerId: number): boolean {
        for (const pendingOffer of this.pendingOffers) {
            if (pendingOffer.id === offerId) {
                return true;
            }
        }
        return false;
    }

    private createOffer(offerData) {
        if (this.offerIsAlreadyPending(offerData.id)) {
            return;
        }

        let offer = {
            id: offerData.id,
            expiry: offerData.expiry,
            timeRemaining: offerData.timeRemaining,
            lifetime: offerData.lifetime,
            external: offerData.external,
            home: {
                id: offerData.team1.id,
                team: offerData.team1.name,
                race: offerData.team1.race.name,
                tv: (offerData.team1.teamValue / 1000) + 'k',
            },
            away: {
                id: offerData.team2.id,
                team: offerData.team2.name,
                race: offerData.team2.race.name,
                tv: (offerData.team2.teamValue / 1000) + 'k'
            }
        };

        this.pendingOffers.unshift(offer);
    }

    public sendOffer(team) {
        let ownId = parseInt(this.selectedOwnTeam.id);
        let oppId = parseInt(team.id);
        Axios.post('/api/gamefinder/offer/' + ownId + '/' + oppId);
    }

    private findOfferForTeam(team) {
        for (const offer of this.offers) {
            if (offer.home.id == this.selectedOwnTeam.id && offer.away.id === team.id) {
                return offer;
            }
        }
    }

    public offerExists(team): boolean {
        return this.findOfferForTeam(team) ? true : false;
    }

    public cancelOfferByTeam(team) {
        const offer = this.findOfferForTeam(team)
        this.cancelOffer(offer)
    }

    public cancelOffer(offer) {
        let index = this.offers.indexOf(offer);
        if (index !== -1) {
            this.offers.splice(index,1);
        }
    }

    public async showLfg() {
        this.display='none';

        await this.activate();

        // always select if only 1 team
        if (this.me.teams.length === 1) {
            const onlyTeam = this.me.teams[0];
            this.selectedOwnTeam = onlyTeam;
            onlyTeam.selected = true;
        }

        await this.getOpponents();

        await this.updateAllowed();
        this.refreshSelection();

        this.display='lfg';
    }

    public async showTeams() {
        this.display='none';
        await this.reloadTeams();
        this.updateAllChecked();
        this.display='teams';
    }

    public async reloadTeams() {
        const result = await Axios.post('/api/coach/teams/' + this.coachName);
        let teams = result.data.teams;

        this.lfgTeams = [];
        this.checked = [];
        for (let team of teams) {
            if (team.canLfg == 'Yes' && team.status == 'Active') {
                this.lfgTeams.push(team);
                if (team.isLfg == 'Yes') {
                    this.checked.push(team.id);
                }
            }
        }
    }

    public get visibleOpponents(): any[] {
        const visibleOpponents = [];
        for (const opponent of this.opponents) {
            if (opponent.visibleTeams > 0) {
                visibleOpponents.push(opponent);
            }
        }
        return visibleOpponents;
    }

    private updateAllChecked()
    {
        const allCheckbox:any = document.getElementById('all');
        const checkboxes = document.getElementsByClassName('teamcheck');

        let allChecked = true;
        let allUnchecked = true;
        for (let index=0; index<checkboxes.length; index++) {
            const c:any = checkboxes[index];
            if (c.checked) {
                allUnchecked = false;
            } else {
                allChecked = false;
            }
        }

        if (allUnchecked) {
            allCheckbox.checked = false;
            allCheckbox.indeterminate = false;
        } else if (allChecked) {
            allCheckbox.checked = true;
            allCheckbox.indeterminate = false;
        } else {
            allCheckbox.checked = false;
            allCheckbox.indeterminate = true;
        }
    }

    public toggleTeam(event) {
        const target = event.target;
        const checked = target.checked;
        const id = target.value;

        if (checked) {
            Axios.post('/api/gamefinder/addteam/' + id);
        } else {
            Axios.post('/api/gamefinder/removeteam/' + id);
        }
        this.updateAllChecked();
    }

    public toggleAll(event) {
        const checked = event.target.checked;

        if (checked) {
            Axios.post('/api/gamefinder/addallteams', {cheatingCoachName: this.coachName});
        } else {
            Axios.post('/api/gamefinder/removeallteams', {cheatingCoachName: this.coachName});
        }

        const checkboxes = document.getElementsByClassName('teamcheck');

        const arr = [];
        for (let index=0; index<checkboxes.length; index++) {
            const c:any = checkboxes[index];
            c.checked = checked;
            if (checked) {
                arr.push(c.value);
            }
        }
        this.checked = arr;
    }

    public async getRoster(teamId) {
        let data = this.rosterCache[teamId];

        if (this.rosterCache[teamId] != undefined) {
            if (data.expiry < Date.now()) {
                data = undefined;
            }
        }
        if (data == undefined) {
            const result = await Axios.post('/api/team/get/'+teamId);

            for (const p of result.data.players) {
                p.skills.sort((a,b) => a.localeCompare(b));
                p.skills = p.skills.join(', ');
            }

            result.data.players.sort((a,b) => {
                let r = a.position.localeCompare(b.position);
                if (r == 0) {
                    r = b.skills.length - a.skills.length;
                }
                return r;
            });

            data = {
                expiry: Date.now() + 60000,
                roster: result.data,
            }
            this.rosterCache[teamId] = data;
        }

        return data.roster;
    }
}

const app = new App({
    el: '#vuecontent',
    components: {
    }
});
