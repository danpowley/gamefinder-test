import Vue from 'vue';
import Component from 'vue-class-component';
import GameFinderPolicies from '../GameFinderPolicies';
import GameFinderHelpers from '../GameFinderHelpers';

@Component({
    template: `
        <div id="teamcards">

            <div v-for="myTeam in myTeams" :key="myTeam.id" @click="select(myTeam)"
                class="teamcard" :class="{active: myTeam.selected}"
                :title="myTeam.name + '\\n' + myTeam.race + '\\n' + myTeam.division + (myTeam.league.name !== undefined ? ' (' + myTeam.league.name + ')' : '')">
                <div class="cardlogo"><img :src="getTeamLogoUrl(myTeam)"></div>
                <div class="cardinfo">
                    <div class="teaminfo">
                        <div class="divisionletter">[{{ myTeam.division.charAt(0) }}{{ myTeam.league.name ? '*' : '' }}]</div>{{
                        myTeam.teamValue/1000 }}k
                    </div>
                    <div class="opponentinfo">
                        Oppo:
                        <div class="allowedopponents" :title="countVisibleOpponents(myTeam) + ' possible opponents'">
                            <span class="newopponentsicon" v-show="myTeam.hasUnreadItems">&#9679</span>{{ countVisibleOpponents(myTeam) }}
                        </div>
                    </div>
                </div>
            </div>

        </div>
    `,
    props: {
        myTeams: {
            type: Array,
            required: true
        }
    }
})
export default class TeamCardsComponent extends Vue {
    public select(team) {
        this.$emit('select', team);
    }

    public getTeamLogoUrl(team: any): string {
        return GameFinderHelpers.getTeamLogoUrl(team);
    }

    public countVisibleOpponents(team: any): number {
        let visibleCount = 0;
        for (const opponentTeamId of team.allow) {
            let isHidden = false;
            for (const hiddenMatchDetails of team.hiddenMatches) {
                if (hiddenMatchDetails.opponentTeamId === opponentTeamId) {
                    isHidden = true;
                }
            }
            if (! isHidden) {
                visibleCount++;
            }
        }

        return visibleCount;
    }
}