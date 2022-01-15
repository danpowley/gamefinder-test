import Vue, { ComponentOptions } from "vue"
import Component from "vue-class-component"
import { Util } from "../core/util"
import Axios from "axios"
import TeamComponent from "./components/team"

@Component
export default class App extends Vue {
    coachName:string|null = null;

    private deferredOfferUpdate = false;

    public selectedOwnTeam:any = false;
    public selectedOpponentTeam:any = false;
    public me:any = { teams: [] };

    private opponentsNeedUpdate: boolean;
    public pendingOpponents: any = [];
    public opponentMap:Map<string,any> = new Map<string,any>();
    public opponents:any = {};

    private expandedOpponent:any = null;

    public pendingOffers:any = [];
    public offers:any = [];

    public additionalOffers: number = 0;

    public display: string = 'lfg';
    public lfgTeams: any[] = [];
    public checked: boolean[] = [];
    public rosterdata = {};
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
                fade: false,
                selected: false,
                isOwn: false,
                showDivisionHeader: false,
                showLeagueHeader: false
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

        this.updateAllowed();
        this.refreshSelection();

        setInterval(this.tick, 100);
        setInterval(this.getOpponents, 5000);
        setInterval(this.getOffers, 1000);
    }

    public async activate() {
        await Axios.post('/api/gamefinder/activate', {cheatingCoachName: this.coachName})
        const result = await Axios.post('/api/gamefinder/coachteams', {cheatingCoachName: this.coachName});
        const activeTeams = result.data.teams;

        Util.applyDeepDefaults(activeTeams, [{
            fade: false,
            selected: false,
            isOwn: true,
            showDivisionHeader: false,
            showLeagueHeader: false,
            allow: []
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
        let hover = false;
        for (let i = this.offers.length - 1; i>=0; i--) {
            if (this.offers[i].expiry < now) {
                this.offers.splice(i, 1);
            } else {
                if (this.offers[i].hover) {
                    hover = true;
                }
            }
        }

        if (hover === false) {
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

    private processOpponents() {
        // Process updated opponent list
        if (this.opponentsNeedUpdate) {
            this.opponentsNeedUpdate = false;
            let hover = false;
            this.opponentMap.forEach(opp => {
                if (opp.hover) {
                    hover = true;
                }
            });
            if (hover === false) {
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

                // Store expanded state of coaches
                let expanded: Array<string> = [];
                for (let o of this.opponents) {
                    if (o.expanded) {
                        expanded.push(o.name);
                    }
                }

                // Generate new opponents structure
                let newOpponents = [];
                this.opponentMap.forEach(o => {
                    newOpponents.push(o);
                    // Expand if the coach was expanded before
                    if (expanded.indexOf(o.name) > -1) {
                        o.expanded = true;
                    }
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
    }

    public applyTeamFilters() {
        this.opponentMap.forEach(opponent => {
            let numVisibleTeams = 0;
            for (let oppTeam of opponent.teams) {
                oppTeam.fade = this.selectedOwnTeam && !this.selectedOwnTeam.allow.includes(oppTeam.id);
                if (!oppTeam.fade) {
                    numVisibleTeams++;
                }
            }
            opponent.visibleTeams = numVisibleTeams;
        });
        var previousDivision = false;
        var previousLeagueId = false;
        for (let myTeam of this.me.teams) {
            myTeam.showDivisionHeader = false;
            myTeam.showLeagueHeader = false;
            if (previousDivision !== myTeam.division) {
                previousDivision = myTeam.division;
                myTeam.showDivisionHeader = true;
            }

            if (myTeam.division === 'League' && previousLeagueId !== myTeam.league.id) {
                previousLeagueId = myTeam.league.id;
                myTeam.showLeagueHeader = true;
            }
            myTeam.fade = this.selectedOpponentTeam && !myTeam.allow.includes(this.selectedOpponentTeam.id);
        }
    }

    public expandOpponent(opponent) {
        this.expandedOpponent = (this.expandedOpponent == opponent) ? null : opponent;

        this.refreshSelection();
    }

    public select(team, selected) {
        this.opponentMap.forEach(o => o.expanded = selected);

        if (selected) {
            if (team.isOwn) {
                for (let myTeam of this.me.teams) {
                    myTeam.selected = false;
                }
                this.selectedOwnTeam = team;
            } else {
                this.opponentMap.forEach(opponent => {
                    for (let oppTeam of opponent.teams) {
                        oppTeam.selected = false;
                    }
                });
                this.selectedOpponentTeam = selected ? team : 0;
            }

        } else {
            this.selectedOwnTeam = team.isOwn ? false : this.selectedOwnTeam;
            this.selectedOpponentTeam = team.isOwn ? this.selectedOpponentTeam : false;
            this.expandedOpponent = null;
        }
        team.selected = selected;
        this.refreshSelection();
    }

    private refreshSelection() {
        let ownTeamSelected = false;
        let opponentTeamSelected = false;

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

        // Update opponent selection
        this.opponentMap.forEach(opp => {
            opp.expanded = ownTeamSelected || (this.expandedOpponent != null && this.expandedOpponent.id == opp.id);
            for (let oppTeam of opp.teams) {
                oppTeam.selected = this.selectedOpponentTeam && (oppTeam.id == this.selectedOpponentTeam.id);
                if (oppTeam.selected) {
                    opp.expanded = true;
                    opponentTeamSelected = true;
                }
            }
        });
        // No visible opponent team selected; update state to that effect
        if (!opponentTeamSelected) {
            this.selectedOpponentTeam = false;
        }

        this.applyTeamFilters();
    }

    private createOffer(offerData) {
        let offer = {
            id: offerData.id,
            expiry: offerData.expiry,
            timeRemaining: offerData.timeRemaining,
            lifetime: offerData.lifetime,
            external: offerData.external,
            hover: false,
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

    private clearSelection() {
        this.opponentMap.forEach(opp => {
            opp.expanded = false;
            for (let t of opp.teams) {
                t.selected = false;
            }
        });

        this.selectedOpponentTeam = false;
        this.refreshSelection();
    }

    public sendOffer() {
        let ownId = parseInt(this.selectedOwnTeam.id);
        let oppId = parseInt(this.selectedOpponentTeam.id);
        Axios.post('/api/gamefinder/offer/' + ownId + '/' + oppId);
        //this.createOffer(this.selectedOwnTeam, this.selectedOpponentTeam, false);
        this.clearSelection();
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

    public showRanking(opponent): boolean {
        const result = opponent.visibleTeams > 0;
        return result;
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

    public async hover(event, team) {
        const hover = document.getElementById('roster');
        hover.style.display = 'block';

        const teamId = team.id;
        const data = await this.getRoster(teamId);
        this.rosterdata = data;
        const wrapper: any = document.getElementById('wrapper');
        const rect = wrapper.getBoundingClientRect();
        hover.style.left = rect.left + "px";
    }

    public leave(event, team) {
        const hover = document.getElementById('roster');
        hover.style.display = 'none';
        this.rosterdata = {};
    }
}

const app = new App({
    el: '#vuecontent',
    components: {
        'team': TeamComponent
    }
});
