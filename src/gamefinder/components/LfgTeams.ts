import Vue from 'vue';
import Component from 'vue-class-component';
import { Util } from '../../core/util';
import Axios from 'axios';
import GameFinderPolicies from '../GameFinderPolicies';

@Component({
    template: `
        <div class="basicbox">
            <div class="header">Select Teams</div>
            <div class="content" id="teamswrapper">
                <div class="lfgList">
                    <div v-for="team in teams" :key="team.id" class="lfgteam">
                        <input class="teamcheck" type="checkbox" :value="team.id" v-model="checked" @change="toggleTeam">
                        <img :src="'https://fumbbl.com/i/' + team.raceLogos[0].logo" />
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
    }
})
export default class LfgTeamsComponent extends Vue {
    private coachName: string | null = null;
    public teams: any[] = [];
    public checked: boolean[] = [];

    async mounted() {
        this.coachName = document.getElementsByClassName('gamefinder')[0].getAttribute('coach');
        await this.reloadTeams();
        this.updateAllChecked();
    }

    public abbreviate(stringValue: string, maxCharacters: number) {
        return Util.abbreviate(stringValue, maxCharacters);
    }

    public showLfg() {
        this.$emit('show-lfg');
    }

    private async reloadTeams() {
        const result = await Axios.post('/api/coach/teams/' + this.coachName);
        let allTeams = result.data.teams;

        const teams = allTeams.filter((team) => team.canLfg == 'Yes' && team.status == 'Active');
        teams.sort(GameFinderPolicies.sortTeamByDivisionNameLeagueNameTeamName);

        this.checked = teams.filter((team) => team.isLfg == 'Yes').map((team) => team.id);
        this.teams = teams;

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
}