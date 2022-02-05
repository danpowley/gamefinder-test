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
import OpponentsComponent from "./components/Opponents";

@Component
export default class App extends Vue {
    private coachName:string|null = null;

    public display: 'LFG' | 'TEAMS' | 'NONE' = 'LFG';
    public featureFlags = {blackbox: true};
    public modalSettings: {roster: {teamId: number | null}, settings: boolean, teamSettings: {team: any}} = {roster: {teamId: null}, settings: false, teamSettings: {team: null}};

    public selectedOwnTeam:any = null;
    public opponentTeamIdsWithOffersFromSelectedOwnTeam: number[] = [];
    public me:any = { teams: [] };

    public opponentMap:Map<string,any> = new Map<string,any>();
    public opponentsRefreshRequired: boolean = false;
    private readHistory:Map<number,number[]> = new Map<number,number[]>();

    // the offers property is primarily managed by the OffersComponent, they're held here and passed to OffersComponent as a prop
    public offers:any = [];

    async mounted() {
        this.coachName = document.getElementsByClassName('gamefinder')[0].getAttribute('coach');

        // @christer remove this
        this.cheatCreateCoach();

        await this.activate();

        this.refresh();

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
            allow: [],
            hasUnreadItems: false
        }], this.$set);

        activeTeams.sort(GameFinderPolicies.sortTeamByDivisionNameLeagueNameTeamName);
        this.me.teams = activeTeams;
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

        this.refresh();

        this.setOpponentsRefreshRequired();

        this.display = 'LFG';
    }

    public async showTeams() {
        this.display = 'TEAMS';
    }

    private refresh() {
        this.refreshOwnTeamSelectionSettings();
        this.refreshOwnTeamsAllowedSettings();
        this.refreshOwnTeamsUnreadSettings();
        this.refreshOpponentVisibility();
        this.refreshOpponentTeamIdsWithOffersFromSelectedOwnTeam();
    }

    private refreshOwnTeamSelectionSettings() {
        let ownTeamSelected = false;

        // Update own team selection
        for (let myTeam of this.me.teams) {
            myTeam.selected = this.selectedOwnTeam && (myTeam.id == this.selectedOwnTeam.id);
            if (myTeam.selected) {
                ownTeamSelected = true;
            }
        }

        // No visible own team selected, so we make sure the state reflects that
        if (! ownTeamSelected) {
            this.selectedOwnTeam = null;
        }
    }

    private refreshOwnTeamsAllowedSettings() {
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
    }

    private refreshOwnTeamsUnreadSettings() {
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

    private refreshOpponentVisibility() {
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

    private refreshOpponentTeamIdsWithOffersFromSelectedOwnTeam() {
        this.opponentTeamIdsWithOffersFromSelectedOwnTeam = [];

        if (! this.selectedOwnTeam) {
            return;
        }

        for (const offer of this.offers) {
            if (offer.external === false && offer.home.id === this.selectedOwnTeam.id) {
                this.opponentTeamIdsWithOffersFromSelectedOwnTeam.push(offer.away.id);
            }
        }
    }

    private updateReadHistoryForSelectedOwnTeam() {
        if (! this.selectedOwnTeam) {
            return;
        }

        this.selectedOwnTeam.hasUnreadItems = false;

        if (! this.readHistory.has(this.selectedOwnTeam.id)) {
            this.readHistory.set(this.selectedOwnTeam.id, []);
        }

        const teamReadHistory = this.readHistory.get(this.selectedOwnTeam.id);
        for (const oppTeamId of this.selectedOwnTeam.allow) {
            if (! teamReadHistory.includes(oppTeamId)) {
                teamReadHistory.push(oppTeamId);
            }
        }
    }

    public selectTeam(team) {
        if (this.selectedOwnTeam && this.selectedOwnTeam.id === team.id) {
            this.deselectTeam();
        } else {
            this.selectedOwnTeam = team;
            this.updateReadHistoryForSelectedOwnTeam();
            this.refresh();
        }
    }

    public deselectTeam() {
        this.selectedOwnTeam = null;

        this.refresh();
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

    public openModalRosterForTeamId(teamId) {
        this.modalSettings.roster.teamId = teamId;
    }

    public openModalRoster() {
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

    // public teamLogo(team: any): number | false {
    //     for (let l of team.raceLogos) {
    //         if (l.size === 32) {
    //             return l.logo;
    //         }
    //     }
    //     return false;
    // }

    public setOpponentsRefreshRequired() {
        this.opponentsRefreshRequired = true;
    }

    public setOpponentsRefreshed() {
        this.opponentsRefreshRequired = false;
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
        'offers': OffersComponent,
        'opponents': OpponentsComponent
    }
});