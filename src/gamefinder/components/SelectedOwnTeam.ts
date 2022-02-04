import Vue from 'vue';
import Component from 'vue-class-component';
import { Util } from '../../core/util';

@Component({
    template: `
        <div id="selectedownteam">
            <template v-if="team">
                <div class="logo">
                    <!-- @christer Absolute url use for icon. Fragile technique for accessing logo. -->
                    <img :src="'https://fumbbl.com/i/' + team.raceLogos[0].logo" />
                </div>
                <div class="teamdetails">
                    <div class="teamname"><a href="#" @click.prevent="openModalRoster">{{ abbreviate(team.name, 65) }}</a></div>
                    <div class="teaminfo"><span title="Seasons and games played">S{{ team.currentSeason }}:G{{ team.gamesPlayedInSeason }}</span> TV {{ team.teamValue/1000 }}k {{ team.race }}</div>
                </div>
                <div class="teamextras">
                    <div class="divisionleagueinfo">{{ team.division }}</div>
                    <div class="teamlinks">
                        <a href="#" @click.prevent="openModalTeamSettings">Settings</a>
                        <a href="#" @click.prevent="deselectTeam">Deselect</a>
                    </div>
                </div>
            </template>
            <template v-else>
                <div>
                    <strong>No team selected.</strong> To make an offer, select one of your teams above and the list of opponents will be filtered to match that team.
                </div>
            </template>
        </div>
    `,
    props: {
        team: {
            validator: function (team) {
                return typeof team === 'object' || team === null;
            }
        }
    }
})
export default class SelectedOwnTeamComponent extends Vue {
    public deselectTeam() {
        this.$emit('deselect-team');
    }

    public openModalRoster() {
        this.$emit('open-modal-roster');
    }

    public openModalTeamSettings() {
        this.$emit('open-modal-team-settings');
    }

    private abbreviate(stringValue: string, maxCharacters: number) {
        return Util.abbreviate(stringValue, maxCharacters);
    }
}