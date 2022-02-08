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

@Component({
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
    },
    template: `
        <div class="gamefinder">

            <div class="leftcolumn">
                <blackbox
                    v-if="featureFlags.blackbox"
                    :display-is-active="display === 'LFG'"
                    :available="blackboxData.available"
                    :chosen="blackboxData.chosen"></blackbox>

                <offers :offers="offers" :coach-name="coachName"></offers>
            </div>

            <div class="rightcolumn">
                <div id="overallstatus">
                    {{ coachName }}: You have {{ me.teams.length }} team{{ me.teams.length === 1 ? '' : 's' }} looking for a game.
                    <div class="overalllinks"><a href="#" @click.prevent="showTeams">Choose teams</a> <a href="#" @click.prevent="openModal('SETTINGS', {})">Settings</a></div>
                </div>

                <teamcards v-show="display === 'LFG'" :my-teams="me.teams" @select="selectTeam"></teamcards>

                <!-- We use v-if here because we want the component to be mounted each time display changes and force a reload of team data -->
                <lfgteams v-if="display === 'TEAMS'" :coach-name="coachName" @show-lfg="showLfg" @blackbox-data="handleBlackboxData"></lfgteams>

                <selectedownteam
                    v-show="display === 'LFG'"
                    :team="selectedOwnTeam"
                    @deselect-team="deselectTeam"
                    @open-modal="openModal"></selectedownteam>

                <opponents
                    v-show="display == 'LFG'"
                    :coach-name="coachName"
                    :opponent-map="opponentMap"
                    :opponents-refresh-required="opponentsRefreshRequired"
                    :selected-own-team="selectedOwnTeam"
                    :selected-own-team-offered-team-ids="selectedOwnTeamOfferedTeamIds"
                    @refresh="refresh"
                    @hide-match="handleHideMatch"
                    @hide-coach="handleHideCoach"
                    @opponents-refreshed="setOpponentsRefreshed"
                    @open-modal="openModal"></opponents>
            </div>

            <roster :team="modalRosterTeam" @close-modal="closeModal"></roster>

            <settings
                :is-open="modalSettingsShow"
                :hidden-coaches="hiddenCoaches"
                @unhide-coach="handleUnhideCoach"
                @close-modal="closeModal"></settings>

            <teamsettings :team="modalTeamSettingsTeam" @close-modal="closeModal"></teamsettings>
        </div>
    `
})
export default class GameFinder extends Vue {
    public coachName: string | null = null;
    public display: 'LFG' | 'TEAMS' | 'NONE' = 'LFG';
    public featureFlags = {blackbox: true};

    public selectedOwnTeam:any = null;
    public me:any = { teams: [] };

    public opponentMap: Map<string, any> = new Map<string, any>();
    public opponentsRefreshRequired: boolean = false;
    private readHistory: Map<number, number[]> = new Map<number, number[]>();

    // the offers property is primarily managed by the OffersComponent, they're held here and passed to OffersComponent as a prop
    public offers:any = [];

    public blackboxData: {available: number, chosen: number} = {available: 0, chosen: 0};

    public modalRosterTeam: any | null = null;
    public modalTeamSettingsTeam: any | null = null;
    public modalSettingsShow: boolean = false;

    public hiddenCoaches: {id: number, name: string}[] = [];

    async beforeMount() {
        this.coachName = this.$el.attributes['coach'].value;
        // @christer remove this, just ensuring our user exists in our data store
        await Axios.post('/api/gamefinder/addcheatingcoach', {cheatingCoachName: this.coachName});
    }

    async mounted() {
        await this.activate();

        this.refresh();

        document.addEventListener('click', this.onOuterModalClick)
    }

