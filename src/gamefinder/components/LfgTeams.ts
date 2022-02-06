import Vue from 'vue';
import Component from 'vue-class-component';
import { Util } from '../../core/util';
import Axios from 'axios';
import GameFinderPolicies from '../GameFinderPolicies';
import GameFinderHelpers from '../GameFinderHelpers';

@Component({
    template: `
        <div class="basicbox">
            <div class="header">Select Teams</div>
            <div class="content" id="teamswrapper">
                <div class="lfgList">
                    <div v-for="team in teams" :key="team.id" class="lfgteam">
                        <input class="teamcheck" type="checkbox" :value="team.id" v-model="checked" @change="toggleTeam">
                        <img :src="getTeamLogoUrl(team)" />
                        <div>
                            <div class="teamname">{{ abbreviate(team.name, 70) }}</div>
                            <div class="teaminfo"><span title="Seasons and games played">S{{ team.currentSeason }}:G{{ team.gamesPlayedInSeason }}</span> TV{{ team.teamValue/1000 }}k {{ team.race }}</div>
                        </div>
                    </div>
                </div>
                <div class="controls">
                    <div id="selectall">
                        <input type="checkbox" id="all" @change="toggleAll"/>
                        <label for="all">Select All</label>
                    </div>
                    <input type="button" id="showlfg" value="Done" @click="showLfg" />
                </div>
            </div>
        </div>
    `,
    props: {
        coachName: {
            type: String,
            required: true
        }
    }
})
export default class LfgTeamsComponent extends Vue {
    public teams: any[] = [];
    public checked: boolean[] = [];

    async mounted() {
        await this.reloadTeams();
    }

    public async showLfg() {
        await this.updateBlackboxData();
        this.$emit('show-lfg');
    }

    private async reloadTeams() {
        const teams = await this.getTeamsCanLfg();
        teams.sort(GameFinderPolicies.sortTeamByDivisionNameLeagueNameTeamName);
        this.teams = teams;

        this.checked = teams.filter(GameFinderPolicies.teamIsLfg).map((team) => team.id);

        this.updateAllChecked();
    }

    private async getTeamsCanLfg() {
        const result = await Axios.post('/api/coach/teams/' + this.$props.coachName);
        let allTeams = result.data.teams;
        const teams = allTeams.filter(GameFinderPolicies.teamCanLfg);
        return teams;
    }

    private async updateBlackboxData() {
        const teams = await this.getTeamsCanLfg();
        const availableTeams = teams.filter(GameFinderPolicies.teamIsCompetitiveDivision);
        const chosenTeams = availableTeams.filter(GameFinderPolicies.teamIsLfg);

        this.$emit('blackbox-data', {
            available: availableTeams.length,
            chosen: chosenTeams.length
        });
    }

    public toggleAll(event) {
        const checked = event.target.checked;

        if (checked) {
            Axios.post('/api/gamefinder/addallteams', {cheatingCoachName: this.$props.coachName});
        } else {
            Axios.post('/api/gamefinder/removeallteams', {cheatingCoachName: this.$props.coachName});
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

        this.updateAllChecked();
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

    private updateAllChecked()
    {
        const allCheckbox:any = document.getElementById('all');

        let allChecked = this.teams.length === this.checked.length;
        let allUnchecked = this.checked.length === 0;

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

    public abbreviate(stringValue: string, maxCharacters: number) {
        return Util.abbreviate(stringValue, maxCharacters);
    }

    public getTeamLogoUrl(team: any): string {
        return GameFinderHelpers.getTeamLogoUrl(team);
    }
}