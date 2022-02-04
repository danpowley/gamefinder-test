import Vue from "vue"
import Component from "vue-class-component"
import { Util } from "../core/util"
import Axios from "axios"
import GameFinderPolicies from "./GameFinderPolicies";
import LfgTeamsComponent from "./components/LfgTeams";
import BlackboxComponent from "./components/Blackbox";
import SettingsComponent from "./components/Settings";
import TeamSettingsComponent from "./components/TeamSettings";
import RosterComponent from "./components/Roster";
import TeamCardsComponent from "./components/TeamCards";
import SelectedOwnTeamComponent from "./components/SelectedOwnTeam";
import OffersComponent from "./components/Offers";

@Component
export default class App extends Vue {
    private coachName:string|null = null;

    public display: 'LFG' | 'TEAMS' | 'NONE' = 'LFG';
    public hoverBlock: 'OFFERS' | 'OPPONENTS' | null = null;
    public featureFlags = {blackbox: true};
    public modalSettings: {roster: {teamId: number | null}, settings: boolean, teamSettings: {team: any}} = {roster: {teamId: null}, settings: false, teamSettings: {team: null}};

    public selectedOwnTeam:any = null;
    public me:any = { teams: [] };

    private opponentsNeedUpdate: boolean;
    public pendingOpponents: any = [];
    public opponentMap:Map<string,any> = new Map<string,any>();
    public opponents:any = {};
    public expandedForAllOpponents: number[] = [];
    private readHistory:Map<number,number[]> = new Map<number,number[]>();

    // the offers property is primarily managed by the OffersComponent, they're held here and passed to OffersComponent as a prop
    public offers:any = [];

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
        this.processOpponents();
    }

    async mounted() {
        this.coachName = document.getElementsByClassName('gamefinder')[0].getAttribute('coach');

        // @christer remove this
        this.cheatCreateCoach();

        await this.activate();
        await this.getOpponents();

        this.updateAllowed();
        this.refreshSelection();

        setInterval(this.processOpponents, 100);
        setInterval(this.getOpponents, 5000);

        document.addEventListener('click', this.onOuterModalClick)
    }

    // @christer remove this method
    /**
     * Creates coach and teams (if already exist nothing happens)
     */
    private async cheatCreateCoach() {
        await Axios.post('/api/gamefinder/addcheatingcoach', {cheatingCoachName: this.coachName});
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

        activeTeams.sort(GameFinderPolicies.sortTeamByDivisionNameLeagueNameTeamName);
        this.me.teams = activeTeams;
    }

    public setHoverBlock(aspectToBlock: 'OFFERS' | 'OPPONENTS', isBlock: boolean) {
        this.hoverBlock = isBlock ? aspectToBlock : null;
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

    public updateAllowed() {
        for (let team of this.me.teams) {
            team.allow = [];
            this.opponentMap.forEach(opponent => {
                for (let oppTeam of opponent.teams) {
                    if (GameFinderPolicies.isMatchAllowed(team, oppTeam)) {
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

    public deselectTeam() {
        this.selectedOwnTeam.selected = false;
        this.selectedOwnTeam = null;
        this.refreshSelection();
    }

    public selectTeam(team) {
        for (let myTeam of this.me.teams) {
            myTeam.selected = false;
        }

        this.selectedOwnTeam = team;
        team.selected = true;
        team.hasUnreadItems = false;

        // update the read history for the selected team
        if (! this.readHistory.has(this.selectedOwnTeam.id)) {
            this.readHistory.set(this.selectedOwnTeam.id, []);
        }
        const teamReadHistory = this.readHistory.get(this.selectedOwnTeam.id);
        for (const oppTeamId of team.allow) {
            if (! teamReadHistory.includes(oppTeamId))
            teamReadHistory.push(oppTeamId);
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
                this.closeModal();
            }
        }
    }

    public async openModalRosterForTeamId(teamId) {
        this.modalSettings.roster.teamId = teamId;
    }

    public async openModalRoster() {
        this.openModalRosterForTeamId(this.selectedOwnTeam.id);
    }

    public openModalSettings() {
        this.modalSettings.settings = true;
    }

    public openModalTeamSettings() {
        this.modalSettings.teamSettings.team = this.selectedOwnTeam;
    }

    public closeModal() {
        this.modalSettings.roster.teamId = null;
        this.modalSettings.settings = false;
        this.modalSettings.teamSettings.team = null;
    }

    public abbreviate(stringValue: string, maxCharacters: number) {
        return Util.abbreviate(stringValue, maxCharacters);
    }

    public teamLogo(team: any): number | false {
        for (let l of team.raceLogos) {
            if (l.size === 32) {
                return l.logo;
            }
        }
        return false;
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
            this.selectedOwnTeam = null;
        }

        this.applyTeamFilters();
    }

    public sendOffer(team) {
        let ownId = parseInt(this.selectedOwnTeam.id);
        let oppId = parseInt(team.id);
        Axios.post('/api/gamefinder/offer/' + ownId + '/' + oppId);
    }

    private findOfferForTeam(team) {
        if (! this.selectedOwnTeam) {
            return false;
        }

        for (const offer of this.offers) {
            if (offer.home.id == this.selectedOwnTeam.id && offer.away.id === team.id) {
                return offer;
            }
        }
    }

    public offerExists(team): boolean {
        return this.findOfferForTeam(team) ? true : false;
    }

    public async showLfg() {
        this.display = 'NONE';

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

        this.display = 'LFG';
    }

    public async showTeams() {
        this.display = 'TEAMS';
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
}

const app = new App({
    el: '#vuecontent',
    components: {
        'lfgteams': LfgTeamsComponent,
        'blackbox': BlackboxComponent,
        'settings': SettingsComponent,
        'teamsettings': TeamSettingsComponent,
        'roster': RosterComponent,
        'teamcards': TeamCardsComponent,
        'selectedownteam': SelectedOwnTeamComponent,
        'offers': OffersComponent
    }
});