    public async activate() {
        // @christer cheatingCoachName can be removed from post body
        await Axios.post('/api/gamefinder/activate', {cheatingCoachName: this.coachName})
        // @christer cheatingCoachName can be removed from post body
        const result = await Axios.post('/api/gamefinder/coachteams', {cheatingCoachName: this.coachName});
        const activeTeams = result.data.teams;

        Util.applyDeepDefaults(activeTeams, [{
            selected: false,
            allow: [],
            hasUnreadItems: false,
            hiddenMatches: []
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
        this.refreshMyTeamsHiddenMatchesExpired();
        this.refreshOpponentVisibility();
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
                if (! this.isCoachHidden(opponent.id)) {
                    for (let oppTeam of opponent.teams) {
                        if (GameFinderPolicies.isMatchAllowed(team, oppTeam)) {
                            team.allow.push(oppTeam.id);
                        }
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

    private refreshMyTeamsHiddenMatchesExpired() {
        for (const myTeam of this.me.teams) {
            const unexpiredHiddenMatches = [];

            for (const hiddenMatchDetails of myTeam.hiddenMatches) {
                if (hiddenMatchDetails.hiddenDate > GameFinderPolicies.getHiddenMatchesExpiry()) {
                    unexpiredHiddenMatches.push(hiddenMatchDetails);
                }
            }

            myTeam.hiddenMatches = unexpiredHiddenMatches;
        }
    }

    private refreshOpponentVisibility() {
        this.opponentMap.forEach(opponent => {
            let opponentVisible = true;
            for (const coachDetails of this.hiddenCoaches) {
                if (coachDetails.id === opponent.id) {
                    opponentVisible = false;
                    break;
                }
            }
            opponent.visible = opponentVisible;

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

    // Used by Opponents component to show which teams you've sent offers to.
    get selectedOwnTeamOfferedTeamIds(): number[] {
        const selectedOwnTeamOfferedTeamIds = [];

        if (! this.selectedOwnTeam) {
            return selectedOwnTeamOfferedTeamIds;
        }

        for (const offer of this.offers) {
            if (offer.external === false && offer.home.id === this.selectedOwnTeam.id) {
                selectedOwnTeamOfferedTeamIds.push(offer.away.id);
            }
        }

        return selectedOwnTeamOfferedTeamIds;
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

    public handleBlackboxData(blackboxData: {available: number, chosen: number}) {
        this.blackboxData = blackboxData;
    }

    public handleHideMatch(myTeam: any, opponentTeamId: number): void {
        myTeam.hiddenMatches.push({opponentTeamId: opponentTeamId, hiddenDate: Date.now()});
        this.refreshOwnTeamsAllowedSettings();
        this.refreshOpponentVisibility();
    }

    public handleHideCoach(id: number, name: string): void {
        this.hiddenCoaches.push({id: id, name: name});
        this.refreshOwnTeamsAllowedSettings();
        this.refreshOpponentVisibility();
    }

    public handleUnhideCoach(id: number): void {
        if (! this.isCoachHidden(id)) {
            return;
        }
        this.hiddenCoaches.splice(this.getHiddenCoachIndex(id), 1);
        this.refreshOwnTeamsAllowedSettings();
        this.refreshOpponentVisibility();
    }

    private getHiddenCoachIndex(id: number): number {
        return this.hiddenCoaches.findIndex((coachDetails) => coachDetails.id === id);
    }

    private isCoachHidden(id: number): boolean {
        return this.getHiddenCoachIndex(id) !== -1;
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

    public openModal(modalName: string, modalSettings: any) {
        this.closeModal();
        if (modalName === 'ROSTER') {
            this.modalRosterTeam = modalSettings.team;
        } else if (modalName === 'TEAM_SETTINGS') {
            this.modalTeamSettingsTeam = modalSettings.team;
        } else if (modalName === 'SETTINGS') {
            this.modalSettingsShow = true;
        }
    }

    public closeModal() {
        this.modalRosterTeam = null;
        this.modalTeamSettingsTeam = null;
        this.modalSettingsShow = false;
    }

    public setOpponentsRefreshRequired() {
        this.opponentsRefreshRequired = true;
    }

    public setOpponentsRefreshed() {
        this.opponentsRefreshRequired = false;
    }
}